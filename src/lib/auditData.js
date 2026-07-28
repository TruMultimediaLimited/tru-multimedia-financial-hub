import { supabase } from './supabase.js';

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
