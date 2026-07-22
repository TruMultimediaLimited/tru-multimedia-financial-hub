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
  const [roleOptions, setRoleOptions] = useState(DEFAULT_ROLES);
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(employee?.name ?? '');
    setRole(employee?.role ?? '');
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

    const payload = {
      name: name.trim(),
      role: role || null,
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
