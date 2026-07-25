import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import { createTransaction, fetchEmployees } from '../../lib/ledgerData.js';
import { createEmployee } from '../../lib/employeeData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

// Records a team member's project salary as a Salary/Payroll expense
// transaction linked to this project — the same Due/Partial/Paid and
// profit machinery already used for every other transaction picks it
// up automatically, no separate "assignment" concept needed.
export default function TeamMemberForm({ open, onClose, onSaved, project }) {
  const { concerns } = useConcern();
  const parentConcern = concerns.find((c) => c.parent_concern_id === null);

  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState([]);
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [salary, setSalary] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setEmployeeId('');
    setShowNewEmployee(false);
    setNewEmployeeName('');
    setSalary('');
    setDate(todayStr());
    setError('');
    fetchEmployees(null).then(setEmployees).catch((e) => setError(e.message));
  }, [open]);

  if (!open) return null;

  async function handleSaveNewEmployee() {
    if (!newEmployeeName.trim()) return;
    setSavingEmployee(true);
    setError('');
    try {
      const emp = await createEmployee({ concern_id: parentConcern?.id, name: newEmployeeName.trim(), role: null });
      setEmployees((prev) => [...prev, emp].sort((a, b) => a.name.localeCompare(b.name)));
      setEmployeeId(emp.id);
      setShowNewEmployee(false);
      setNewEmployeeName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingEmployee(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!employeeId) return setError('Select or add an employee.');
    if (!salary || Number(salary) <= 0) return setError('Salary must be greater than 0.');

    setSaving(true);
    setError('');
    try {
      await createTransaction({
        concern_id: project.concern_id,
        project_id: project.id,
        employee_id: employeeId,
        type: 'expense',
        category: 'Salary/Payroll',
        total_amount: Number(salary),
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
    <Sheet open={open} onClose={onClose} title="Add team member">
      <form onSubmit={handleSubmit}>
        <Field label="Employee" required>
          {!showNewEmployee ? (
            <div className="flex gap-2">
              <select className={inputClass} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewEmployee(true)}
                className="shrink-0 px-3 rounded-xl text-sm border border-slate-300 text-slate-700 hover:text-slate-900"
              >
                + New
              </button>
            </div>
          ) : (
            <div className="border border-slate-300 rounded-xl p-3 space-y-2">
              <input
                className={inputClass}
                placeholder="Employee name"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingEmployee}
                  onClick={handleSaveNewEmployee}
                  className="px-3 py-1.5 rounded-xl text-sm bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
                >
                  {savingEmployee ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewEmployee(false)}
                  className="px-3 py-1.5 rounded-xl text-sm border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Field>

        <Field
          label="Salary for this project"
          required
          hint="Recorded as a Salary/Payroll expense on this project — pay it (fully or partially) from the employee's page."
        >
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
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
