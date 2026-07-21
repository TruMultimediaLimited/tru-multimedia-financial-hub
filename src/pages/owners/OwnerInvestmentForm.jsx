import { useState } from 'react';
import Field, { inputClass } from '../../components/Field.jsx';
import { addOwnerInvestment } from '../../lib/ownerData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function OwnerInvestmentForm({ ownerId, onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const amt = Number(amount);
    if (!(amt > 0)) return setError('Amount must be greater than 0.');

    setSaving(true);
    try {
      await addOwnerInvestment({
        owner_id: ownerId,
        amount: amt,
        investment_date: date,
        note: note.trim() || null,
      });
      setAmount('');
      setNote('');
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surfaceRaised border border-slate-200 rounded-lg shadow-sm p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" required>
          <input type="number" min="0" step="0.01" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date" required>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Note">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Camera equipment purchase" />
      </Field>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
      >
        {saving ? 'Adding…' : '+ Add investment'}
      </button>
    </form>
  );
}
