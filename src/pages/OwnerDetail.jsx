import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatMoney, formatDate, CHANNEL_LABELS } from '../lib/format.js';
import { fetchOwner, deleteOwner, fetchOwnerPayments, fetchOwnerInvestments, deleteOwnerInvestment } from '../lib/ownerData.js';
import OwnerForm from './owners/OwnerForm.jsx';
import OwnerInvestmentForm from './owners/OwnerInvestmentForm.jsx';

export default function OwnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [owner, setOwner] = useState(null);
  const [payments, setPayments] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchOwner(id), fetchOwnerPayments(id), fetchOwnerInvestments(id)])
      .then(([o, pays, invs]) => {
        if (cancelled) return;
        setOwner(o);
        setPayments(pays);
        setInvestments(invs);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${owner.name}?`)) return;
    try {
      await deleteOwner(id);
      navigate('/owners');
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteInvestment(invId) {
    if (!window.confirm('Delete this investment record?')) return;
    await deleteOwnerInvestment(invId);
    refresh();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error && !owner) return <p className="text-sm text-expense">{error}</p>;
  if (!owner) return null;

  const received = payments.filter((p) => p.transactions?.type === 'income');
  const given = payments.filter((p) => p.transactions?.type === 'expense');

  return (
    <div>
      <button onClick={() => navigate('/owners')} className="text-xs text-slate-500 mb-3">
        ← Back to Owners
      </button>

      <div className="bg-surfaceRaised border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-lg font-semibold text-slate-900">{owner.name}</div>
            <div className="text-xs text-slate-500">
              {owner.role || 'Partner'}
              {owner.company_share_percent != null && ` · ${owner.company_share_percent}% share`}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-md text-xs border border-slate-300 text-slate-700">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-md text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Received</div>
            <div className="text-income">{formatMoney(owner.totalReceived)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Given</div>
            <div className="text-expense">{formatMoney(owner.totalGiven)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{owner.netOwedToOwner >= 0 ? 'Company owes' : 'Owner owes company'}</div>
            <div className={owner.netOwedToOwner !== 0 ? 'text-due' : 'text-slate-900'}>
              {formatMoney(Math.abs(owner.netOwedToOwner))}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Invested</div>
            <div className="text-slate-900">{formatMoney(owner.totalInvested)}</div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <h2 className="text-sm font-medium text-slate-700 mb-2">Investment history</h2>
      <div className="space-y-2 mb-3">
        {investments.length === 0 && <p className="text-sm text-slate-500">No investments recorded yet.</p>}
        {investments.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
            <div>
              <div className="text-sm text-slate-900">{formatMoney(inv.amount)}</div>
              <div className="text-xs text-slate-500">
                {formatDate(inv.investment_date)}
                {inv.note && ` · ${inv.note}`}
              </div>
            </div>
            <button onClick={() => handleDeleteInvestment(inv.id)} className="text-xs text-expense">
              Delete
            </button>
          </div>
        ))}
      </div>
      <div className="mb-6">
        <OwnerInvestmentForm ownerId={id} onSaved={refresh} />
      </div>

      <h2 className="text-sm font-medium text-slate-700 mb-2">Money received (collected on company's behalf)</h2>
      <div className="space-y-2 mb-4">
        {received.length === 0 && <p className="text-sm text-slate-500">Nothing recorded yet.</p>}
        {received.map((p) => (
          <PaymentHistoryRow key={p.id} payment={p} onClick={() => navigate(`/ledger/${p.transaction_id}`)} />
        ))}
      </div>

      <h2 className="text-sm font-medium text-slate-700 mb-2">Money given (paid company expenses out of pocket)</h2>
      <div className="space-y-2 mb-4">
        {given.length === 0 && <p className="text-sm text-slate-500">Nothing recorded yet.</p>}
        {given.map((p) => (
          <PaymentHistoryRow key={p.id} payment={p} onClick={() => navigate(`/ledger/${p.transaction_id}`)} />
        ))}
      </div>

      <OwnerForm open={editOpen} onClose={() => setEditOpen(false)} onSaved={refresh} owner={owner} />
    </div>
  );
}

function PaymentHistoryRow({ payment, onClick }) {
  return (
    <div onClick={onClick} className="flex items-center justify-between border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-surfaceRaised/60">
      <div>
        <div className="text-sm text-slate-900">{payment.transactions?.category || 'Uncategorized'}</div>
        <div className="text-xs text-slate-500">
          {payment.transactions?.concerns?.name} · {formatDate(payment.payment_date)} · via {CHANNEL_LABELS[payment.channel]}
          {payment.note && ` · ${payment.note}`}
        </div>
      </div>
      <div className="text-sm text-slate-900">{formatMoney(payment.amount)}</div>
    </div>
  );
}
