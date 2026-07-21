import { supabase } from './supabase.js';

const PROJECT_SELECT =
  'id, concern_id, client_id, title, category_id, contract_value, status, start_date, end_date, concerns(id, name), clients(id, name), project_categories(id, name)';

// Both transactions and invoices carry a project_id foreign key — name
// the actual blocker instead of always blaming "transactions", which is
// misleading when the real link is an invoice the UI doesn't show here.
function friendlyDeleteError(error) {
  if (!error.message?.includes('foreign key') && error.code !== '23503') return error;
  const table = error.details?.match(/referenced from table "(\w+)"/)?.[1];
  const reasons = {
    invoices: 'this project still has a linked invoice. Remove or reassign that invoice first.',
    transactions: 'this project still has linked transactions. Remove those first.',
  };
  const fallback = table
    ? `this project still has a linked record in "${table}". Remove that first.`
    : 'this project still has linked records. Remove those first.';
  return new Error(`Cannot delete: ${reasons[table] ?? fallback}`);
}

async function fetchBalancesMap() {
  const { data, error } = await supabase
    .from('project_balances')
    .select('project_id, total_received, total_due, total_expense_paid, profit');
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) map.set(row.project_id, row);
  return map;
}

function mergeBalance(project, balances) {
  const b = balances.get(project.id) ?? { total_received: 0, total_due: 0, total_expense_paid: 0, profit: 0 };
  return {
    ...project,
    totalReceived: Number(b.total_received),
    totalDue: Number(b.total_due),
    totalExpensePaid: Number(b.total_expense_paid),
    profit: Number(b.profit),
  };
}

export async function fetchProjectsWithTotals(filters = {}) {
  let query = supabase.from('projects').select(PROJECT_SELECT).order('title');
  if (filters.concernId) query = query.eq('concern_id', filters.concernId);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  const [{ data, error }, balances] = await Promise.all([query, fetchBalancesMap()]);
  if (error) throw error;
  return (data ?? []).map((p) => mergeBalance(p, balances));
}

// Payment-progress bucket for a project merged with totals (fetchProjectsWithTotals/
// fetchProject) — purely about how much of the contract value has been collected,
// separate from the project's own active/completed/stalled status.
export function paymentBucket(p) {
  if (p.totalReceived <= 0) return 'due';
  if (p.totalDue <= 0) return 'complete';
  return 'partial';
}

export async function fetchProject(id) {
  const { data, error } = await supabase.from('projects').select(PROJECT_SELECT).eq('id', id).single();
  if (error) throw error;
  const balances = await fetchBalancesMap();
  return mergeBalance(data, balances);
}

export async function createProject(payload) {
  const { data, error } = await supabase.from('projects').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateProject(id, payload) {
  const { data, error } = await supabase.from('projects').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw friendlyDeleteError(error);
}

// Once a project's total received reaches its contract value, it's
// finished — flip it to completed automatically instead of relying on the
// owner to remember to do it by hand. No-op for projects without a
// contract value set (nothing to reach).
export async function syncProjectCompletion(projectId) {
  if (!projectId) return;
  const { data, error } = await supabase.from('project_balances').select('project_id, contract_value, total_received');
  if (error) throw error;
  const balance = (data ?? []).find((b) => b.project_id === projectId);
  if (!balance) return;
  if (Number(balance.contract_value) > 0 && Number(balance.total_received) >= Number(balance.contract_value)) {
    await supabase.from('projects').update({ status: 'completed' }).eq('id', projectId);
  }
}

export async function fetchProjectsForClient(clientId) {
  const { data, error } = await supabase.from('projects').select('id, title').eq('client_id', clientId).order('title');
  if (error) throw error;
  return data ?? [];
}

// Open-ended, owner-extendable list — new categories get added often
// enough that they shouldn't require a code deploy.
export async function fetchProjectCategories() {
  const { data, error } = await supabase.from('project_categories').select('id, name').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createProjectCategory(name) {
  const { data, error } = await supabase.from('project_categories').insert({ name }).select().single();
  if (error) throw error;
  return data;
}
