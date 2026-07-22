import { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import Badge from '../components/Badge.jsx';
import BackButton from '../components/BackButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { inputClass } from '../components/Field.jsx';
import { fetchAuditLog, AUDIT_TABLES } from '../lib/auditData.js';

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
      <p className="text-xs text-slate-500 mb-4">
        Read-only. Every entry here is written automatically by database triggers when a record is created, edited, or
        deleted — nothing can be changed or removed from this page.
      </p>

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
        className="w-full bg-surfaceRaised border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-900 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 mb-4"
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
                <div className="border-t border-slate-200 p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Old value</div>
                    <pre className="text-xs text-slate-500 bg-surface rounded-xl p-2 overflow-x-auto whitespace-pre-wrap">
                      {e.old_data ? JSON.stringify(e.old_data, null, 2) : '—'}
                    </pre>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">New value</div>
                    <pre className="text-xs text-slate-500 bg-surface rounded-xl p-2 overflow-x-auto whitespace-pre-wrap">
                      {e.new_data ? JSON.stringify(e.new_data, null, 2) : '—'}
                    </pre>
                  </div>
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
