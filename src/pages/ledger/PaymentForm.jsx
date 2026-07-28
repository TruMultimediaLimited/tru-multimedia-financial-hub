import { useEffect, useState } from 'react';
import Field, { inputClass } from '../../components/Field.jsx';
import { addPayment } from '../../lib/ledgerData.js';
import { fetchOwners } from '../../lib/ownerData.js';
import { fetchLoans } from '../../lib/loanData.js';
import { syncProjectCompletion } from '../../lib/projectData.js';
import { formatMoney } from '../../lib/format.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

// Money moves through one of the 3 partners, or — for an expense — a loan
// funding the company's costs instead of a partner's own pocket. Never an
// employee or a generic "myself".
export default function PaymentForm({ transactionId, dueAmount, projectId, transactionType, onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [channel, setChannel] = useState('bkash');
  const [handledBy, setHandledBy] = useState('');
  const [note, setNote] = useState('');

  const [owners, setOwners] = useState([]);
  const [loans, setLoans] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOwners().then(setOwners).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (transactionType !== 'expense') return;
    fetchLoans().then(setLoans).catch((e) => setError(e.message));
  }, [transactionType]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const amt = Number(amount);
    if (!(amt > 0)) return setError('Amount must be greater than 0.');
    if (amt > dueAmount) return setError(`Amount exceeds the remaining due (${formatMoney(dueAmount)}).`);

    const [handledByKind, handledById] = handledBy ? handledBy.split(':') : [];

    const payload = {
      transaction_id: transactionId,
      amount: amt,
      channel,
      payment_date: date,
      note: note.trim() || null,
      handled_by_owner_id: handledByKind === 'owner' ? handledById : null,
      handled_by_loan_id: handledByKind === 'loan' ? handledById : null,
    };

    setSaving(true);
    try {
      await addPayment(payload);
      if (transactionType === 'income' && projectId) {
        syncProjectCompletion(projectId).catch(() => {});
      }
      setAmount('');
      setNote('');
      setHandledBy('');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const remaining = dueAmount - (Number(amount) || 0);

  return (
    <form onSubmit={handleSubmit} className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-4 md:max-w-md">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" required>
          <input
            type="number"
            min="0"
            max={dueAmount}
            step="0.01"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Date" required>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Field label="Channel" required>
        <select className={inputClass} value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="bkash">bKash</option>
          <option value="nagad">Nagad</option>
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
          <option value="other">Other</option>
        </select>
      </Field>

      <Field label="Handled by">
        <select className={inputClass} value={handledBy} onChange={(e) => setHandledBy(e.target.value)}>
          <option value="">Select</option>
          {owners.map((o) => (
            <option key={o.id} value={`owner:${o.id}`}>
              {o.name}
            </option>
          ))}
          {loans.map((l) => (
            <option key={l.id} value={`loan:${l.id}`}>
              {l.name} (Loan)
            </option>
          ))}
        </select>
      </Field>

      <Field label="Note">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {amount && (
        <p className="text-xs text-slate-500 mb-3">
          Remaining after this payment: {formatMoney(Math.max(remaining, 0))}
          {remaining < 0 && <span className="text-due"> (overpaying by {formatMoney(-remaining)})</span>}
        </p>
      )}

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
      >
        {saving ? 'Adding…' : '+ Add payment'}
      </button>
    </form>
  );
}
