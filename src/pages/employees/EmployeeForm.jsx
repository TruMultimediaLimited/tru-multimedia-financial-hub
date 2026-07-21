import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import { createEmployee, updateEmployee } from '../../lib/employeeData.js';

export default function EmployeeForm({ open, onClose, onSaved, employee = null }) {
  const { concerns } = useConcern();
  const realConcerns = concerns.filter((c) => c.parent_concern_id !== null);

  const [concernId, setConcernId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [type, setType] = useState('fixed');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setConcernId(employee?.concern_id ?? '');
    setName(employee?.name ?? '');
    setRole(employee?.role ?? '');
    setType(employee?.type ?? 'fixed');
    setMonthlySalary(employee?.monthly_salary != null ? String(employee.monthly_salary) : '');
    setStatus(employee?.status ?? 'active');
    setError('');
  }, [open, employee]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!concernId) return setError('Concern is required.');
    if (!name.trim()) return setError('Name is required.');

    const payload = {
      concern_id: concernId,
      name: name.trim(),
      role: role.trim() || null,
      type,
      monthly_salary: monthlySalary ? Number(monthlySalary) : null,
      status,
    };

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
        <Field label="Concern" required>
          <select className={inputClass} value={concernId} onChange={(e) => setConcernId(e.target.value)}>
            <option value="">Select concern</option>
            {realConcerns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Name" required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="Role">
          <input className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>

        <Field label="Type" required>
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="fixed">Fixed</option>
            <option value="remote">Remote</option>
            <option value="project_based">Project-based</option>
          </select>
        </Field>

        <Field label="Monthly salary" hint={type === 'project_based' ? 'Usually left blank — paid per project instead' : 'Optional'}>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={monthlySalary}
            onChange={(e) => setMonthlySalary(e.target.value)}
          />
        </Field>

        <Field label="Status" required>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : employee ? 'Save changes' : 'Add employee'}
        </button>
      </form>
    </Sheet>
  );
}
