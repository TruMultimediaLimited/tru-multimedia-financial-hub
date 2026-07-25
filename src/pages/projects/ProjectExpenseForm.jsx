import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { createTransaction } from '../../lib/ledgerData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

// Categories a project's non-employee cost usually falls into, minus
// Salary/Payroll — that one's covered by the dedicated "+ Add team member"
// flow, not this generic one.
const OTHER_CATEGORIES = [
  'Office Rent',
  'Electricity Bill',
  'Equipment',
  'Food & Refreshments',
  'Guest Entertainment',
  'Transport',
  'Internet & Phone',
  'Maintenance',
  'Other',
];

// Records a non-employee project cost (food, rent, gear, etc.) as its own
// expense transaction linked to this project — same shape as a team
// member's salary, just without an employee attached. `fixedCategory` locks
// the category for the Food/Rent quick-add buttons; leave it unset for the
// generic "+ Other expense" button, which lets the category be picked.
export default function ProjectExpenseForm({ open, onClose, onSaved, project, fixedCategory }) {
  const [category, setCategory] = useState(fixedCategory ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCategory(fixedCategory ?? '');
    setAmount('');
    setDate(todayStr());
    setError('');
  }, [open, fixedCategory]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category) return setError('Category is required.');
    if (!amount || Number(amount) <= 0) return setError('Amount must be greater than 0.');

    setSaving(true);
    setError('');
    try {
      await createTransaction({
        concern_id: project.concern_id,
        project_id: project.id,
        employee_id: null,
        type: 'expense',
        category,
        total_amount: Number(amount),
        transaction_date: date,
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
    <Sheet open={open} onClose={onClose} title={fixedCategory ? `Add ${fixedCategory}` : 'Add project expense'}>
      <form onSubmit={handleSubmit}>
        {!fixedCategory && (
          <Field label="Category" required>
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select category</option>
              {OTHER_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        )}

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
