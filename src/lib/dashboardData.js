import { supabase } from './supabase.js';

// Lean select for due-list aggregation — deliberately fewer columns than
// ledgerData's TRANSACTION_SELECT (no projects, no payment channel/note),
// since the Dashboard only needs enough to sum due amounts per party.
const DUE_SELECT = `
  id, type, concern_id, client_id, employee_id, total_amount, transaction_date,
  clients(id, name),
  employees(id, name),
  payments(amount)
`;

const CHANNEL_SELECT = `
  amount, channel, payment_date, handled_by_employee_id, handled_by_user_id, handled_by_owner_id,
  employees(id, name),
  owners(id, name),
  transactions(concern_id)
`;

function dueAmount(t) {
  const paid = (t.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  return Number(t.total_amount) - paid;
}

// concern_pl_view already sums total_amount by type per concern in
// Postgres (sql/schema.sql §11) — this just picks/sums the small
// resulting row set (5 rows total), not raw transactions.
export async function fetchConcernPL(concernId) {
  const { data, error } = await supabase
    .from('concern_pl_view')
    .select('concern_id, concern_name, parent_concern_id, total_income, total_expense, net_pl');
  if (error) throw error;
  const rows = data ?? [];

  if (concernId) {
    const row = rows.find((r) => r.concern_id === concernId);
    return row
      ? { totalIncome: Number(row.total_income), totalExpense: Number(row.total_expense), netPl: Number(row.net_pl) }
      : { totalIncome: 0, totalExpense: 0, netPl: 0 };
  }

  // Sum every concern's row, including the parent's own — Tru Multimedia
  // Limited can now hold transactions directly (general/company-wide
  // expenses), so consolidated must include them, not just the 4 concerns.
  return rows.reduce(
    (acc, r) => ({
      totalIncome: acc.totalIncome + Number(r.total_income),
      totalExpense: acc.totalExpense + Number(r.total_expense),
      netPl: acc.netPl + Number(r.net_pl),
    }),
    { totalIncome: 0, totalExpense: 0, netPl: 0 }
  );
}

async function fetchDueRows(type, concernId) {
  let query = supabase.from('transactions').select(DUE_SELECT).eq('type', type);
  if (concernId) query = query.eq('concern_id', concernId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function groupDue(rows, partyRelation) {
  const groups = new Map();
  for (const t of rows) {
    const due = dueAmount(t);
    const party = t[partyRelation];
    if (due <= 0 || !party) continue;
    const existing = groups.get(party.id) ?? {
      id: party.id,
      name: party.name,
      due: 0,
      oldestDate: t.transaction_date,
    };
    existing.due += due;
    if (t.transaction_date < existing.oldestDate) existing.oldestDate = t.transaction_date;
    groups.set(party.id, existing);
  }
  return Array.from(groups.values());
}

// Receivables/payables due totals grouped per client/employee. The sum
// itself (total_amount - sum(payments)) mirrors transaction_balances,
// computed here because that view doesn't carry client_id/employee_id for
// grouping — acceptable at this business's transaction volume per
// docs/architecture.md §7.
export async function fetchDueSummary(concernId) {
  const [incomeRows, expenseRows] = await Promise.all([
    fetchDueRows('income', concernId),
    fetchDueRows('expense', concernId),
  ]);
  return {
    receivables: groupDue(incomeRows, 'clients'),
    payables: groupDue(expenseRows, 'employees'),
  };
}

// Payment totals grouped by channel + handler, for accountability. Row
// count is bounded by total payments recorded (small at this business's
// scale), filtered to the selected concern (and optionally a date range,
// used by the Reports module) before grouping.
export async function fetchChannelBreakdown({ concernId, currentUserId, dateFrom, dateTo } = {}) {
  const { data, error } = await supabase.from('payments').select(CHANNEL_SELECT);
  if (error) throw error;

  let rows = data ?? [];
  if (concernId) rows = rows.filter((p) => p.transactions?.concern_id === concernId);
  if (dateFrom) rows = rows.filter((p) => p.payment_date >= dateFrom);
  if (dateTo) rows = rows.filter((p) => p.payment_date <= dateTo);

  const groups = new Map();
  for (const p of rows) {
    const handlerLabel = p.employees?.name
      ? p.employees.name
      : p.owners?.name
      ? `${p.owners.name} (Owner)`
      : p.handled_by_user_id
      ? p.handled_by_user_id === currentUserId
        ? 'Myself'
        : 'Owner/Partner'
      : 'Unspecified';
    const key = `${p.channel}|${handlerLabel}`;
    const existing = groups.get(key) ?? { channel: p.channel, handler: handlerLabel, total: 0, count: 0 };
    existing.total += Number(p.amount);
    existing.count += 1;
    groups.set(key, existing);
  }

  return Array.from(groups.values()).sort((a, b) => a.channel.localeCompare(b.channel) || b.total - a.total);
}
