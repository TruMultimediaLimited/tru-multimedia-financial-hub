import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-100">Invoices</h1>
        <button onClick={() => setFormOpen(true)} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-900">
          + New invoice
        </button>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && invoices.length === 0 && (
        <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center text-gray-500">No invoices yet.</div>
      )}

      {!loading && invoices.length > 0 && (
        <div className="space-y-2">
          {invoices.map((inv) => (
            <div
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="flex items-center justify-between border border-gray-800 rounded-lg p-3 cursor-pointer hover:bg-surfaceRaised/60"
            >
              <div>
                <div className="text-sm text-gray-100">{inv.invoice_number}</div>
                <div className="text-xs text-gray-500">
                  {inv.clients?.name} · {formatDate(inv.issued_date)}
                  {inv.due_date && ` · due ${formatDate(inv.due_date)}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-100">{formatMoney(inv.amount)}</div>
                <Badge className={STATUS_STYLES[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <InvoiceForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
