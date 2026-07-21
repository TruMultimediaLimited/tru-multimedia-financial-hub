import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS } from '../lib/format.js';
import { fetchTransactions, computeBalances } from '../lib/ledgerData.js';
import { fetchProject, deleteProject } from '../lib/projectData.js';
import ProjectForm from './projects/ProjectForm.jsx';

const STATUS_BADGE = {
  active: 'bg-income/15 text-income border-income/30',
  completed: 'bg-surfaceRaised text-gray-300 border-gray-700',
  stalled: 'bg-due/15 text-due border-due/30',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchProject(id), fetchTransactions({ projectId: id })])
      .then(([p, txns]) => {
        if (cancelled) return;
        setProject(p);
        setTransactions(txns);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function handleDelete() {
    if (!window.confirm(`Delete ${project.title}?`)) return;
    try {
      await deleteProject(id);
      navigate('/projects');
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error && !project) return <p className="text-sm text-expense">{error}</p>;
  if (!project) return null;

  const progress = project.contract_value > 0 ? Math.min(100, (project.totalReceived / project.contract_value) * 100) : 0;

  return (
    <div>
      <button onClick={() => navigate('/projects')} className="text-xs text-gray-500 mb-3">
        ← Back to Projects
      </button>

      <div className="border border-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-lg font-semibold text-gray-100">{project.title}</div>
            <div className="text-xs text-gray-500">
              {project.clients?.name ?? 'No client'} · {project.concerns?.name}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={STATUS_BADGE[project.status]}>{project.status}</Badge>
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-md text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
          <div>
            <div className="text-xs text-gray-500">Contract value</div>
            <div className="text-gray-100">{formatMoney(project.contract_value)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Received</div>
            <div className="text-income">{formatMoney(project.totalReceived)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Due</div>
            <div className={project.totalDue > 0 ? 'text-due' : 'text-gray-100'}>{formatMoney(project.totalDue)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Expenses paid</div>
            <div className="text-expense">{formatMoney(project.totalExpensePaid)}</div>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-surfaceRaised overflow-hidden">
          <div className="h-full bg-income" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <h2 className="text-sm font-medium text-gray-300 mb-2">Transactions</h2>
      <div className="space-y-2">
        {transactions.length === 0 && <p className="text-sm text-gray-500">No transactions linked yet.</p>}
        {transactions.map((t) => {
          const { status } = computeBalances(t);
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/ledger/${t.id}`)}
              className="flex items-center justify-between border border-gray-800 rounded-lg p-3 cursor-pointer hover:bg-surfaceRaised/60"
            >
              <div>
                <div className="text-sm text-gray-100">{t.category || 'Uncategorized'}</div>
                <div className="text-xs text-gray-500">
                  {t.type === 'income' ? t.clients?.name : t.employees?.name ?? t.vendors?.name ?? 'General'} · {formatDate(t.transaction_date)}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm ${t.type === 'income' ? 'text-income' : 'text-expense'}`}>{formatMoney(t.total_amount)}</div>
                <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
              </div>
            </div>
          );
        })}
      </div>

      <ProjectForm open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} project={project} />
    </div>
  );
}
