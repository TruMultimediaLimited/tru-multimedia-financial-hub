import { supabase } from './supabase.js';

// Lean select for due-list aggregation — deliberately fewer columns than
// ledgerData's TRANSACTION_SELECT (no payment channel/note), since the
// Dashboard only needs enough to sum due amounts per party/project.
const DUE_SELECT = `
  id, type, concern_id, client_id, employee_id, project_id, total_amount, transaction_date,
  clients(id, name),
  employees(id, name),
  projects(id, title),
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

// Money actually paid out — every payment logged against an expense
// transaction, not the committed/billed total_amount. Mirrors
// fetchPaymentsReceivedBreakdown and the same cash-basis principle
// Project Profit already follows: a salary/bill only counts here once it's
// actually been paid, same as profit only counts once a project is
// actually wrapped — not the moment it's merely committed to.
export async function fetchExpenseBreakdown(concernId) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, payment_date, channel, transaction_id, transactions(type, concern_id, category, concerns(name))');
  if (error) throw error;
  let rows = (data ?? []).filter((p) => p.transactions?.type === 'expense');
  if (concernId) rows = rows.filter((p) => p.transactions?.concern_id === concernId);
  const mapped = rows
    .map((p) => ({
      id: p.id,
      transactionId: p.transaction_id,
      amount: Number(p.amount),
      date: p.payment_date,
      channel: p.channel,
      category: p.transactions?.category || 'Uncategorized',
      concernName: p.transactions?.concerns?.name,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return { total: mapped.reduce((sum, r) => sum + r.amount, 0), rows: mapped };
}

// Profit only means something once the money has actually finished moving
// both ways — the client has paid in full AND every team member's salary
// on that project is fully paid — not the moment someone flips the status
// dropdown to "Completed" (mirrors the same gate on ProjectDetail).
export async function fetchProjectProfitBreakdown(concernId) {
  let query = supabase.from('projects').select('id, title, concerns(name)');
  if (concernId) query = query.eq('concern_id', concernId);
  const [{ data, error }, { data: balances, error: balError }] = await Promise.all([
    query,
    supabase.from('project_balances').select('project_id, total_due, total_expense_due, profit'),
  ]);
  if (error) throw error;
  if (balError) throw balError;
  const balanceMap = new Map((balances ?? []).map((b) => [b.project_id, b]));
  const rows = (data ?? [])
    .map((p) => {
      const b = balanceMap.get(p.id);
      if (!b || Number(b.total_due) > 0 || Number(b.total_expense_due) > 0) return null;
      return { id: p.id, title: p.title, concernName: p.concerns?.name, profit: Number(b.profit) };
    })
    .filter(Boolean)
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

// Receivable is grouped per client, one summary row each, with a
// click-to-expand breakdown underneath — never one row per transaction,
// which gets congested fast. A client's due is mostly their projects'
// committed contract value minus what's been received (project_balances,
// same figure ProjectDetail shows), not the sum of income-transaction
// dues — a project can carry a due before any income transaction has even
// been logged against it yet. Ad-hoc income (no project_id) still counts
// via its own transaction-level due, since it has no contract to draw from.
async function fetchReceivables(concernId) {
  let projectQuery = supabase.from('projects').select('id, title, start_date, client_id, clients(id, name)');
  if (concernId) projectQuery = projectQuery.eq('concern_id', concernId);
  const [{ data: projects, error: projError }, { data: balances, error: balError }, incomeRows] = await Promise.all([
    projectQuery,
    supabase.from('project_balances').select('project_id, total_due'),
    fetchDueRows('income', concernId),
  ]);
  if (projError) throw projError;
  if (balError) throw balError;

  const dueByProject = new Map((balances ?? []).map((b) => [b.project_id, Number(b.total_due)]));
  const groups = new Map();
  function group(client) {
    let g = groups.get(client.id);
    if (!g) {
      g = { id: client.id, name: client.name, due: 0, oldestDate: null, breakdown: [] };
      groups.set(client.id, g);
    }
    return g;
  }
  function bumpOldest(g, date) {
    if (date && (!g.oldestDate || date < g.oldestDate)) g.oldestDate = date;
  }

  for (const pr of projects ?? []) {
    const due = dueByProject.get(pr.id) ?? 0;
    if (due <= 0 || !pr.clients) continue;
    const g = group(pr.clients);
    g.due += due;
    g.breakdown.push({ type: 'project', id: pr.id, label: pr.title, due });
    bumpOldest(g, pr.start_date);
  }
  for (const t of incomeRows) {
    if (t.project_id) continue; // already represented via that project's contract due above
    const due = dueAmount(t);
    if (due <= 0 || !t.clients) continue;
    const g = group(t.clients);
    g.due += due;
    g.breakdown.push({ type: 'transaction', id: t.id, label: t.category || 'Uncategorized', due });
    bumpOldest(g, t.transaction_date);
  }
  return Array.from(groups.values());
}

// Payable is grouped per project (falls back to a single "Other / General"
// bucket for expenses not linked to any project), with a click-to-expand
// breakdown of which employee is owed how much within that project — the
// "who gets paid from this job" view, rather than one row per employee
// across every job at once.
async function fetchPayables(concernId) {
  const expenseRows = await fetchDueRows('expense', concernId);
  const groups = new Map();
  for (const t of expenseRows) {
    const due = dueAmount(t);
    if (due <= 0 || !t.employees) continue;
    const key = t.project_id ?? 'other';
    let g = groups.get(key);
    if (!g) {
      g = { id: key, name: t.projects?.title ?? 'Other / General', due: 0, oldestDate: t.transaction_date, breakdown: new Map() };
      groups.set(key, g);
    }
    g.due += due;
    if (t.transaction_date < g.oldestDate) g.oldestDate = t.transaction_date;
    const existing = g.breakdown.get(t.employees.id) ?? { id: t.employees.id, label: t.employees.name, due: 0 };
    existing.due += due;
    g.breakdown.set(t.employees.id, existing);
  }
  return Array.from(groups.values()).map((g) => ({ ...g, breakdown: Array.from(g.breakdown.values()) }));
}

export async function fetchDueSummary(concernId) {
  const [receivables, payables] = await Promise.all([fetchReceivables(concernId), fetchPayables(concernId)]);
  return { receivables, payables };
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
