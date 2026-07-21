import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dropdown from '../components/Dropdown.jsx';
import SearchSelect from '../components/SearchSelect.jsx';
import { formatMoney } from '../lib/format.js';
import { useConcern } from '../context/ConcernContext.jsx';
import { fetchProjectsWithTotals, paymentBucket } from '../lib/projectData.js';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_TABS = [
  { key: 'all', label: 'All' },
  { key: 'complete', label: 'Paid' },
  { key: 'partial', label: 'Partial' },
  { key: 'due', label: 'Due' },
];

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-orange-100 text-orange-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
];

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function avatarColor(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// New projects are added from a client's own page — this page is purely
// for browsing, grouped by client rather than listing every project flatly.
export default function Projects() {
  const navigate = useNavigate();
  const { selectedConcernId } = useConcern();

  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProjectsWithTotals({ concernId: selectedConcernId || null })
      .then((rows) => !cancelled && setProjects(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedConcernId]);

  const matching = projects.filter(
    (p) => (statusFilter === 'all' || p.status === statusFilter) && (paymentFilter === 'all' || paymentBucket(p) === paymentFilter)
  );

  const clientMap = new Map();
  const noClientCount = matching.filter((p) => !p.clients).length;
  for (const p of matching) {
    if (!p.clients) continue;
    const entry = clientMap.get(p.clients.id) ?? { id: p.clients.id, name: p.clients.name, count: 0 };
    entry.count += 1;
    clientMap.set(p.clients.id, entry);
  }
  // Alphabetical list of every client matching the two dropdowns above —
  // powers both the browse list and, once narrowed by typing, the visible
  // cards below.
  const matchedClients = [...clientMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  let clientRows = matchedClients;
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    clientRows = clientRows.filter((c) => c.name.toLowerCase().includes(q));
  }

  const statusOptions = STATUS_TABS.map((t) => ({
    value: t.key,
    label: `${t.label} (${t.key === 'all' ? projects.length : projects.filter((p) => p.status === t.key).length})`,
  }));
  const paymentOptions = PAYMENT_TABS.map((t) => ({
    value: t.key,
    label: `${t.label} (${t.key === 'all' ? projects.length : projects.filter((p) => paymentBucket(p) === t.key).length})`,
  }));

  const outstandingDue = projects.reduce((sum, p) => sum + Number(p.totalDue || 0), 0);
  const stats = [
    { key: 'total', label: 'Total Projects', value: projects.length },
    { key: 'running', label: 'Running', value: projects.filter((p) => p.status === 'running').length },
    { key: 'completed', label: 'Completed', value: projects.filter((p) => p.status === 'completed').length },
    { key: 'due', label: 'Outstanding Due', value: formatMoney(outstandingDue) },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900 mb-0.5">Projects</h1>
      <p className="text-xs text-slate-500 mb-4">Browse by client</p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.map((s) => (
          <div key={s.key} className="bg-surfaceRaised border border-slate-200 rounded-lg shadow-sm px-3 py-2">
            <div className="text-base font-semibold text-slate-900 leading-tight">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-surfaceRaised border border-slate-200 rounded-lg shadow-sm p-3 space-y-2.5 mb-4">
        <div>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Client</span>
          <SearchSelect
            value={search}
            onChange={setSearch}
            options={matchedClients.map((c) => c.name)}
            placeholder="Search clients"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Project status</span>
            <Dropdown value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
          </div>
          <div>
            <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500 mb-1">Payment status</span>
            <Dropdown value={paymentFilter} onChange={setPaymentFilter} options={paymentOptions} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-expense/10 border border-expense/20 text-expense text-sm rounded-lg px-3 py-2 mb-3">{error}</div>
      )}
      {loading && <p className="text-sm text-slate-500 text-center py-6">Loading…</p>}

      {!loading && clientRows.length === 0 && noClientCount === 0 && (
        <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-500 text-sm">
          No clients match these filters.
        </div>
      )}

      <div className="space-y-2">
        {clientRows.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/clients/${c.id}`)}
            className="bg-surfaceRaised border border-slate-200 rounded-lg shadow-sm p-3 cursor-pointer hover:border-slate-300 hover:bg-surface flex items-center gap-3"
          >
            <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${avatarColor(c.id)}`}>
              {initials(c.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-900 font-medium truncate">{c.name}</div>
              <div className="text-xs text-slate-500">
                {c.count} project{c.count !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}
        {noClientCount > 0 && (
          <div className="border border-dashed border-slate-300 rounded-lg p-3 text-xs text-slate-500 text-center">
            {noClientCount} project{noClientCount !== 1 ? 's' : ''} with no client attached.
          </div>
        )}
      </div>
    </div>
  );
}
