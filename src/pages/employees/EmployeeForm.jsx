import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import { createEmployee, updateEmployee } from '../../lib/employeeData.js';

const ROLES = [
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(employee?.name ?? '');
    setRole(employee?.role ?? '');
    setError('');
  }, [open, employee]);

  if (!open) return null;

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
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Select role</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
        >
          {saving ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
        </button>
      </form>
    </Sheet>
  );
}
