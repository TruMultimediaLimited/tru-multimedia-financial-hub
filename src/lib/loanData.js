import { supabase } from './supabase.js';

const LOAN_SELECT = 'id, name, principal_amount, monthly_interest_amount, start_date, term_months, note';

// Names the actual blocking table instead of a generic "linked records"
// message — mirrors employeeData.js's friendlyDeleteError.
function friendlyDeleteError(error) {
  if (!error.message?.includes('foreign key') && error.code !== '23503') return error;
  const table = error.details?.match(/referenced from table "(\w+)"/)?.[1];
  const reasons = {
    payments: 'this loan still has payments drawn against it. Remove or reassign those first.',
  };
  const fallback = table
    ? `this loan still has a linked record in "${table}". Remove that first.`
    : 'this loan has linked payments. Remove those first.';
  return new Error(`Cannot delete: ${reasons[table] ?? fallback}`);
}

async function fetchBalancesMap() {
  const { data, error } = await supabase
    .from('loan_balances')
    .select('loan_id, total_spent, remaining_balance');
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) map.set(row.loan_id, row);
  return map;
}

function mergeLoan(loan, balances) {
  const b = balances.get(loan.id) ?? { total_spent: 0, remaining_balance: Number(loan.principal_amount) };
  return {
    ...loan,
    totalSpent: Number(b.total_spent),
    remainingBalance: Number(b.remaining_balance),
  };
}

// Lean id/name list — for the "Handled by" picker (PaymentForm.jsx) and
// the Ledger filter sheet, mirroring fetchOwners().
export async function fetchLoans() {
  const { data, error } = await supabase.from('loans').select('id, name').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchLoansWithTotals() {
  const [{ data, error }, balances] = await Promise.all([
    supabase.from('loans').select(LOAN_SELECT).order('name'),
    fetchBalancesMap(),
  ]);
  if (error) throw error;
  return (data ?? []).map((l) => mergeLoan(l, balances));
}

export async function fetchLoan(id) {
  const [{ data, error }, balances] = await Promise.all([
    supabase.from('loans').select(LOAN_SELECT).eq('id', id).single(),
    fetchBalancesMap(),
  ]);
  if (error) throw error;
  return mergeLoan(data, balances);
}

export async function createLoan(payload) {
  const { data, error } = await supabase.from('loans').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateLoan(id, payload) {
  const { data, error } = await supabase.from('loans').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteLoan(id) {
  const { error } = await supabase.from('loans').delete().eq('id', id);
  if (error) throw friendlyDeleteError(error);
}

// Expense payments drawn from this loan — the "what was this loan spent
// on" history, sourced straight from the Ledger (payments.handled_by_loan_id)
// rather than a parallel record. Mirrors fetchOwnerPayments().
export async function fetchLoanPayments(loanId) {
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, amount, channel, payment_date, note, transaction_id, transactions(id, type, category, concern_id, concerns(id, name))'
    )
    .eq('handled_by_loan_id', loanId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
