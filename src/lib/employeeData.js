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

// Each employee's overall salary/payment status across every expense
// transaction linked to them — 'due' (nothing paid), 'partial', 'paid'
// (fully settled), or 'none' (no salary history at all yet) — so the list
// page can color-code rows without a second lookup per employee.
export async function fetchEmployeesWithTotals() {
  const [{ data: employees, error }, { data: txns, error: txnError }] = await Promise.all([
    supabase.from('employees').select(EMPLOYEE_SELECT).order('name'),
    supabase.from('transactions').select('employee_id, total_amount, payments(amount)').eq('type', 'expense').not('employee_id', 'is', null),
  ]);
  if (error) throw error;
  if (txnError) throw txnError;

  const totals = new Map();
  for (const t of txns ?? []) {
    const paid = (t.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const existing = totals.get(t.employee_id) ?? { total: 0, paid: 0 };
    existing.total += Number(t.total_amount);
    existing.paid += paid;
    totals.set(t.employee_id, existing);
  }

  return (employees ?? []).map((e) => {
    const t = totals.get(e.id) ?? { total: 0, paid: 0 };
    const due = t.total - t.paid;
    const status = t.total === 0 ? 'none' : due <= 0 ? 'paid' : t.paid > 0 ? 'partial' : 'pending';
    return { ...e, totalSalary: t.total, totalPaid: t.paid, totalDue: due, status };
  });
}

// Roles aren't a lookup table — just the distinct values already in use,
// so a role typed for one employee becomes a pickable option for the
// next one without any schema change.
export async function fetchDistinctRoles() {
  const { data, error } = await supabase.from('employees').select('role').not('role', 'is', null);
  if (error) throw error;
  return Array.from(new Set(data.map((row) => row.role).filter(Boolean)));
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
