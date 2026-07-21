import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS } from '../lib/format.js';
import { fetchTransactions, computeBalances } from '../lib/ledgerData.js';
import { fetchVendor, deleteVendor } from '../lib/partyData.js';
import PartyForm from './parties/PartyForm.jsx';

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchVendor(id), fetchTransactions({ vendorId: id })])
      .then(([v, txns]) => {
        if (cancelled) return;
        setVendor(v);
        setTransactions(txns);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function handleDelete() {
    if (!window.confirm(`Delete ${vendor.name}?`)) return;
    try {
      await deleteVendor(id);
      navigate('/vendors');
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error && !vendor) return <p className="text-sm text-expense">{error}</p>;
  if (!vendor) return null;

  const totalBilled = transactions.reduce((s, t) => s + Number(t.total_amount), 0);
  const totalPaid = transactions.reduce((s, t) => s + computeBalances(t).paidAmount, 0);
  const totalDue = totalBilled - totalPaid;

  return (
    <div>
      <button onClick={() => navigate('/vendors')} className="text-xs text-gray-500 mb-3">
        ← Back to Vendors
      </button>

      <div className="border border-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-lg font-semibold text-gray-100">{vendor.name}</div>
            <div className="text-xs text-gray-500">
              {[vendor.phone, vendor.email, vendor.address].filter(Boolean).join(' · ') || 'No contact info'}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-md text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        {vendor.notes && <p className="text-sm text-gray-400 mb-3">{vendor.notes}</p>}

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Billed</div>
            <div className="text-gray-100">{formatMoney(totalBilled)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Paid</div>
            <div className="text-gray-100">{formatMoney(totalPaid)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Due</div>
            <div className={totalDue > 0 ? 'text-due' : 'text-gray-100'}>{formatMoney(totalDue)}</div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <h2 className="text-sm font-medium text-gray-300 mb-2">Transaction history</h2>
      {transactions.length === 0 && <p className="text-sm text-gray-500">No transactions yet.</p>}
      <div className="space-y-2">
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
                  {t.concerns?.name} · {formatDate(t.transaction_date)}
                  {t.projects?.title && ` · ${t.projects.title}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-100">{formatMoney(t.total_amount)}</div>
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
        kind="vendor"
        party={vendor}
      />
    </div>
  );
}
