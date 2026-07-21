import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { inputClass } from '../components/Field.jsx';
import { supabase } from '../lib/supabase.js';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS, CHANNEL_LABELS } from '../lib/format.js';
import {
  fetchTransaction,
  deleteTransaction,
  computeBalances,
  updatePayment,
  deletePayment,
  fetchEmployees,
} from '../lib/ledgerData.js';
import TransactionForm from './ledger/TransactionForm.jsx';
import PaymentForm from './ledger/PaymentForm.jsx';

export default function LedgerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTransaction(id)
      .then((t) => {
        if (!cancelled) {
          setTransaction(t);
          return fetchEmployees(t.concern_id);
        }
      })
      .then((emps) => {
        if (!cancelled && emps) setEmployees(emps);
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
    if (!window.confirm('Delete this transaction? Its payments will be deleted too.')) return;
    try {
      await deleteTransaction(id);
      navigate(-1);
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error && !transaction) return <p className="text-sm text-expense">{error}</p>;
  if (!transaction) return null;

  const { paidAmount, dueAmount, status } = computeBalances(transaction);
  const party = transaction.clients?.name ?? transaction.employees?.name ?? '—';

  return (
    <div>
      <button onClick={() => navigate(-1)} className="text-xs text-gray-500 mb-3">
        ← Back
      </button>

      <div className="bg-surfaceRaised border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-lg font-semibold text-gray-900">{party}</div>
            <div className="text-xs text-gray-500">
              {transaction.concerns?.name} · {transaction.category || 'Uncategorized'} ·{' '}
              {formatDate(transaction.transaction_date)}
              {transaction.projects?.title && ` · ${transaction.projects.title}`}
            </div>
          </div>
          <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
        </div>

        {transaction.description && <p className="text-sm text-gray-500 mb-3">{transaction.description}</p>}

        <div className="grid grid-cols-3 gap-3 text-sm mb-3">
          <div>
            <div className="text-xs text-gray-500">Total</div>
            <div className="text-gray-900">{formatMoney(transaction.total_amount)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Paid</div>
            <div className="text-gray-900">{formatMoney(paidAmount)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Due</div>
            <div className={dueAmount > 0 ? 'text-due' : 'text-gray-900'}>{formatMoney(dueAmount)}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="px-3 py-1.5 rounded-md text-xs border border-gray-300 text-gray-700"
          >
            Edit
          </button>
          <button onClick={handleDelete} className="px-3 py-1.5 rounded-md text-xs border border-expense/40 text-expense">
            Delete
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <h2 className="text-sm font-medium text-gray-700 mb-2">Payments</h2>
      <div className="space-y-2 mb-4">
        {(transaction.payments ?? []).length === 0 && (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        )}
        {(transaction.payments ?? [])
          .slice()
          .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1))
          .map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              employees={employees}
              currentUser={currentUser}
              onChanged={refresh}
            />
          ))}
      </div>

      <h2 className="text-sm font-medium text-gray-700 mb-2">Add payment</h2>
      <PaymentForm
        transactionId={transaction.id}
        concernId={transaction.concern_id}
        dueAmount={dueAmount}
        projectId={transaction.project_id}
        transactionType={transaction.type}
        onSaved={refresh}
      />

      <TransactionForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={refresh}
        transaction={transaction}
      />
    </div>
  );
}

function PaymentRow({ payment, employees, currentUser, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(payment.amount);
  const [date, setDate] = useState(payment.payment_date);
  const [channel, setChannel] = useState(payment.channel);
  const [note, setNote] = useState(payment.note ?? '');
  const [saving, setSaving] = useState(false);

  const handledByLabel = payment.employees?.name
    ? payment.employees.name
    : payment.owners?.name
    ? `${payment.owners.name} (Owner)`
    : payment.handled_by_user_id
    ? payment.handled_by_user_id === currentUser?.id
      ? 'Myself'
      : 'Owner/Partner'
    : '—';

  async function handleSave() {
    setSaving(true);
    try {
      await updatePayment(payment.id, {
        amount: Number(amount),
        payment_date: date,
        channel,
        note: note.trim() || null,
      });
      setEditing(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this payment?')) return;
    await deletePayment(payment.id);
    onChanged();
  }

  if (editing) {
    return (
      <div className="bg-surfaceRaised border border-gray-200 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <select className={inputClass} value={channel} onChange={(e) => setChannel(e.target.value)}>
          {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 rounded-md text-xs bg-gray-900 text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-md text-xs border border-gray-300 text-gray-700">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
      <div>
        <div className="text-gray-900 text-sm">
          {formatMoney(payment.amount)}{' '}
          <span className="text-xs text-gray-500">via {CHANNEL_LABELS[payment.channel]}</span>
        </div>
        <div className="text-xs text-gray-500">
          {formatDate(payment.payment_date)} · Handled by {handledByLabel}
          {payment.note && ` · ${payment.note}`}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => setEditing(true)} className="text-xs text-gray-500">
          Edit
        </button>
        <button onClick={handleDelete} className="text-xs text-expense">
          Delete
        </button>
      </div>
    </div>
  );
}
