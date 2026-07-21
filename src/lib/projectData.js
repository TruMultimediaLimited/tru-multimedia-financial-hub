import { supabase } from './supabase.js';

const PROJECT_SELECT = 'id, concern_id, client_id, title, contract_value, status, start_date, end_date, concerns(id, name), clients(id, name)';

function friendlyDeleteError(error) {
  if (error.message?.includes('foreign key') || error.code === '23503') {
    return new Error('Cannot delete: this project still has linked transactions. Remove those first.');
  }
  return error;
}

async function fetchBalancesMap() {
  const { data, error } = await supabase
    .from('project_balances')
    .select('project_id, total_received, total_due, total_expense_paid');
  if (error) throw error;
  const map = new Map();
  for (const row of data ?? []) map.set(row.project_id, row);
  return map;
}

function mergeBalance(project, balances) {
  const b = balances.get(project.id) ?? { total_received: 0, total_due: 0, total_expense_paid: 0 };
  return {
    ...project,
    totalReceived: Number(b.total_received),
    totalDue: Number(b.total_due),
    totalExpensePaid: Number(b.total_expense_paid),
  };
}

export async function fetchProjectsWithTotals(filters = {}) {
  let query = supabase.from('projects').select(PROJECT_SELECT).order('title');
  if (filters.concernId) query = query.eq('concern_id', filters.concernId);
  const [{ data, error }, balances] = await Promise.all([query, fetchBalancesMap()]);
  if (error) throw error;
  return (data ?? []).map((p) => mergeBalance(p, balances));
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

export async function fetchProjectsForClient(clientId) {
  const { data, error } = await supabase.from('projects').select('id, title').eq('client_id', clientId).order('title');
  if (error) throw error;
  return data ?? [];
}
