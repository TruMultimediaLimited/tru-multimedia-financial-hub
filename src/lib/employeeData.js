import { supabase } from './supabase.js';
import { createTransaction, addPayment, currentUserId } from './ledgerData.js';

const EMPLOYEE_SELECT = 'id, concern_id, name, role, type, monthly_salary, status, concerns(id, name)';

function friendlyDeleteError(error) {
  if (error.message?.includes('foreign key') || error.code === '23503') {
    return new Error('Cannot delete: this employee has linked payments or work logs. Remove those first.');
  }
  return error;
}

// Staff work across every concern and are recorded under the parent
// concern (Tru Multimedia Limited), so filtering by one specific concern
// must still include parent-assigned employees, not just exact matches.
async function fetchParentConcernId() {
  const { data } = await supabase.from('concerns').select('id').is('parent_concern_id', null).single();
  return data?.id ?? null;
}

export async function fetchEmployeesFull(filters = {}) {
  let query = supabase.from('employees').select(EMPLOYEE_SELECT).order('name');
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.concernId) {
    const parentId = await fetchParentConcernId();
    const ids = parentId && parentId !== filters.concernId ? [filters.concernId, parentId] : [filters.concernId];
    query = query.in('concern_id', ids);
  }
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

// Bundles selected unpaid work_logs into one real Ledger expense
// transaction + a matching payment (per docs/architecture.md's payroll
// flow), rather than adding an employee_id column to transactions.
export async function bundleWorkLogsIntoPayroll(employee, workLogs, channel) {
  const totalAmount = workLogs.reduce((sum, log) => sum + Number(log.amount), 0);
  const projectIds = new Set(workLogs.map((log) => log.project_id).filter(Boolean));
  const projectId = projectIds.size === 1 ? [...projectIds][0] : null;

  const transaction = await createTransaction({
    concern_id: employee.concern_id,
    project_id: projectId,
    type: 'expense',
    category: 'Payroll',
    total_amount: totalAmount,
    description: `Payroll — ${employee.name}`,
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  const userId = await currentUserId();
  await addPayment({
    transaction_id: transaction.id,
    amount: totalAmount,
    channel,
    handled_by_user_id: userId,
    payment_date: new Date().toISOString().slice(0, 10),
  });

  await Promise.all(
    workLogs.map((log) => updateWorkLog(log.id, { paid: true, transaction_id: transaction.id }))
  );

  return transaction;
}
