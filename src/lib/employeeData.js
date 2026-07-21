import { supabase } from './supabase.js';

const EMPLOYEE_SELECT = 'id, concern_id, name, role';

// Both transactions (employee_id) and payments (handled_by_employee_id)
// carry a foreign key to employees — name the actual blocker instead of
// always blaming "transactions or payments", which doesn't say which,
// and can't account for other tables (e.g. legacy ones) either.
function friendlyDeleteError(error) {
  if (!error.message?.includes('foreign key') && error.code !== '23503') return error;
  const table = error.details?.match(/referenced from table "(\w+)"/)?.[1];
  const reasons = {
    transactions: 'this employee still has linked transactions. Remove those first.',
    payments: 'this employee still has payments recorded as handled by them. Remove or reassign those first.',
  };
  const fallback = table
    ? `this employee still has a linked record in "${table}". Remove that first.`
    : 'this employee has linked transactions or payments. Remove those first.';
  return new Error(`Cannot delete: ${reasons[table] ?? fallback}`);
}

export async function fetchEmployeesFull() {
  const { data, error } = await supabase.from('employees').select(EMPLOYEE_SELECT).order('name');
  if (error) throw error;
  return data ?? [];
}

export async function fetchEmployee(id) {
  const { data, error } = await supabase.from('employees').select(EMPLOYEE_SELECT).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createEmployee(payload) {
  const { data, error } = await supabase.from('employees').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateEmployee(id, payload) {
  const { data, error } = await supabase.from('employees').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEmployee(id) {
  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) throw friendlyDeleteError(error);
}
