import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { createLoan, updateLoan } from '../../lib/loanData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function LoanForm({ open, onClose, onSaved, loan = null }) {
  const [name, setName] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [monthlyInterestAmount, setMonthlyInterestAmount] = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [termMonths, setTermMonths] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(loan?.name ?? '');
    setPrincipalAmount(loan?.principal_amount != null ? String(loan.principal_amount) : '');
    setMonthlyInterestAmount(loan?.monthly_interest_amount != null ? String(loan.monthly_interest_amount) : '');
    setStartDate(loan?.start_date ?? todayStr());
    setTermMonths(loan?.term_months != null ? String(loan.term_months) : '');
    setNote(loan?.note ?? '');
    setError('');
  }, [open, loan]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required.');
    if (!(Number(principalAmount) > 0)) return setError('Principal amount must be greater than 0.');

    const payload = {
      name: name.trim(),
      principal_amount: Number(principalAmount),
      monthly_interest_amount: monthlyInterestAmount === '' ? null : Number(monthlyInterestAmount),
      start_date: startDate,
      term_months: termMonths === '' ? null : Number(termMonths),
      note: note.trim() || null,
    };

    setSaving(true);
    setError('');
    try {
      if (loan) await updateLoan(loan.id, payload);
      else await createLoan(payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={loan ? 'Edit loan' : 'New loan'}>
      <form onSubmit={handleSubmit}>
        <Field label="Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bank Loan" />
        </Field>

        <Field label="Principal amount" required>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={principalAmount}
            onChange={(e) => setPrincipalAmount(e.target.value)}
          />
        </Field>

        <Field label="Monthly interest" hint="Optional">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={monthlyInterestAmount}
            onChange={(e) => setMonthlyInterestAmount(e.target.value)}
          />
        </Field>

        <Field label="Start date" required>
          <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>

        <Field label="Term (months)" hint="Optional">
          <input type="number" min="0" step="1" className={inputClass} value={termMonths} onChange={(e) => setTermMonths(e.target.value)} />
        </Field>

        <Field label="Note" hint="Optional">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : loan ? 'Save changes' : 'Add loan'}
        </button>
      </form>
    </Sheet>
  );
}
