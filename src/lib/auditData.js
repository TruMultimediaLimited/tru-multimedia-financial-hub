import { supabase } from './supabase.js';
import { formatMoney, formatDate, CHANNEL_LABELS } from './format.js';

const AUDIT_TABLES = [
  'concerns',
  'clients',
  'employees',
  'owners',
  'owner_investments',
  'loans',
  'opening_dues',
  'opening_due_payments',
  'projects',
  'transactions',
  'payments',
  'invoices',
];

export { AUDIT_TABLES };

const PAGE_SIZE = 100;

// The trigger-based logging in sql/schema.sql (log_audit_event, applied to
// every module's tables) is the only writer of audit_log itself — this
// module only ever reads it, except for restoreAuditRow below, which
// writes back to the *original* table (e.g. clients, transactions), not
// audit_log.
export async function fetchAuditLog({ tableName, userId, dateFrom, dateTo, limit = PAGE_SIZE } = {}) {
  let query = supabase
    .from('audit_log_with_user')
    .select('id, table_name, record_id, action, changed_by, changed_by_email, old_data, new_data, changed_at')
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (tableName) query = query.eq('table_name', tableName);
  if (userId) query = query.eq('changed_by', userId);
  if (dateFrom) query = query.gte('changed_at', dateFrom);
  if (dateTo) query = query.lte('changed_at', `${dateTo}T23:59:59`);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Re-inserts a deleted row from its captured old_data, using the same id
// it had before — this also re-satisfies any foreign keys that were
// pointing at it (e.g. payments still referencing the transaction_id),
// and re-registers a fresh "insert" audit_log entry automatically via the
// existing trigger, with no extra code needed here.
export async function restoreAuditRow(entry) {
  if (entry.action !== 'delete' || !entry.old_data) {
    throw new Error('Only deleted rows can be restored.');
  }
  const { error } = await supabase.from(entry.table_name).insert(entry.old_data);
  if (error) {
    if (error.code === '23503') {
      throw new Error(
        'Cannot restore: this row references another record that no longer exists (e.g. a since-deleted client, project, or transaction). Restore that record first, then try again.'
      );
    }
    if (error.code === '23505') {
      throw new Error('Cannot restore: a record with the same unique value already exists.');
    }
    throw error;
  }
}

// Turns a raw old_data/new_data row into a plain label→value list for the
// Audit Log UI — an ordinary person shouldn't have to read raw JSON
// (uuid foreign keys, unlabeled columns) to understand what changed.
// Purely internal/redundant fields (id, timestamps, who-changed-it — the
// entry itself already shows that) are dropped; foreign keys are resolved
// to a real name via the `lookups` maps built once in AuditLog.jsx.

const HIDDEN_FIELDS = new Set([
  'id',
  'created_at',
  'created_by',
  'auth_user_id',
  'handled_by_user_id',
  'transaction_id',
  'opening_due_id',
]);

const FIELD_LABELS = {
  name: 'Name',
  title: 'Title',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  notes: 'Notes',
  note: 'Note',
  role: 'Role',
  company_share_percent: 'Company Share',
  status: 'Status',
  type: 'Type',
  concern_id: 'Concern',
  parent_concern_id: 'Parent Concern',
  is_active: 'Active',
  display_order: 'Display Order',
  client_id: 'Client',
  employee_id: 'Employee',
  owner_id: 'Owner',
  project_id: 'Project',
  category_id: 'Category',
  category: 'Category',
  contract_value: 'Contract Value',
  start_date: 'Start Date',
  end_date: 'End Date',
  monthly_salary: 'Monthly Salary',
  principal_amount: 'Principal',
  monthly_interest_amount: 'Monthly Interest',
  term_months: 'Term (months)',
  amount: 'Amount',
  total_amount: 'Amount',
  description: 'Description',
  transaction_date: 'Date',
  channel: 'Channel',
  handled_by_employee_id: 'Handled By',
  handled_by_owner_id: 'Handled By',
  handled_by_loan_id: 'Handled By',
  payment_date: 'Date',
  invoice_number: 'Invoice #',
  issued_date: 'Issued Date',
  due_date: 'Due Date',
  party_name: 'Party Name',
  opening_amount: 'Opening Amount',
  investment_date: 'Date',
};

const MONEY_FIELDS = new Set([
  'amount',
  'total_amount',
  'contract_value',
  'principal_amount',
  'monthly_interest_amount',
  'monthly_salary',
  'opening_amount',
]);

const DATE_FIELDS = new Set([
  'start_date',
  'end_date',
  'transaction_date',
  'payment_date',
  'issued_date',
  'due_date',
  'investment_date',
]);

// Every enum-ish value this app writes, across every audited table —
// values not listed here just get Title Cased as a fallback.
const VALUE_LABELS = {
  income: 'Income',
  expense: 'Expense',
  receivable: 'Receivable',
  payable: 'Payable',
  fixed: 'Fixed Salary',
  project_based: 'Project-based',
  remote: 'Remote',
  running: 'Running',
  hold: 'On Hold',
  cancelled: 'Cancelled',
  completed: 'Completed',
  active: 'Active',
  on_leave: 'On Leave',
  inactive: 'Inactive',
};

// Which lookups map (built in AuditLog.jsx) resolves each foreign-key
// field to a human name.
const ID_LOOKUP_TABLE = {
  client_id: 'clients',
  employee_id: 'employees',
  handled_by_employee_id: 'employees',
  owner_id: 'owners',
  handled_by_owner_id: 'owners',
  handled_by_loan_id: 'loans',
  project_id: 'projects',
  concern_id: 'concerns',
  parent_concern_id: 'concerns',
  category_id: 'categories',
};

function humanizeKey(key) {
  return key
    .replace(/_id$/, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function summarizeAuditEntry(row, lookups = {}) {
  if (!row) return [];
  const out = [];
  for (const [key, rawValue] of Object.entries(row)) {
    if (HIDDEN_FIELDS.has(key)) continue;
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;

    const label = FIELD_LABELS[key] ?? humanizeKey(key);
    let value;
    if (MONEY_FIELDS.has(key)) {
      value = formatMoney(rawValue);
    } else if (DATE_FIELDS.has(key)) {
      value = formatDate(rawValue);
    } else if (key === 'company_share_percent') {
      value = `${rawValue}%`;
    } else if (key === 'is_active') {
      value = rawValue ? 'Yes' : 'No';
    } else if (key === 'channel') {
      value = CHANNEL_LABELS[rawValue] ?? rawValue;
    } else if (key === 'type' || key === 'status') {
      value = VALUE_LABELS[rawValue] ?? humanizeKey(String(rawValue));
    } else if (ID_LOOKUP_TABLE[key]) {
      const map = lookups[ID_LOOKUP_TABLE[key]];
      value = map?.get(rawValue) ?? `#${String(rawValue).slice(0, 8)}`;
    } else {
      value = String(rawValue);
    }
    out.push({ key, label, value });
  }
  return out;
}
