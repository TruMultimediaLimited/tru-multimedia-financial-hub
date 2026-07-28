import { supabase } from './supabase.js';

// Lean select for due-list aggregation — deliberately fewer columns than
// ledgerData's TRANSACTION_SELECT (no payment channel/note), since the
// Dashboard only needs enough to sum due amounts per party/project.
const DUE_SELECT = `
  id, type, concern_id, client_id, employee_id, project_id, category, total_amount, transaction_date,
  clients(id, name),
  employees(id, name),
  projects(id, title),
  payments(amount)
`;

const CHANNEL_SELECT = `
  amount, channel, payment_date, handled_by_employee_id, handled_by_user_id, handled_by_owner_id, handled_by_loan_id,
  employees(id, name),
  owners(id, name),
  loans(id, name),
  transactions(type, concern_id)
`;

function dueAmount(t) {
  const paid = (t.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  return Number(t.total_amount) - paid;
}

// The 4 Dashboard headline cards each return { total, rows } — one query
// backs both the summary number and its click-to-expand breakdown, so
// there's never a second round-trip when a card is opened.

// Total value of projects landed — distinct from Total Payment Received
// (booked contract value vs. actual cash collected). When a month range is
// given (Dashboard's month toggle), scoped to projects that started that
// month — Due tracking itself stays perpetual, only this summary figure
// is month-bound.
export async function fetchProjectValueBreakdown(concernId, { dateFrom, dateTo } = {}) {
  let query = supabase.from('projects').select('id, title, contract_value, start_date, created_at, concerns(name)');
  if (concernId) query = query.eq('concern_id', concernId);
  const { data, error } = await query;
  if (error) throw error;
  let filtered = data ?? [];
  if (dateFrom || dateTo) {
    // Fall back to created_at when start_date was left blank, so a project
    // never silently disappears from a month's figure just because that
    // optional field wasn't filled in.
    filtered = filtered.filter((p) => {
      const d = (p.start_date || p.created_at || '').slice(0, 10);
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }
  const rows = filtered
    .map((p) => ({ id: p.id, title: p.title, concernName: p.concerns?.name, contractValue: Number(p.contract_value) }))
    .sort((a, b) => b.contractValue - a.contractValue);
  return { total: rows.reduce((sum, r) => sum + r.contractValue, 0), rows };
}

// Money actually received, from any source (project, studio rent, edit,
// etc.) — every payment logged against an income transaction, not the
// booked/billed amount. Payment timing is irregular for this business
// (settles months after the fact either way), so this is deliberately
// a flat list of real payments, not a period-bound figure.
export async function fetchPaymentsReceivedBreakdown(concernId, { dateFrom, dateTo } = {}) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, payment_date, channel, transaction_id, transactions(type, concern_id, category, clients(name))');
  if (error) throw error;
  let rows = (data ?? []).filter((p) => p.transactions?.type === 'income');
  if (concernId) rows = rows.filter((p) => p.transactions?.concern_id === concernId);
  if (dateFrom) rows = rows.filter((p) => p.payment_date >= dateFrom);
  if (dateTo) rows = rows.filter((p) => p.payment_date <= dateTo);
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
export async function fetchExpenseBreakdown(concernId, { dateFrom, dateTo } = {}) {
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, amount, payment_date, channel, transaction_id, transactions(type, concern_id, category, project_id, projects(title), concerns(name))'
    );
  if (error) throw error;
  let rows = (data ?? []).filter((p) => p.transactions?.type === 'expense');
  if (concernId) rows = rows.filter((p) => p.transactions?.concern_id === concernId);
  if (dateFrom) rows = rows.filter((p) => p.payment_date >= dateFrom);
  if (dateTo) rows = rows.filter((p) => p.payment_date <= dateTo);
  const mapped = rows
    .map((p) => ({
      id: p.id,
      transactionId: p.transaction_id,
      amount: Number(p.amount),
      date: p.payment_date,
      channel: p.channel,
      category: p.transactions?.category || 'Uncategorized',
      concernName: p.transactions?.concerns?.name,
      projectId: p.transactions?.project_id ?? null,
      projectTitle: p.transactions?.projects?.title ?? null,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return { total: mapped.reduce((sum, r) => sum + r.amount, 0), rows: mapped };
}

// Profit only means something once the money has actually finished moving
// both ways — the client has paid in full AND every team member's salary
// on that project is fully paid — not the moment someone flips the status
// dropdown to "Completed" (mirrors the same gate on ProjectDetail). When a
// month range is given, a project's profit counts toward the month it was
// actually settled in — the date of its last payment (either side) — not
// the month the project started.
export async function fetchProjectProfitBreakdown(concernId, { dateFrom, dateTo } = {}) {
  let query = supabase.from('projects').select('id, title, concerns(name)');
  if (concernId) query = query.eq('concern_id', concernId);
  const [{ data, error }, { data: balances, error: balError }, { data: txns, error: txnError }] = await Promise.all([
    query,
    supabase.from('project_balances').select('project_id, total_due, total_expense_due, profit'),
    supabase.from('transactions').select('project_id, payments(payment_date)').not('project_id', 'is', null),
  ]);
  if (error) throw error;
  if (balError) throw balError;
  if (txnError) throw txnError;

  const balanceMap = new Map((balances ?? []).map((b) => [b.project_id, b]));
  const settledDateByProject = new Map();
  for (const t of txns ?? []) {
    for (const p of t.payments ?? []) {
      const cur = settledDateByProject.get(t.project_id);
      if (!cur || p.payment_date > cur) settledDateByProject.set(t.project_id, p.payment_date);
    }
  }

  const rows = (data ?? [])
    .map((p) => {
      const b = balanceMap.get(p.id);
      if (!b || Number(b.total_due) > 0 || Number(b.total_expense_due) > 0) return null;
      const settledDate = settledDateByProject.get(p.id);
      if (dateFrom && (!settledDate || settledDate < dateFrom)) return null;
      if (dateTo && (!settledDate || settledDate > dateTo)) return null;
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
    if (due <= 0) continue;
    const key = t.project_id ?? 'other';
    let g = groups.get(key);
    if (!g) {
      g = { id: key, name: t.projects?.title ?? 'Other / General', due: 0, oldestDate: t.transaction_date, breakdown: new Map() };
      groups.set(key, g);
    }
    g.due += due;
    if (t.transaction_date < g.oldestDate) g.oldestDate = t.transaction_date;
    // Not every due expense has an employee attached (e.g. office rent) —
    // those still need to surface here, grouped by category instead, with
    // no employee to link through to (see breakdownClick in Dashboard.jsx).
    const breakdownKey = t.employees ? `emp:${t.employees.id}` : `cat:${t.category || 'Uncategorized'}`;
    const existing = g.breakdown.get(breakdownKey) ?? {
      id: breakdownKey,
      employeeId: t.employees ? t.employees.id : null,
      label: t.employees ? t.employees.name : t.category || 'Uncategorized',
      due: 0,
    };
    existing.due += due;
    g.breakdown.set(breakdownKey, existing);
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

  // Grouped by channel + handler + type — income and expense payments on
  // the same channel/handler must never merge into one figure, since
  // there'd be no way to tell whether that total is money in or money out.
  const groups = new Map();
  for (const p of rows) {
    const handlerLabel = p.employees?.name
      ? p.employees.name
      : p.owners?.name
      ? `${p.owners.name} (Owner)`
      : p.loans?.name
      ? `${p.loans.name} (Loan)`
      : p.handled_by_user_id
      ? p.handled_by_user_id === currentUserId
        ? 'Myself'
        : 'Owner/Partner'
      : 'Unspecified';
    const type = p.transactions?.type ?? 'expense';
    const key = `${p.channel}|${handlerLabel}|${type}`;
    const existing = groups.get(key) ?? { channel: p.channel, handler: handlerLabel, type, total: 0 };
    existing.total += Number(p.amount);
    groups.set(key, existing);
  }

  return Array.from(groups.values()).sort((a, b) => a.channel.localeCompare(b.channel) || b.total - a.total);
}
