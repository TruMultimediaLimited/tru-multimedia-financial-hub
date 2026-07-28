import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/BackButton.jsx';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { formatMoney, formatDate, CHANNEL_LABELS } from '../lib/format.js';
import { fetchLoan, deleteLoan, fetchLoanPayments } from '../lib/loanData.js';
import LoanForm from './loans/LoanForm.jsx';

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loan, setLoan] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchLoan(id), fetchLoanPayments(id)])
      .then(([l, pays]) => {
        if (cancelled) return;
        setLoan(l);
        setPayments(pays);
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
    if (!window.confirm(`Delete ${loan.name}?`)) return;
    try {
      await deleteLoan(id);
      navigate('/loans');
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error && !loan) return <p className="text-sm text-expense">{error}</p>;
  if (!loan) return null;

  // Loans only ever fund expenses — defensive filter even though the DB
  // doesn't itself enforce that a loan-handled payment must be an expense.
  const expenses = payments.filter((p) => p.transactions?.type === 'expense');

  return (
    <div>
      <BackButton />

      <div className={`${ENTITY_COLORS.loan.bg} border border-slate-200 border-l-4 ${ENTITY_COLORS.loan.border} rounded-2xl shadow-card p-4 mb-4`}>
        <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 break-words">{loan.name}</div>
            {loan.note && <div className="text-xs text-slate-500">{loan.note}</div>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 text-slate-700">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-xl text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-xs text-slate-500">Remaining balance</div>
          <div className="text-2xl font-bold text-slate-900">{formatMoney(loan.remainingBalance)}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Principal</div>
            <div className="text-slate-900">{formatMoney(loan.principal_amount)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Monthly interest</div>
            <div className="text-slate-900">{loan.monthly_interest_amount != null ? formatMoney(loan.monthly_interest_amount) : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Start date</div>
            <div className="text-slate-900">{formatDate(loan.start_date)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Term</div>
            <div className="text-slate-900">{loan.term_months != null ? `${loan.term_months} months` : '—'}</div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <h2 className="text-sm font-medium text-slate-700 mb-2">Expenses drawn from this loan</h2>
      <div className="space-y-2 mb-4">
        {expenses.length === 0 && <p className="text-sm text-slate-500">Nothing drawn from this loan yet.</p>}
        {expenses.map((p) => (
          <PaymentHistoryRow key={p.id} payment={p} onClick={() => navigate(`/ledger/${p.transaction_id}`)} />
        ))}
      </div>

      <LoanForm open={editOpen} onClose={() => setEditOpen(false)} onSaved={refresh} loan={loan} />
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
