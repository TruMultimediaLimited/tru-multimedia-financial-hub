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

// The 4 Dashboard headline cards each return { total, rows } — one query
// backs both the summary number and its click-to-expand breakdown, so
// there's never a second round-trip when a card is opened.

// Total value of projects landed — distinct from Total Payment Received
// (booked contract value vs. actual cash collected).
export async function fetchProjectValueBreakdown(concernId) {
  let query = supabase.from('projects').select('id, title, contract_value, concerns(name)');
  if (concernId) query = query.eq('concern_id', concernId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? [])
    .map((p) => ({ id: p.id, title: p.title, concernName: p.concerns?.name, contractValue: Number(p.contract_value) }))
    .sort((a, b) => b.contractValue - a.contractValue);
  return { total: rows.reduce((sum, r) => sum + r.contractValue, 0), rows };
}

// Money actually received, from any source (project, studio rent, edit,
// etc.) — every payment logged against an income transaction, not the
// booked/billed amount. Payment timing is irregular for this business
// (settles months after the fact either way), so this is deliberately
// a flat list of real payments, not a period-bound figure.
export async function fetchPaymentsReceivedBreakdown(concernId) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, payment_date, channel, transaction_id, transactions(type, concern_id, category, clients(name))');
  if (error) throw error;
  let rows = (data ?? []).filter((p) => p.transactions?.type === 'income');
  if (concernId) rows = rows.filter((p) => p.transactions?.concern_id === concernId);
  const mapped = rows
    .map((p) => ({
      id: p.id,
      transactionId: p.transaction_id,
      amount: Number(p.amount),
      date: p.payment_date,
      channel: p.channel,
      source: p.transactions?.clients?.name ?? p.transactions?.category ?? 'Uncategorized',
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return { total: mapped.reduce((sum, r) => sum + r.amount, 0), rows: mapped };
}

// Every expense transaction — rent, salary, equipment, bills, etc.
export async function fetchExpenseBreakdown(concernId) {
  let query = supabase
    .from('transactions')
    .select('id, category, total_amount, transaction_date, concerns(name)')
    .eq('type', 'expense');
  if (concernId) query = query.eq('concern_id', concernId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? [])
    .map((t) => ({
      id: t.id,
      category: t.category || 'Uncategorized',
      amount: Number(t.total_amount),
      date: t.transaction_date,
      concernName: t.concerns?.name,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return { total: rows.reduce((sum, r) => sum + r.amount, 0), rows };
}

// Profit only means something once a project is actually wrapped — this
// business routinely collects/pays out months after the fact, so a
// same-period net figure would be meaningless. Scoped to
// status = 'completed' only.
export async function fetchProjectProfitBreakdown(concernId) {
  let query = supabase.from('projects').select('id, title, status, concerns(name)').eq('status', 'completed');
  if (concernId) query = query.eq('concern_id', concernId);
  const [{ data, error }, { data: balances, error: balError }] = await Promise.all([
    query,
    supabase.from('project_balances').select('project_id, profit'),
  ]);
  if (error) throw error;
  if (balError) throw balError;
  const profitMap = new Map((balances ?? []).map((b) => [b.project_id, Number(b.profit)]));
  const rows = (data ?? [])
    .map((p) => ({ id: p.id, title: p.title, concernName: p.concerns?.name, profit: profitMap.get(p.id) ?? 0 }))
    .sort((a, b) => b.profit - a.profit);
  return { total: rows.reduce((sum, r) => sum + r.profit, 0), rows };
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
