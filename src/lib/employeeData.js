import { supabase } from './supabase.js';

const EMPLOYEE_SELECT = 'id, concern_id, name, role';

function friendlyDeleteError(error) {
  if (error.message?.includes('foreign key') || error.code === '23503') {
    return new Error('Cannot delete: this employee has linked transactions or payments. Remove those first.');
  }
  return error;
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
