import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import BackButton from '../components/BackButton.jsx';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS, PROJECT_STATUS_STYLES, PAYMENT_BUCKET_STYLES, PAYMENT_BUCKET_LABELS } from '../lib/format.js';
import { fetchTransactions, computeBalances } from '../lib/ledgerData.js';
import { fetchClient, deleteClient } from '../lib/partyData.js';
import { fetchInvoicesForClient } from '../lib/invoiceData.js';
import { fetchProjectsWithTotals, paymentBucket } from '../lib/projectData.js';
import PartyForm from './parties/PartyForm.jsx';
import ProjectForm from './projects/ProjectForm.jsx';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchClient(id),
      fetchTransactions({ clientId: id }),
      fetchInvoicesForClient(id),
      fetchProjectsWithTotals({ clientId: id }),
    ])
      .then(([c, txns, invs, projs]) => {
        if (cancelled) return;
        setClient(c);
        setTransactions(txns);
        setInvoices(invs);
        setProjects(projs);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function handleDelete() {
    if (!window.confirm(`Delete ${client.name}?`)) return;
    try {
      await deleteClient(id);
      navigate('/clients');
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error && !client) return <p className="text-sm text-expense">{error}</p>;
  if (!client) return null;

  const totalBilled = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
  const totalPaid = transactions.reduce((s, t) => s + computeBalances(t).paidAmount, 0);
  const totalDue = totalBilled - totalPaid;

  return (
    <div>
      <BackButton />

      <div className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-2xl font-bold text-slate-900">{client.name}</div>
            <div className="text-xs text-slate-500">
              {[client.phone, client.email, client.address].filter(Boolean).join(' · ') || 'No contact info'}
            </div>
            {client.concerns?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {client.concerns.map((c) => (
                  <Badge key={c.id} className="bg-surfaceRaised text-slate-700 border-slate-300">
                    {c.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 text-slate-700">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-xl text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        {client.notes && <p className="text-sm text-slate-500 mb-3">{client.notes}</p>}

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Billed</div>
            <div className="text-slate-900">{formatMoney(totalBilled)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Paid</div>
            <div className="text-slate-900">{formatMoney(totalPaid)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Due</div>
            <div className={totalDue > 0 ? 'text-due' : 'text-slate-900'}>{formatMoney(totalDue)}</div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-slate-700">Projects</h2>
        <button
          onClick={() => setProjectFormOpen(true)}
          className="px-2.5 py-1 rounded-xl text-xs border border-slate-300 text-slate-700"
        >
          + New project
        </button>
      </div>

      {projects.length === 0 && <p className="text-sm text-slate-500 mb-4">No projects yet.</p>}

      {projects.length > 0 && (
        <>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mb-2">
            <span>{projects.length} total</span>
            <span>{projects.filter((p) => p.status === 'completed').length} completed</span>
            <span>{projects.filter((p) => paymentBucket(p) === 'complete').length} paid</span>
            <span>{projects.filter((p) => paymentBucket(p) !== 'complete').length} due</span>
          </div>
          <div className="space-y-2 mb-4">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="flex items-center justify-between border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-surfaceRaised/60"
              >
                <div>
                  <div className="text-sm text-slate-900">{p.title}</div>
                  <div className="text-xs text-slate-500">{p.concerns?.name}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge className={PROJECT_STATUS_STYLES[p.status]}>{p.status}</Badge>
                  <Badge className={PAYMENT_BUCKET_STYLES[paymentBucket(p)]}>{PAYMENT_BUCKET_LABELS[paymentBucket(p)]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {invoices.length > 0 && (
        <>
          <h2 className="text-sm font-medium text-slate-700 mb-2">Invoices</h2>
          <div className="space-y-2 mb-4">
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

      <h2 className="text-sm font-medium text-slate-700 mb-2">Transaction history</h2>
      {transactions.length === 0 && <p className="text-sm text-slate-500">No transactions yet.</p>}
      <div className="space-y-2">
        {transactions.map((t) => {
          const { paidAmount, dueAmount, status } = computeBalances(t);
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/ledger/${t.id}`)}
              className="flex items-center justify-between border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-surfaceRaised/60"
            >
              <div>
                <div className="text-sm text-slate-900">{t.category || 'Uncategorized'}</div>
                <div className="text-xs text-slate-500">
                  {t.concerns?.name} · {formatDate(t.transaction_date)}
                  {t.projects?.title && ` · ${t.projects.title}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-900">{formatMoney(t.total_amount)}</div>
                <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
              </div>
            </div>
          );
        })}
      </div>

      <PartyForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
        party={client}
      />

      <ProjectForm
        open={projectFormOpen}
        onClose={() => setProjectFormOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
        defaultClientId={id}
      />
    </div>
  );
}
