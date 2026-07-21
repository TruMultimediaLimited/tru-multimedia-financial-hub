import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS } from '../lib/format.js';
import { fetchInvoice, deleteInvoice } from '../lib/invoiceData.js';
import InvoiceForm from './invoices/InvoiceForm.jsx';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInvoice(id)
      .then((inv) => !cancelled && setInvoice(inv))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function handleDelete() {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}?`)) return;
    try {
      await deleteInvoice(id);
      navigate('/invoices');
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error && !invoice) return <p className="text-sm text-expense">{error}</p>;
  if (!invoice) return null;

  const referenceLabel = invoice.transactions
    ? `Transaction — ${invoice.transactions.category || 'Uncategorized'} (${formatDate(invoice.transactions.transaction_date)})`
    : invoice.projects
    ? `Project — ${invoice.projects.title}`
    : '—';

  return (
    <div>
      <button onClick={() => navigate('/invoices')} className="text-xs text-slate-500 mb-3 print:hidden">
        ← Back to Invoices
      </button>

      <div className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-6 mb-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs text-slate-500">Tru Multimedia Limited</div>
            <div className="text-xl font-semibold text-slate-900">{invoice.invoice_number}</div>
          </div>
          <Badge className={STATUS_STYLES[invoice.status]}>{STATUS_LABELS[invoice.status]}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <div className="text-xs text-slate-500 mb-1">Billed to</div>
            <div className="text-slate-900">{invoice.clients?.name}</div>
            <div className="text-slate-500 text-xs">
              {[invoice.clients?.phone, invoice.clients?.email, invoice.clients?.address].filter(Boolean).join(' · ')}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1">Dates</div>
            <div className="text-slate-700">Issued {formatDate(invoice.issued_date)}</div>
            {invoice.due_date && <div className="text-slate-700">Due {formatDate(invoice.due_date)}</div>}
          </div>
        </div>

        <div className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-4 mb-4">
          <div className="text-xs text-slate-500 mb-1">For</div>
          <div className="text-slate-900 mb-3">{referenceLabel}</div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Amount</div>
              <div className="text-slate-900">{formatMoney(invoice.amount)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Received</div>
              <div className="text-income">{formatMoney(invoice.paid)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Due</div>
              <div className={invoice.due > 0 ? 'text-due' : 'text-slate-900'}>{formatMoney(invoice.due)}</div>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div>
            <div className="text-xs text-slate-500 mb-1">Notes</div>
            <p className="text-sm text-slate-700">{invoice.notes}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 print:hidden">
        <button onClick={() => window.print()} className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 text-slate-700">
          Print
        </button>
        <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 text-slate-700">
          Edit
        </button>
        <button onClick={handleDelete} className="px-3 py-1.5 rounded-xl text-xs border border-expense/40 text-expense">
          Delete
        </button>
      </div>

      {error && <p className="text-sm text-expense mt-3">{error}</p>}

      <InvoiceForm open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} invoice={invoice} />
    </div>
  );
}
