import { useEffect, useState } from 'react';
import Field, { inputClass } from '../../components/Field.jsx';
import { fetchProjects } from '../../lib/ledgerData.js';
import { createWorkLog } from '../../lib/employeeData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function WorkLogForm({ employeeId, concernId, isProjectBased, onSaved }) {
  const [projectId, setProjectId] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [workDate, setWorkDate] = useState(todayStr());
  const [paid, setPaid] = useState(false);
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (concernId) fetchProjects(concernId).then(setProjects).catch((e) => setError(e.message));
  }, [concernId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!taskDescription.trim()) return setError('Description is required.');
    const amt = Number(amount);
    if (!(amt > 0)) return setError('Amount must be greater than 0.');

    setSaving(true);
    try {
      await createWorkLog({
        employee_id: employeeId,
        project_id: projectId || null,
        task_description: taskDescription.trim(),
        amount: amt,
        work_date: workDate,
        paid,
      });
      setTaskDescription('');
      setAmount('');
      setPaid(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-800 rounded-lg p-4 bg-surfaceRaised">
      {isProjectBased && (
        <Field label="Project">
          <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label={isProjectBased ? 'Task' : 'Description'} required hint={!isProjectBased ? 'e.g. Salary — July 2026' : null}>
        <input className={inputClass} value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" required>
          <input type="number" min="0" step="0.01" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date" required>
          <input type="date" className={inputClass} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
        </Field>
      </div>

      <label className="flex items-center gap-2 mb-3 text-sm text-gray-300">
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
        Already paid
      </label>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-50"
      >
        {saving ? 'Adding…' : '+ Log entry'}
      </button>
    </form>
  );
}
