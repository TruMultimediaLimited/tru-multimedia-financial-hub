import { useEffect, useState } from 'react';
import Field, { inputClass } from '../../components/Field.jsx';
import { supabase } from '../../lib/supabase.js';
import { addPayment, fetchEmployees, createEmployee } from '../../lib/ledgerData.js';
import { formatMoney } from '../../lib/format.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function PaymentForm({ transactionId, concernId, dueAmount, onSaved }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [channel, setChannel] = useState('bkash');
  const [handledBy, setHandledBy] = useState('');
  const [note, setNote] = useState('');

  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('');
  const [savingEmployee, setSavingEmployee] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (concernId) fetchEmployees(concernId).then(setEmployees).catch((e) => setError(e.message));
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user ?? null));
  }, [concernId]);

  async function handleSaveNewEmployee() {
    if (!newEmployeeName.trim()) return;
    setSavingEmployee(true);
    setError('');
    try {
      const row = await createEmployee({
        concern_id: concernId,
        name: newEmployeeName.trim(),
        role: newEmployeeRole.trim() || null,
      });
      setEmployees((prev) => [...prev, row]);
      setHandledBy(`employee:${row.id}`);
      setShowNewEmployee(false);
      setNewEmployeeName('');
      setNewEmployeeRole('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingEmployee(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const amt = Number(amount);
    if (!(amt > 0)) return setError('Amount must be greater than 0.');

    const payload = {
      transaction_id: transactionId,
      amount: amt,
      channel,
      payment_date: date,
      note: note.trim() || null,
      handled_by_employee_id: handledBy.startsWith('employee:') ? handledBy.split(':')[1] : null,
      handled_by_user_id: handledBy === 'self' ? currentUser?.id ?? null : null,
    };

    setSaving(true);
    try {
      await addPayment(payload);
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
    <form onSubmit={handleSubmit} className="border border-gray-800 rounded-lg p-4 bg-surfaceRaised">
      <div className="grid grid-cols-2 gap-3">
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
        {!showNewEmployee ? (
          <div className="flex gap-2">
            <select className={inputClass} value={handledBy} onChange={(e) => setHandledBy(e.target.value)}>
              <option value="">Select</option>
              {currentUser && <option value="self">Myself ({currentUser.email})</option>}
              {employees.map((emp) => (
                <option key={emp.id} value={`employee:${emp.id}`}>
                  {emp.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewEmployee(true)}
              className="shrink-0 px-3 rounded-md text-sm border border-gray-700 text-gray-300 hover:text-gray-100"
            >
              + New
            </button>
          </div>
        ) : (
          <div className="border border-gray-700 rounded-md p-3 space-y-2">
            <input
              className={inputClass}
              placeholder="Employee name"
              value={newEmployeeName}
              onChange={(e) => setNewEmployeeName(e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Role (optional)"
              value={newEmployeeRole}
              onChange={(e) => setNewEmployeeRole(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={savingEmployee}
                onClick={handleSaveNewEmployee}
                className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-900 disabled:opacity-50"
              >
                {savingEmployee ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewEmployee(false)}
                className="px-3 py-1.5 rounded-md text-sm border border-gray-700 text-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Field>

      <Field label="Note">
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {amount && (
        <p className="text-xs text-gray-500 mb-3">
          Remaining after this payment: {formatMoney(Math.max(remaining, 0))}
          {remaining < 0 && <span className="text-due"> (overpaying by {formatMoney(-remaining)})</span>}
        </p>
      )}

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-50"
      >
        {saving ? 'Adding…' : '+ Add payment'}
      </button>
    </form>
  );
}
