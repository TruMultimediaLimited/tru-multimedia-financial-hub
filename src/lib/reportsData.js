import { supabase } from './supabase.js';

const LEAN_SELECT = 'type, category, total_amount, transaction_date, concern_id, project_id';

async function fetchLeanTransactions({ dateFrom, dateTo, concernId, projectId } = {}) {
  let query = supabase.from('transactions').select(LEAN_SELECT);
  if (concernId) query = query.eq('concern_id', concernId);
  if (projectId) query = query.eq('project_id', projectId);
  if (dateFrom) query = query.gte('transaction_date', dateFrom);
  if (dateTo) query = query.lte('transaction_date', dateTo);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Income vs Expense — totals, grouped by category and by month, from one
// lean (no embeds) filtered query.
export async function fetchIncomeExpenseReport(filters) {
  const rows = await fetchLeanTransactions(filters);

  const byCategory = new Map();
  const byMonth = new Map();
  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of rows) {
    const amount = Number(t.total_amount);
    const cat = t.category || 'Uncategorized';
    const month = t.transaction_date.slice(0, 7);

    const catRow = byCategory.get(cat) ?? { category: cat, income: 0, expense: 0 };
    const monthRow = byMonth.get(month) ?? { month, income: 0, expense: 0 };

    if (t.type === 'income') {
      catRow.income += amount;
      monthRow.income += amount;
      totalIncome += amount;
    } else {
      catRow.expense += amount;
      monthRow.expense += amount;
      totalExpense += amount;
    }
    byCategory.set(cat, catRow);
    byMonth.set(month, monthRow);
  }

  return {
    totals: { income: totalIncome, expense: totalExpense },
    byCategory: Array.from(byCategory.values()).sort((a, b) => b.income + b.expense - (a.income + a.expense)),
    byMonth: Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

function periodKey(dateStr, period) {
  const [y, m] = dateStr.slice(0, 7).split('-');
  if (period === 'year') return y;
  if (period === 'quarter') return `${y} Q${Math.ceil(Number(m) / 3)}`;
  return `${y}-${m}`;
}

// Profit/Loss bucketed by month/quarter/year, for one concern or summed
// across all (consolidated) when concernId is omitted.
export async function fetchPLByPeriod({ dateFrom, dateTo, concernId, period = 'month' }) {
  const rows = await fetchLeanTransactions({ dateFrom, dateTo, concernId });

  const groups = new Map();
  for (const t of rows) {
    const key = periodKey(t.transaction_date, period);
    const g = groups.get(key) ?? { period: key, income: 0, expense: 0 };
    if (t.type === 'income') g.income += Number(t.total_amount);
    else g.expense += Number(t.total_amount);
    groups.set(key, g);
  }

  return Array.from(groups.values())
    .map((g) => ({ ...g, netPl: g.income - g.expense }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

// Total paid per employee, sourced directly from Ledger expense
// transactions carrying employee_id (paid amount via their payments),
// rather than a separate payroll-tracking table.
export async function fetchEmployeeCostReport({ dateFrom, dateTo, concernId } = {}) {
  let query = supabase
    .from('transactions')
    .select('total_amount, transaction_date, concern_id, employees(id, name, role), payments(amount)')
    .eq('type', 'expense')
    .not('employee_id', 'is', null);
  if (concernId) query = query.eq('concern_id', concernId);
  if (dateFrom) query = query.gte('transaction_date', dateFrom);
  if (dateTo) query = query.lte('transaction_date', dateTo);

  const { data, error } = await query;
  if (error) throw error;

  const groups = new Map();
  for (const t of data ?? []) {
    const emp = t.employees;
    if (!emp) continue;
    const paid = (t.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
    const g = groups.get(emp.id) ?? { employeeId: emp.id, name: emp.name, role: emp.role, total: 0 };
    g.total += paid;
    groups.set(emp.id, g);
  }

  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}

export function toCsv(rows, columns) {
  const header = columns.map((c) => c.label).join(',');
  const body = rows
    .map((row) => columns.map((c) => `"${String(c.value(row)).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
