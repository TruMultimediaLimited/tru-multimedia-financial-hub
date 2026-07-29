import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import BackButton from '../components/BackButton.jsx';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS, PROJECT_STATUS_STYLES } from '../lib/format.js';
import { fetchTransactions, computeBalances } from '../lib/ledgerData.js';
import { fetchProject, deleteProject } from '../lib/projectData.js';
import { fetchInvoicesForProject } from '../lib/invoiceData.js';
import ProjectForm from './projects/ProjectForm.jsx';
import TeamMemberForm from './projects/TeamMemberForm.jsx';
import ProjectExpenseForm from './projects/ProjectExpenseForm.jsx';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [txnFilter, setTxnFilter] = useState('all');

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

  // Profit only means something once the money has actually finished
  // moving both ways — the client has paid in full AND every team
  // member's salary on this project is fully paid — not the moment
  // someone flips the status dropdown to "Completed".
  const isProfitReady = project.totalDue <= 0 && project.totalExpenseDue <= 0;

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
  for (const m of team) {
    m.status = m.paid >= m.total ? 'paid' : m.paid > 0 ? 'partial' : 'pending';
  }

  const visibleTransactions = transactions.filter((t) => txnFilter === 'all' || t.type === txnFilter);

  return (
    <div>
      <BackButton />

      <div className={`${ENTITY_COLORS.project.bg} border border-slate-200 border-l-4 ${ENTITY_COLORS.project.border} rounded-2xl shadow-card p-4 mb-4`}>
        <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 break-words">{project.title}</div>
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
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={PROJECT_STATUS_STYLES[project.status]}>{project.status}</Badge>
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 text-slate-700">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-xl text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Client</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
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
          </div>
        </div>

        <div className="mb-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">Team / Expenses</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Total expense</div>
              <div className="text-slate-900">{formatMoney(project.totalExpense)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Paid</div>
              <div className="text-expense">{formatMoney(project.totalExpensePaid)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Due</div>
              <div className={project.totalExpenseDue > 0 ? 'text-due' : 'text-slate-900'}>{formatMoney(project.totalExpenseDue)}</div>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-xs text-slate-500">Profit</div>
          {isProfitReady ? (
            <div className={`text-sm ${project.profit >= 0 ? 'text-income' : 'text-expense'}`}>{formatMoney(project.profit)}</div>
          ) : (
            <div
              className="text-sm text-slate-400"
              title="Profit is calculated once the client has paid in full and every team member's salary on this project is fully paid"
            >
              —
            </div>
          )}
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

      <div className={`${ENTITY_COLORS.employee.bg} border border-slate-200 border-l-4 ${ENTITY_COLORS.employee.border} rounded-2xl shadow-card p-4 mb-6`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-slate-700">Team</h2>
          <button
            onClick={() => setTeamFormOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs bg-primary text-white hover:bg-primaryHover"
          >
            + Add team member
          </button>
        </div>
        {team.length === 0 && <p className="text-sm text-slate-500">No team members added to this project yet.</p>}
        {team.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal">Employee</th>
                  <th className="py-2 pr-3 font-normal text-right">Salary</th>
                  <th className="py-2 pr-3 font-normal text-right">Paid</th>
                  <th className="py-2 pr-3 font-normal text-right">Due</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
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
                    <td className="py-2 pr-3">
                      <Badge className={STATUS_STYLES[m.status]}>{STATUS_LABELS[m.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={() => setExpenseFormOpen(true)}
          className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 text-slate-700 hover:text-slate-900"
        >
          + Other Expense
        </button>
      </div>

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm font-medium text-slate-700">Transactions</h2>
        <div className="flex gap-1">
          <TxnFilterButton active={txnFilter === 'all'} onClick={() => setTxnFilter('all')} label="All" />
          <TxnFilterButton active={txnFilter === 'income'} onClick={() => setTxnFilter('income')} label="Client payments" />
          <TxnFilterButton active={txnFilter === 'expense'} onClick={() => setTxnFilter('expense')} label="Expenses" />
        </div>
      </div>
      {visibleTransactions.length === 0 && (
        <p className="text-sm text-slate-500">
          {transactions.length === 0 ? 'No transactions linked yet.' : 'No transactions match this filter.'}
        </p>
      )}

      {visibleTransactions.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3 font-normal">Date</th>
                <th className="py-2 pr-3 font-normal">Category</th>
                <th className="py-2 pr-3 font-normal">Client / Employee</th>
                <th className="py-2 pr-3 font-normal text-right">Amount</th>
                <th className="py-2 pr-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((t) => {
                const { status } = computeBalances(t);
                const typeClass = t.type === 'income' ? 'text-income' : 'text-expense';
                return (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/ledger/${t.id}`)}
                    className="border-b border-slate-200/60 cursor-pointer hover:bg-surfaceRaised/60"
                  >
                    <td className="py-2.5 pr-3 text-slate-500">{formatDate(t.transaction_date)}</td>
                    <td className="py-2.5 pr-3 text-slate-900">{t.category || 'Uncategorized'}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{t.type === 'income' ? t.clients?.name : t.employees?.name ?? 'General'}</td>
                    <td className={`py-2.5 pr-3 text-right ${typeClass}`}>{formatMoney(t.total_amount)}</td>
                    <td className="py-2.5 pr-3">
                      <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="md:hidden space-y-2">
        {visibleTransactions.map((t) => {
          const { status } = computeBalances(t);
          const typeClass = t.type === 'income' ? 'text-income' : 'text-expense';
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/ledger/${t.id}`)}
              className={`flex items-center justify-between border border-l-4 rounded-xl p-3 cursor-pointer hover:bg-surface ${
                t.type === 'income' ? 'bg-income/5 border-slate-200 border-l-income/50' : 'bg-expense/5 border-slate-200 border-l-expense/50'
              }`}
            >
              <div>
                <div className="text-sm text-slate-900">{t.category || 'Uncategorized'}</div>
                <div className="text-xs text-slate-500">
                  {t.type === 'income' ? t.clients?.name : t.employees?.name ?? 'General'} · {formatDate(t.transaction_date)}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm ${typeClass}`}>{formatMoney(t.total_amount)}</div>
                <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
              </div>
            </div>
          );
        })}
      </div>

      <ProjectForm open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} project={project} />
      <TeamMemberForm
        open={teamFormOpen}
        onClose={() => setTeamFormOpen(false)}
        existingEmployeeIds={team.map((m) => m.id)}
        onSaved={() => setReloadKey((k) => k + 1)}
        project={project}
      />
      <ProjectExpenseForm
        open={expenseFormOpen}
        onClose={() => setExpenseFormOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
        project={project}
      />
    </div>
  );
}

function TxnFilterButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
        active ? 'bg-primary text-white border-primary' : 'bg-surfaceRaised text-slate-600 border-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
