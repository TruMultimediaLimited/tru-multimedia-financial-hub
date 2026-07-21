import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS, CHANNEL_LABELS, PROJECT_STATUS_STYLES } from '../lib/format.js';
import { fetchTransactions, computeBalances } from '../lib/ledgerData.js';
import { fetchProject, deleteProject } from '../lib/projectData.js';
import { fetchInvoicesForProject } from '../lib/invoiceData.js';
import ProjectForm from './projects/ProjectForm.jsx';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchProject(id), fetchTransactions({ projectId: id }), fetchInvoicesForProject(id)])
      .then(([p, txns, invs]) => {
        if (cancelled) return;
        setProject(p);
        setTransactions(txns);
        setInvoices(invs);
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

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error && !project) return <p className="text-sm text-expense">{error}</p>;
  if (!project) return null;

  const progress = project.contract_value > 0 ? Math.min(100, (project.totalReceived / project.contract_value) * 100) : 0;

  // "Who worked on this project" is derived straight from the Ledger — an
  // employee shows up here the moment an expense transaction links both
  // this project and that employee, no separate assignment step needed.
  const team = [];
  const teamById = new Map();
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.employees) continue;
    const { paidAmount, dueAmount } = computeBalances(t);
    const existing = teamById.get(t.employees.id) ?? { id: t.employees.id, name: t.employees.name, total: 0, paid: 0, due: 0 };
    existing.total += Number(t.total_amount);
    existing.paid += paidAmount;
    existing.due += dueAmount;
    teamById.set(t.employees.id, existing);
    if (!team.includes(existing)) team.push(existing);
  }

  const clientPayments = transactions
    .filter((t) => t.type === 'income')
    .flatMap((t) => (t.payments ?? []).map((p) => ({ ...p, category: t.category })))
    .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1));

  return (
    <div>
      <button onClick={() => navigate('/projects')} className="text-xs text-slate-500 mb-3">
        ← Back to Projects
      </button>

      <div className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-2xl font-bold text-slate-900">{project.title}</div>
            <div className="text-xs text-slate-500">
              {project.clients ? (
                <button onClick={() => navigate(`/clients/${project.clients.id}`)} className="text-slate-700 underline underline-offset-2">
                  {project.clients.name}
                </button>
              ) : (
                'No client'
              )}{' '}
              · {project.concerns?.name}
              {project.project_categories?.name && ` · ${project.project_categories.name}`}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={PROJECT_STATUS_STYLES[project.status]}>{project.status}</Badge>
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 text-slate-700">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-xl text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mb-3">
          <div>
            <div className="text-xs text-slate-500">Contract value</div>
            <div className="text-slate-900">{formatMoney(project.contract_value)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Received</div>
            <div className="text-income">{formatMoney(project.totalReceived)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Due</div>
            <div className={project.totalDue > 0 ? 'text-due' : 'text-slate-900'}>{formatMoney(project.totalDue)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Expenses paid</div>
            <div className="text-expense">{formatMoney(project.totalExpensePaid)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Profit</div>
            <div className={project.profit >= 0 ? 'text-income' : 'text-expense'}>{formatMoney(project.profit)}</div>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-surfaceRaised overflow-hidden">
          <div className="h-full bg-income" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      {invoices.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-slate-700 mb-2">Invoices</h2>
          <div className="space-y-2 mb-6">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="flex items-center justify-between border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-surfaceRaised/60"
              >
                <div className="text-sm text-slate-900">{inv.invoice_number}</div>
                <div className="text-xs text-slate-500">{formatDate(inv.issued_date)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="text-sm font-medium text-slate-700 mb-2">Team</h2>
      {team.length === 0 && <p className="text-sm text-slate-500 mb-4">No employee expenses linked to this project yet.</p>}
      {team.length > 0 && (
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-normal">Employee</th>
                <th className="py-2 pr-3 font-normal text-right">Total</th>
                <th className="py-2 pr-3 font-normal text-right">Paid</th>
                <th className="py-2 pr-3 font-normal text-right">Due</th>
              </tr>
            </thead>
            <tbody>
              {team.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => navigate(`/employees/${m.id}`)}
                  className="border-b border-slate-200/60 cursor-pointer hover:bg-surfaceRaised/60"
                >
                  <td className="py-2 pr-3 text-slate-900">{m.name}</td>
                  <td className="py-2 pr-3 text-right text-slate-700">{formatMoney(m.total)}</td>
                  <td className="py-2 pr-3 text-right text-slate-700">{formatMoney(m.paid)}</td>
                  <td className="py-2 pr-3 text-right">{m.due > 0 ? <span className="text-due">{formatMoney(m.due)}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-sm font-medium text-slate-700 mb-2">Client payments</h2>
      {clientPayments.length === 0 && <p className="text-sm text-slate-500 mb-4">No client payments recorded yet.</p>}
      {clientPayments.length > 0 && (
        <div className="space-y-2 mb-6">
          {clientPayments.map((p) => (
            <div key={p.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
              <div>
                <div className="text-sm text-slate-900">{formatMoney(p.amount)}</div>
                <div className="text-xs text-slate-500">
                  {formatDate(p.payment_date)} · via {CHANNEL_LABELS[p.channel]}
                  {p.category && ` · ${p.category}`}
                  {p.note && ` · ${p.note}`}
                </div>
              </div>
            </div>
          ))}
          <div className="text-xs text-slate-500 text-right">
            Received {formatMoney(project.totalReceived)}
            {project.totalDue > 0 && <span className="text-due"> · {formatMoney(project.totalDue)} remaining</span>}
          </div>
        </div>
      )}

      <h2 className="text-sm font-medium text-slate-700 mb-2">Transactions</h2>
      <div className="space-y-2">
        {transactions.length === 0 && <p className="text-sm text-slate-500">No transactions linked yet.</p>}
        {transactions.map((t) => {
          const { status } = computeBalances(t);
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/ledger/${t.id}`)}
              className="flex items-center justify-between border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-surfaceRaised/60"
            >
              <div>
                <div className="text-sm text-slate-900">{t.category || 'Uncategorized'}</div>
                <div className="text-xs text-slate-500">
                  {t.type === 'income' ? t.clients?.name : t.employees?.name ?? 'General'} · {formatDate(t.transaction_date)}
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
