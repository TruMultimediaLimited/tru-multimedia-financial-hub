import { supabase } from './supabase.js';

const EMPLOYEE_SELECT = 'id, concern_id, name, role, type, monthly_salary, status, concerns(id, name)';

function friendlyDeleteError(error) {
  if (error.message?.includes('foreign key') || error.code === '23503') {
    return new Error('Cannot delete: this employee has linked payments or work logs. Remove those first.');
  }
  return error;
}

export async function fetchEmployeesFull(filters = {}) {
  let query = supabase.from('employees').select(EMPLOYEE_SELECT).order('name');
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.concernId) query = query.eq('concern_id', filters.concernId);
  const { data, error } = await query;
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

const WORK_LOG_SELECT = 'id, employee_id, project_id, task_description, amount, work_date, paid, transaction_id, projects(id, title)';

export async function fetchWorkLogs(employeeId) {
  const { data, error } = await supabase
    .from('work_logs')
    .select(WORK_LOG_SELECT)
    .eq('employee_id', employeeId)
    .order('work_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createWorkLog(payload) {
  const { data, error } = await supabase.from('work_logs').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateWorkLog(id, payload) {
  const { data, error } = await supabase.from('work_logs').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteWorkLog(id) {
  const { error } = await supabase.from('work_logs').delete().eq('id', id);
  if (error) throw error;
}
