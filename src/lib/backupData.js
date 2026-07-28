import { supabase } from './supabase.js';

// Every business table this app writes to — mirrors AUDIT_TABLES in
// auditData.js plus the two join/lookup tables that don't have an audit
// trigger, for a truly complete export.
const BACKUP_TABLES = [
  'concerns',
  'clients',
  'client_concerns',
  'employees',
  'owners',
  'owner_investments',
  'loans',
  'projects',
  'project_categories',
  'transactions',
  'payments',
  'invoices',
  'opening_dues',
  'opening_due_payments',
];

// Raw, unfiltered export for disaster recovery — intentionally bypasses
// every concern filter/date range the rest of the app uses.
export async function fetchFullBackup() {
  const result = { exportedAt: new Date().toISOString(), tables: {} };
  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw new Error(`Failed exporting "${table}": ${error.message}`);
    result.tables[table] = data ?? [];
  }
  return result;
}
