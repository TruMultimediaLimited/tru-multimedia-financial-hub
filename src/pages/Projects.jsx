import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inputClass } from '../components/Field.jsx';
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

// New projects are added from a client's own page — this page is purely
// for browsing, grouped by client rather than listing every project flatly.
export default function Projects() {
  const navigate = useNavigate();
  const { selectedConcernId } = useConcern();

  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('due');
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
  // powers both the datalist (browse) and, once narrowed by typing, the
  // visible cards below.
  const matchedClients = [...clientMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  let clientRows = matchedClients;
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    clientRows = clientRows.filter((c) => c.name.toLowerCase().includes(q));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Projects</h1>
      </div>

      <select className={`${inputClass} mb-3`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        {STATUS_TABS.map((t) => {
          const count = t.key === 'all' ? projects.length : projects.filter((p) => p.status === t.key).length;
          return (
            <option key={t.key} value={t.key}>
              {t.label} ({count})
            </option>
          );
        })}
      </select>

      <input
        list="project-client-options"
        placeholder="Search clients"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${inputClass} mb-3`}
      />
      <datalist id="project-client-options">
        {matchedClients.map((c) => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>

      <select className={`${inputClass} mb-4`} value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
        {PAYMENT_TABS.map((t) => {
          const count = t.key === 'all' ? projects.length : projects.filter((p) => paymentBucket(p) === t.key).length;
          return (
            <option key={t.key} value={t.key}>
              {t.label} ({count})
            </option>
          );
        })}
      </select>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && clientRows.length === 0 && noClientCount === 0 && (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
          No clients match these filters.
        </div>
      )}

      <div className="space-y-2">
        {clientRows.map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/clients/${c.id}`)}
            className="bg-surfaceRaised border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-surface flex items-center justify-between"
          >
            <span className="text-gray-900 font-medium">{c.name}</span>
            <span className="text-xs text-gray-500">
              {c.count} project{c.count !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
        {noClientCount > 0 && (
          <div className="border border-dashed border-gray-300 rounded-lg p-3 text-xs text-gray-500">
            {noClientCount} project{noClientCount !== 1 ? 's' : ''} with no client attached.
          </div>
        )}
      </div>
    </div>
  );
}
