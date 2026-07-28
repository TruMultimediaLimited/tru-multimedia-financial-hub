import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { createTransaction, addPayment, fetchEmployees } from '../../lib/ledgerData.js';
import { fetchOwners } from '../../lib/ownerData.js';
import { fetchLoans } from '../../lib/loanData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

// The 3 most common non-employee project costs — anything else goes through
// "+ Add new" rather than growing this list.
const FIXED_CATEGORIES = ['Transport', 'Food & Refreshments', 'Equipment'];

// Records a non-employee project cost (transport, food, gear, etc.) as its
// own expense transaction linked to this project, paid immediately — same
// "who gave it and how" capture as the generic Add expense form, plus an
// optional "Given to" for when the money was handed to a specific person
// without it being that person's salary (e.g. cash given to someone for
// transport). Salary itself still goes through "+ Add team member".
export default function ProjectExpenseForm({ open, onClose, onSaved, project }) {
  const [category, setCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [givenToEmployeeId, setGivenToEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loans, setLoans] = useState([]);
  const [handledBy, setHandledBy] = useState('');
  const [channel, setChannel] = useState('bkash');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCategory('');
    setShowCustomCategory(false);
    setGivenToEmployeeId('');
    setHandledBy('');
    setChannel('bkash');
    setAmount('');
    setDate(todayStr());
    setError('');
    fetchEmployees(null).then(setEmployees).catch((e) => setError(e.message));
    fetchOwners().then(setOwners).catch((e) => setError(e.message));
    fetchLoans().then(setLoans).catch((e) => setError(e.message));
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!category.trim()) return setError('Category is required.');
    if (!amount || Number(amount) <= 0) return setError('Amount must be greater than 0.');
    if (!channel) return setError('Channel is required.');
    if (!handledBy) return setError('Handled by is required.');

    const [handledByKind, handledById] = handledBy.split(':');

    setSaving(true);
    try {
      const txn = await createTransaction({
        concern_id: project.concern_id,
        project_id: project.id,
        employee_id: givenToEmployeeId || null,
        type: 'expense',
        category: category.trim(),
        total_amount: Number(amount),
        transaction_date: date,
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
    <Sheet open={open} onClose={onClose} title="Add project expense">
      <form onSubmit={handleSubmit}>
        <Field label="Category" required>
          <div className="flex gap-2 flex-wrap mb-2">
            {FIXED_CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => {
                  setCategory(c);
                  setShowCustomCategory(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  category === c && !showCustomCategory
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surfaceRaised text-slate-600 border-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setShowCustomCategory(true);
                setCategory('');
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                showCustomCategory ? 'bg-primary text-white border-primary' : 'bg-surfaceRaised text-slate-600 border-slate-200'
              }`}
            >
              + Add new
            </button>
          </div>
          {showCustomCategory && (
            <input
              className={inputClass}
              placeholder="Category name"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          )}
        </Field>

        <Field label="Given to" hint="Optional — leave blank if not for a specific person">
          <select className={inputClass} value={givenToEmployeeId} onChange={(e) => setGivenToEmployeeId(e.target.value)}>
            <option value="">No one specific</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </Field>

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

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Add to project'}
        </button>
      </form>
    </Sheet>
  );
}
