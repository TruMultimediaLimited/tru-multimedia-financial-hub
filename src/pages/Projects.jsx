import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { inputClass } from '../components/Field.jsx';
import { formatMoney } from '../lib/format.js';
import { useConcern } from '../context/ConcernContext.jsx';
import { fetchProjectsWithTotals } from '../lib/projectData.js';
import ProjectForm from './projects/ProjectForm.jsx';

const STATUS_BADGE = {
  active: 'bg-income/15 text-income border-income/30',
  completed: 'bg-surfaceRaised text-gray-300 border-gray-700',
  stalled: 'bg-due/15 text-due border-due/30',
};

export default function Projects() {
  const navigate = useNavigate();
  const { concerns } = useConcern();
  const realConcerns = concerns;

  const [concernFilter, setConcernFilter] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProjectsWithTotals({ concernId: concernFilter || null })
      .then((rows) => !cancelled && setProjects(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [concernFilter, reloadKey]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-100">Projects</h1>
        <button onClick={() => setFormOpen(true)} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-900">
          + New project
        </button>
      </div>

      <select className={`${inputClass} mb-4`} value={concernFilter} onChange={(e) => setConcernFilter(e.target.value)}>
        <option value="">All concerns</option>
        {realConcerns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && projects.length === 0 && (
        <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center text-gray-500">No projects yet.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {projects.map((p) => {
          const progress = p.contract_value > 0 ? Math.min(100, (p.totalReceived / p.contract_value) * 100) : 0;
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="border border-gray-800 rounded-lg p-4 cursor-pointer hover:bg-surfaceRaised/60"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="font-medium text-gray-100">{p.title}</div>
                <Badge className={STATUS_BADGE[p.status]}>{p.status}</Badge>
              </div>
              <div className="text-xs text-gray-500 mb-3">
                {p.clients?.name ?? 'No client'} · {p.concerns?.name}
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Contract {formatMoney(p.contract_value)}</span>
                <span className="text-income">Received {formatMoney(p.totalReceived)}</span>
                {p.totalDue > 0 && <span className="text-due">Due {formatMoney(p.totalDue)}</span>}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                Profit <span className={p.profit >= 0 ? 'text-income' : 'text-expense'}>{formatMoney(p.profit)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-surfaceRaised overflow-hidden">
                <div className="h-full bg-income" style={{ width: `${progress}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <ProjectForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
