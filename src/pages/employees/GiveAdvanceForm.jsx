import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { createTransaction, addPayment } from '../../lib/ledgerData.js';
import { fetchOwners } from '../../lib/ownerData.js';
import { fetchLoans } from '../../lib/loanData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

// An advance is money leaving the company the moment it's given, so —
// like ProjectExpenseForm.jsx — this creates the transaction and records
// a matching full payment together. Recovery against a future month's
// salary is tracked informationally only (see the "Advance given" total
// on EmployeeDetail) — netting it off is a manual decision the owner
// makes when they later record that month's salary payment.
export default function GiveAdvanceForm({ open, onClose, onSaved, employee }) {
  const [owners, setOwners] = useState([]);
  const [loans, setLoans] = useState([]);
  const [handledBy, setHandledBy] = useState('');
  const [channel, setChannel] = useState('bkash');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setHandledBy('');
    setChannel('bkash');
    setAmount('');
    setDate(todayStr());
    setNote('');
    setError('');
    fetchOwners().then(setOwners).catch((e) => setError(e.message));
    fetchLoans().then(setLoans).catch((e) => setError(e.message));
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!amount || Number(amount) <= 0) return setError('Amount must be greater than 0.');
    if (!channel) return setError('Channel is required.');
    if (!handledBy) return setError('Handled by is required.');

    const [handledByKind, handledById] = handledBy.split(':');

    setSaving(true);
    try {
      const txn = await createTransaction({
        concern_id: employee.concern_id,
        project_id: null,
        employee_id: employee.id,
        type: 'expense',
        category: 'Salary Advance',
        total_amount: Number(amount),
        transaction_date: date,
        description: note.trim() || null,
      });
      await addPayment({
        transaction_id: txn.id,
        amount: Number(amount),
        channel,
        payment_date: date,
        note: null,
        handled_by_owner_id: handledByKind === 'owner' ? handledById : null,
        handled_by_loan_id: handledByKind === 'loan' ? handledById : null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Give salary advance">
      <form onSubmit={handleSubmit}>
        <Field label="Amount" required>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field label="Handled by" required hint="Who gave the money">
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

        <Field label="Channel" required hint="How it was given">
          <select className={inputClass} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="bank">Bank</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
          </select>
        </Field>

        <Field label="Date" required>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Note">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Give advance'}
        </button>
      </form>
    </Sheet>
  );
}
