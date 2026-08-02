import { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import Badge from '../components/Badge.jsx';
import BackButton from '../components/BackButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { inputClass } from '../components/Field.jsx';
import { useConcern } from '../context/ConcernContext.jsx';
import { fetchAuditLog, restoreAuditRow, summarizeAuditEntry, AUDIT_TABLES } from '../lib/auditData.js';
import { fetchFullBackup } from '../lib/backupData.js';
import { downloadJson, downloadXlsx } from '../lib/reportsData.js';
import { fetchClients, fetchEmployees, fetchProjects } from '../lib/ledgerData.js';
import { fetchOwners } from '../lib/ownerData.js';
import { fetchLoans } from '../lib/loanData.js';
import { fetchProjectCategories } from '../lib/projectData.js';

const ACTION_STYLES = {
  insert: 'bg-income/15 text-income border-income/30',
  update: 'bg-due/15 text-due border-due/30',
  delete: 'bg-expense/15 text-expense border-expense/30',
};

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditLog() {
  const { concerns } = useConcern();
  const [tableName, setTableName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(100);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState('');

  // Every "old value"/"new value" panel needs to turn raw foreign-key ids
  // into real names — these lean id→name lookups are fetched once, up
  // front, rather than per-entry.
  const [nameLookups, setNameLookups] = useState({
    clients: new Map(),
    employees: new Map(),
    owners: new Map(),
    loans: new Map(),
    projects: new Map(),
    categories: new Map(),
  });

  useEffect(() => {
    Promise.all([
      fetchClients(null),
      fetchEmployees(null),
      fetchOwners(),
      fetchLoans(),
      fetchProjects(null),
      fetchProjectCategories(),
    ])
      .then(([clients, employees, owners, loans, projects, categories]) => {
        setNameLookups({
          clients: new Map(clients.map((c) => [c.id, c.name])),
          employees: new Map(employees.map((e) => [e.id, e.name])),
          owners: new Map(owners.map((o) => [o.id, o.name])),
          loans: new Map(loans.map((l) => [l.id, l.name])),
          projects: new Map(projects.map((p) => [p.id, p.title])),
          categories: new Map(categories.map((c) => [c.id, c.name])),
        });
      })
      .catch(() => {}); // names are a display nicety — fall back to short ids silently if this fails
  }, []);

  const lookups = useMemo(
    () => ({ ...nameLookups, concerns: new Map(concerns.map((c) => [c.id, c.name])) }),
    [nameLookups, concerns]
  );

  async function handleDownloadBackup() {
    setBackupLoading(true);
    setBackupError('');
    try {
      const backup = await fetchFullBackup();
      downloadJson(`tru-erp-backup-${new Date().toISOString().slice(0, 10)}.json`, backup);
    } catch (e) {
      setBackupError(e.message);
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleDownloadExcel() {
    setBackupLoading(true);
    setBackupError('');
    try {
      const backup = await fetchFullBackup();
      await downloadXlsx(`tru-erp-backup-${new Date().toISOString().slice(0, 10)}.xlsx`, backup);
    } catch (e) {
      setBackupError(e.message);
    } finally {
      setBackupLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAuditLog({ tableName: tableName || null, dateFrom: dateFrom || null, dateTo: dateTo || null, limit })
      .then((rows) => !cancelled && setEntries(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tableName, dateFrom, dateTo, limit]);

  const knownUsers = useMemo(() => {
    const emails = new Set(entries.map((e) => e.changed_by_email).filter(Boolean));
    return Array.from(emails).sort();
  }, [entries]);

  const filtered = entries.filter((e) => {
    if (userEmail && e.changed_by_email !== userEmail) return false;
    if (!search) return true;
    const haystack = `${e.table_name} ${e.action} ${e.changed_by_email ?? ''} ${JSON.stringify(e.old_data ?? {})} ${JSON.stringify(e.new_data ?? {})}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div>
      <BackButton />
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Audit Log</h1>

      <div className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-4 mb-4 text-sm text-slate-600 space-y-1.5">
        <p>Every change is logged below, and deleted rows can be restored instantly (expand a "delete" entry).</p>
        <p>A full snapshot of every table is also taken automatically once a day and kept for 30 days, inside Supabase.</p>
        <p>Tap below anytime to save a full copy to your phone — the only copy that lives outside Supabase.</p>
        <div className="flex gap-2 flex-wrap mt-2">
          <button
            onClick={handleDownloadExcel}
            disabled={backupLoading}
            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
          >
            {backupLoading ? 'Preparing…' : 'Download as Excel'}
          </button>
          <button
            onClick={handleDownloadBackup}
            disabled={backupLoading}
            className="px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-300 text-slate-700 hover:text-slate-900 disabled:opacity-50"
          >
            {backupLoading ? 'Preparing…' : 'Download as JSON'}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Excel is easiest to open and look through yourself; JSON preserves the exact structure, useful if this ever needs
          to be restored back into the database.
        </p>
        {backupError && <p className="text-xs text-expense mt-1">{backupError}</p>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <select className={inputClass} value={tableName} onChange={(e) => setTableName(e.target.value)}>
          <option value="">All modules</option>
          {AUDIT_TABLES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className={inputClass} value={userEmail} onChange={(e) => setUserEmail(e.target.value)}>
          <option value="">All people</option>
          {knownUsers.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
        <input type="date" className={inputClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
        <input type="date" className={inputClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
      </div>

      <input
        placeholder="Search table, action, or field values"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-surfaceRaised border border-slate-300 rounded-xl px-3 py-3 md:py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 mb-4"
      />

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8">
          <EmptyState icon={ClipboardList} message="No entries match." />
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-1">
          {filtered.map((e) => (
            <div key={e.id} className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card">
              <div
                onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-surfaceRaised/60"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={ACTION_STYLES[e.action]}>{e.action}</Badge>
                  <span className="text-sm text-slate-900 truncate">{e.table_name}</span>
                  <span className="text-xs text-slate-500 truncate hidden md:inline">#{e.record_id?.slice(0, 8)}</span>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-500">{e.changed_by_email ?? 'System'}</div>
                  <div className="text-xs text-slate-500">{formatTimestamp(e.changed_at)}</div>
                </div>
              </div>
              {expandedId === e.id && (
                <div className="border-t border-slate-200 p-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Before</div>
                      <FieldList row={e.old_data} lookups={lookups} />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">After</div>
                      <FieldList row={e.new_data} lookups={lookups} />
                    </div>
                  </div>
                  {e.action === 'delete' && <RestoreButton entry={e} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && entries.length >= limit && (
        <button
          onClick={() => setLimit((l) => l + 100)}
          className="w-full mt-3 py-2 rounded-xl text-sm border border-slate-300 text-slate-700"
        >
          Load more
        </button>
      )}
    </div>
  );
}

// Plain label→value rows instead of raw JSON — foreign-key ids are
// already resolved to real names by summarizeAuditEntry.
function FieldList({ row, lookups }) {
  const fields = summarizeAuditEntry(row, lookups);
  if (fields.length === 0) {
    return <p className="text-xs text-slate-400 bg-surface rounded-xl p-2">—</p>;
  }
  return (
    <div className="bg-surface rounded-xl p-2 space-y-1">
      {fields.map((f) => (
        <div key={f.key} className="flex items-start justify-between gap-2 text-xs">
          <span className="text-slate-500 shrink-0">{f.label}</span>
          <span className="text-slate-900 text-right break-words">{f.value}</span>
        </div>
      ))}
    </div>
  );
}

function RestoreButton({ entry }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleRestore() {
    if (!window.confirm(`Restore this row back into "${entry.table_name}"?`)) return;
    setSaving(true);
    setError('');
    try {
      await restoreAuditRow(entry);
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (done) return <p className="text-xs text-income mt-2">Restored.</p>;
  return (
    <div className="mt-2">
      <button
        onClick={handleRestore}
        disabled={saving}
        className="px-3 py-1.5 rounded-xl text-xs bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
      >
        {saving ? 'Restoring…' : 'Restore this'}
      </button>
      {error && <p className="text-xs text-expense mt-1">{error}</p>}
    </div>
  );
}
