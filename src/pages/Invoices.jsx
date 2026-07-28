import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Badge from '../components/Badge.jsx';
import BackButton from '../components/BackButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS } from '../lib/format.js';
import { fetchInvoices } from '../lib/invoiceData.js';
import InvoiceForm from './invoices/InvoiceForm.jsx';

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchInvoices()
      .then((rows) => !cancelled && setInvoices(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div>
      <BackButton />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <button onClick={() => setFormOpen(true)} className="px-3 py-1.5 rounded-xl text-sm bg-primary text-white hover:bg-primaryHover">
          + New invoice
        </button>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && invoices.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8">
          <EmptyState icon={FileText} message="No invoices yet." />
        </div>
      )}

      {!loading && invoices.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal">Invoice #</th>
                  <th className="py-2 pr-3 font-normal">Client</th>
                  <th className="py-2 pr-3 font-normal">Issued</th>
                  <th className="py-2 pr-3 font-normal">Due date</th>
                  <th className="py-2 pr-3 font-normal text-right">Amount</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="border-b border-slate-200/60 cursor-pointer hover:bg-surfaceRaised/60"
                  >
                    <td className="py-2.5 pr-3 text-slate-900">{inv.invoice_number}</td>
                    <td className="py-2.5 pr-3 text-slate-700">{inv.clients?.name}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{formatDate(inv.issued_date)}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-900">{formatMoney(inv.amount)}</td>
                    <td className="py-2.5 pr-3">
                      <Badge className={STATUS_STYLES[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className={`flex items-center justify-between ${ENTITY_COLORS.client.bg} border border-slate-200 border-l-4 ${ENTITY_COLORS.client.border} rounded-2xl shadow-card p-4 cursor-pointer hover:bg-surface`}
              >
                <div>
                  <div className="text-sm text-slate-900">{inv.invoice_number}</div>
                  <div className="text-xs text-slate-500">
                    {inv.clients?.name} · {formatDate(inv.issued_date)}
                    {inv.due_date && ` · due ${formatDate(inv.due_date)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-900">{formatMoney(inv.amount)}</div>
                  <Badge className={STATUS_STYLES[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <InvoiceForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
