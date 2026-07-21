import { supabase } from './supabase.js';

const AUDIT_TABLES = [
  'concerns',
  'clients',
  'employees',
  'owners',
  'owner_investments',
  'projects',
  'transactions',
  'payments',
  'invoices',
];

export { AUDIT_TABLES };

const PAGE_SIZE = 100;

// Read-only: the trigger-based logging in sql/schema.sql (log_audit_event,
// applied to every module's tables) is the only writer of this table.
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
