import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { createTransaction, fetchTransactions } from '../../lib/ledgerData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthKey = (dateStr) => dateStr.slice(0, 7);

// Commits this employee's monthly salary as a Due expense transaction —
// the same "committed now, paid later via the transaction's own
// PaymentForm" pattern already used for project team salaries
// (TeamMemberForm.jsx), just without a project attached.
export default function PaySalaryForm({ open, onClose, onSaved, employee }) {
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDate(todayStr());
    setNote('');
    setError('');
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    setSaving(true);
    try {
      const existing = await fetchTransactions({ employeeId: employee.id, type: 'expense' });
      const alreadyAdded = existing.some((t) => t.category === 'Fixed Salary' && monthKey(t.transaction_date) === monthKey(date));
      if (alreadyAdded) {
        const monthLabel = new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        setError(`Already added a salary entry for ${monthLabel}.`);
        return;
      }

      await createTransaction({
        concern_id: employee.concern_id,
        project_id: null,
        employee_id: employee.id,
        type: 'expense',
        category: 'Fixed Salary',
        total_amount: Number(employee.monthly_salary),
        transaction_date: date,
        description: note.trim() || null,
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
    <Sheet open={open} onClose={onClose} title="Pay this month's salary">
      <form onSubmit={handleSubmit}>
        <p className="text-sm text-slate-600 mb-3">
          Records this month's committed salary as due — pay it (fully or partially) from the entry's own page afterward.
        </p>

        <Field label="Amount" hint="Set on the employee's profile">
          <input className={inputClass} value={employee.monthly_salary} disabled />
        </Field>

        <Field label="Date" required hint="Which month this salary is for">
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
          {saving ? 'Adding…' : 'Add to ledger'}
        </button>
      </form>
    </Sheet>
  );
}
