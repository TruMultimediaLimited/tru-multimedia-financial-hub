import { supabase } from './supabase.js';

const TRANSACTION_SELECT = `
  id, type, category, total_amount, description, transaction_date,
  concern_id, project_id, client_id, vendor_id,
  concerns(id, name),
  clients(id, name),
  vendors(id, name),
  projects(id, title),
  payments(id, amount, channel, payment_date, note, handled_by_employee_id, handled_by_user_id, employees(id, name))
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

export async function fetchVendors() {
  const { data, error } = await supabase.from('vendors').select('id, name').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchProjects(concernId) {
  let query = supabase.from('projects').select('id, title').order('title');
  if (concernId) query = query.eq('concern_id', concernId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchEmployees(concernId) {
  let query = supabase.from('employees').select('id, name, role').order('name');
  if (concernId) query = query.eq('concern_id', concernId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createClient({ name, phone }) {
  const { data, error } = await supabase.from('clients').insert({ name, phone }).select().single();
  if (error) throw error;
  return data;
}

export async function createVendor({ name, phone }) {
  const { data, error } = await supabase.from('vendors').insert({ name, phone }).select().single();
  if (error) throw error;
  return data;
}

export async function createEmployee({ concern_id, name, role }) {
  const { data, error } = await supabase.from('employees').insert({ concern_id, name, role }).select().single();
  if (error) throw error;
  return data;
}

export { currentUserId };
