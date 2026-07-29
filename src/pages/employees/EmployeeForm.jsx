import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import { createEmployee, updateEmployee, fetchDistinctRoles } from '../../lib/employeeData.js';

const DEFAULT_ROLES = [
  'Camera Operator',
  'Photographer',
  'Videographer',
  'Editor',
  'Graphic Designer',
  'Sound Engineer',
  'Assistant',
  'Accountant',
  'Office Staff',
];

export default function EmployeeForm({ open, onClose, onSaved, employee = null }) {
  const { concerns } = useConcern();
  const parentConcern = concerns.find((c) => c.parent_concern_id === null);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [type, setType] = useState('project_based');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [roleOptions, setRoleOptions] = useState(DEFAULT_ROLES);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(employee?.name ?? '');
    setRole(employee?.role ?? '');
    setType(employee?.type ?? 'project_based');
    setMonthlySalary(employee?.monthly_salary != null ? String(employee.monthly_salary) : '');
    setShowNewRole(false);
    setNewRoleName('');
    setError('');
    fetchDistinctRoles()
      .then((existing) => setRoleOptions(Array.from(new Set([...DEFAULT_ROLES, ...existing])).sort()))
      .catch((e) => setError(e.message));
  }, [open, employee]);

  if (!open) return null;

  function handleUseNewRole() {
    const trimmed = newRoleName.trim();
    if (!trimmed) return;
    setRoleOptions((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed].sort()));
    setRole(trimmed);
    setShowNewRole(false);
    setNewRoleName('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required.');
    if (type === 'fixed' && !(Number(monthlySalary) > 0)) {
      return setError('Monthly salary must be greater than 0.');
    }

    const payload = {
      name: name.trim(),
      role: role || null,
      type,
      monthly_salary: type === 'fixed' ? Number(monthlySalary) : null,
    };
    if (!employee) payload.concern_id = parentConcern?.id;

    setSaving(true);
    setError('');
    try {
      if (employee) await updateEmployee(employee.id, payload);
      else await createEmployee(payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={employee ? 'Edit employee' : 'New employee'}>
      <form onSubmit={handleSubmit}>
        <Field label="Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Type" required>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('project_based')}
              className={`py-2 rounded-xl text-sm border ${
                type === 'project_based' ? 'bg-primary/15 border-primary text-primary' : 'border-slate-300 text-slate-500'
              }`}
            >
              Project-based
            </button>
            <button
              type="button"
              onClick={() => setType('fixed')}
              className={`py-2 rounded-xl text-sm border ${
                type === 'fixed' ? 'bg-primary/15 border-primary text-primary' : 'border-slate-300 text-slate-500'
              }`}
            >
              Fixed Salary
            </button>
          </div>
        </Field>

        {type === 'fixed' && (
          <Field label="Monthly salary" required>
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
              value={monthlySalary}
              onChange={(e) => setMonthlySalary(e.target.value)}
            />
          </Field>
        )}

        <Field label="Role">
          {!showNewRole ? (
            <div className="flex gap-2">
              <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="">Select role</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewRole(true)}
                className="shrink-0 px-3 rounded-xl text-sm border border-slate-300 text-slate-700 hover:text-slate-900"
              >
                + New
              </button>
            </div>
          ) : (
            <div className="border border-slate-300 rounded-xl p-3 space-y-2">
              <input
                className={inputClass}
                placeholder="Role name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUseNewRole}
                  className="px-3 py-1.5 rounded-xl text-sm bg-primary text-white hover:bg-primaryHover"
                >
                  Use
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewRole(false)}
                  className="px-3 py-1.5 rounded-xl text-sm border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
        </button>
      </form>
    </Sheet>
  );
}
