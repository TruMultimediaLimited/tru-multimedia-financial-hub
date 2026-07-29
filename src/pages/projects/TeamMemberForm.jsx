import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import { createTransaction, fetchEmployees } from '../../lib/ledgerData.js';
import { createEmployee } from '../../lib/employeeData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);
const emptyRow = () => ({ key: `row-${Math.random().toString(36).slice(2)}`, employeeId: '', salary: '' });

// Records each team member's project salary as its own Salary/Payroll
// expense transaction linked to this project — the same Due/Partial/Paid
// and profit machinery already used for every other transaction picks it
// up automatically, no separate "assignment" concept needed. Supports
// adding several team members in one go, since a project is usually
// staffed with more than one person at a time.
export default function TeamMemberForm({ open, onClose, onSaved, project, existingEmployeeIds = [] }) {
  const { concerns } = useConcern();
  const parentConcern = concerns.find((c) => c.parent_concern_id === null);

  const [rows, setRows] = useState([emptyRow()]);
  const [employees, setEmployees] = useState([]);
  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setRows([emptyRow()]);
    setShowNewEmployee(false);
    setNewEmployeeName('');
    setDate(todayStr());
    setError('');
    fetchEmployees(null).then(setEmployees).catch((e) => setError(e.message));
  }, [open]);

  if (!open) return null;

  function updateRow(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // An employee already on this project's team (or already picked in a
  // different row of this same form) can't be selected again — a project
  // should only list each employee once, not accumulate duplicate salary
  // entries for the same person. Fixed-salary employees are NOT excluded
  // here — many of them also pick up project work for extra income on
  // top of their fixed monthly salary, tracked as its own separate
  // project-linked entry.
  function availableEmployees(rowKey) {
    const takenElsewhere = new Set(
      rows.filter((r) => r.key !== rowKey && r.employeeId).map((r) => r.employeeId)
    );
    return employees.filter(
      (emp) => !existingEmployeeIds.includes(emp.id) && !takenElsewhere.has(emp.id)
    );
  }

  function removeRow(key) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function handleSaveNewEmployee() {
    if (!newEmployeeName.trim()) return;
    setSavingEmployee(true);
    setError('');
    try {
      const emp = await createEmployee({ concern_id: parentConcern?.id, name: newEmployeeName.trim(), role: null });
      setEmployees((prev) => [...prev, emp].sort((a, b) => a.name.localeCompare(b.name)));
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
    setError('');

    if (rows.some((r) => !r.employeeId)) return setError('Select an employee for every row.');
    if (rows.some((r) => !r.salary || Number(r.salary) <= 0)) return setError('Salary must be greater than 0 for every row.');
    if (rows.some((r) => existingEmployeeIds.includes(r.employeeId))) {
      return setError('One of the selected employees is already on this project\'s team.');
    }
    const pickedIds = rows.map((r) => r.employeeId);
    if (new Set(pickedIds).size !== pickedIds.length) {
      return setError('The same employee is selected in more than one row.');
    }

    setSaving(true);
    try {
      for (const row of rows) {
        await createTransaction({
          concern_id: project.concern_id,
          project_id: project.id,
          employee_id: row.employeeId,
          type: 'expense',
          category: 'Salary/Payroll',
          total_amount: Number(row.salary),
          transaction_date: date,
        });
      }
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
        {rows.map((row, idx) => (
          <div key={row.key} className="border border-slate-200 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Team member {idx + 1}</span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  className="text-xs text-expense hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <Field label="Employee" required>
              <select
                className={inputClass}
                value={row.employeeId}
                onChange={(e) => updateRow(row.key, { employeeId: e.target.value })}
              >
                <option value="">Select employee</option>
                {availableEmployees(row.key).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Salary for this project" required>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={row.salary}
                onChange={(e) => updateRow(row.key, { salary: e.target.value })}
              />
            </Field>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className="w-full h-10 mb-3 rounded-xl text-sm font-medium border border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900"
        >
          + Add another team member
        </button>

        <Field label="New employee not in the list?">
          {!showNewEmployee ? (
            <button
              type="button"
              onClick={() => setShowNewEmployee(true)}
              className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 text-slate-700 hover:text-slate-900"
            >
              + New employee
            </button>
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

        <Field label="Date" required hint="Applied to every team member added above.">
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : rows.length > 1 ? `Add ${rows.length} to project` : 'Add to project'}
        </button>
      </form>
    </Sheet>
  );
}
