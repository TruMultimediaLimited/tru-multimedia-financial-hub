import { supabase } from './supabase.js';

const TRANSACTION_SELECT = `
  id, type, category, total_amount, description, transaction_date,
  concern_id, project_id, client_id, employee_id,
  concerns(id, name),
  clients(id, name),
  employees(id, name, role),
  projects(id, title),
  payments(id, amount, channel, payment_date, note, handled_by_employee_id, handled_by_user_id, handled_by_owner_id, employees(id, name), owners(id, name))
`;

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

export function computeBalances(transaction) {
  const paidAmount = (transaction.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = Number(transaction.total_amount);
  const dueAmount = totalAmount - paidAmount;
  let status = 'pending';
  if (paidAmount >= totalAmount) status = 'paid';
  else if (paidAmount > 0) status = 'partial';
  return { paidAmount, dueAmount, status };
}

export async function fetchTransactions(filters = {}) {
  let query = supabase.from('transactions').select(TRANSACTION_SELECT).order('transaction_date', { ascending: false });

  if (filters.concernId) query = query.eq('concern_id', filters.concernId);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo);

  const { data, error } = await query;
  if (error) throw error;

  let rows = data ?? [];

  if (filters.handledBy) {
    const { kind, id } = filters.handledBy;
    rows = rows.filter((t) =>
      (t.payments ?? []).some((p) =>
        kind === 'employee' ? p.handled_by_employee_id === id : p.handled_by_user_id === id
      )
    );
  }

  return rows;
}

export async function fetchTransaction(id) {
  const { data, error } = await supabase.from('transactions').select(TRANSACTION_SELECT).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createTransaction(payload) {
  const created_by = await currentUserId();
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, created_by })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(id, payload) {
  const { data, error } = await supabase.from('transactions').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function addPayment(payload) {
  const created_by = await currentUserId();
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...payload, created_by })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePayment(id, payload) {
  const { data, error } = await supabase.from('payments').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deletePayment(id) {
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchClients() {
  const { data, error } = await supabase.from('clients').select('id, name').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchProjects(concernId) {
  let query = supabase.from('projects').select('id, title, contract_value').order('title');
  if (concernId) query = query.eq('concern_id', concernId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Sum of income transactions already recorded against a project — used to
// enforce that a project's total income never exceeds its contract value.
export async function fetchProjectIncomeTotal(projectId, excludeTransactionId = null) {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, total_amount')
    .eq('project_id', projectId)
    .eq('type', 'income');
  if (error) throw error;
  return (data ?? [])
    .filter((t) => t.id !== excludeTransactionId)
    .reduce((sum, t) => sum + Number(t.total_amount), 0);
}

// Staff work across every concern day-to-day and are recorded under the
// parent concern (Tru Multimedia Limited), so a filter for one specific
// concern must still include parent-assigned employees, not just exact
// concern_id matches.
async function fetchParentConcernId() {
  const { data } = await supabase.from('concerns').select('id').is('parent_concern_id', null).single();
  return data?.id ?? null;
}

export async function fetchEmployees(concernId) {
  let query = supabase.from('employees').select('id, name, role').order('name');
  if (concernId) {
    const parentId = await fetchParentConcernId();
    const ids = parentId && parentId !== concernId ? [concernId, parentId] : [concernId];
    query = query.in('concern_id', ids);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createClient({ name, phone, email = null, address = null, notes = null, concernIds = [] }) {
  const { data, error } = await supabase.from('clients').insert({ name, phone, email, address, notes }).select().single();
  if (error) throw error;
  if (concernIds.length > 0) {
    const { error: linkError } = await supabase
      .from('client_concerns')
      .insert(concernIds.map((concern_id) => ({ client_id: data.id, concern_id })));
    if (linkError) throw linkError;
  }
  return data;
}

export async function createEmployee({ concern_id, name, role }) {
  const { data, error } = await supabase.from('employees').insert({ concern_id, name, role }).select().single();
  if (error) throw error;
  return data;
}

export { currentUserId };
