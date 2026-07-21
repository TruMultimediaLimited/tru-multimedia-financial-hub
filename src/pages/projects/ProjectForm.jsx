import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import { fetchClients } from '../../lib/ledgerData.js';
import { createProject, updateProject } from '../../lib/projectData.js';

export default function ProjectForm({ open, onClose, onSaved, project = null }) {
  const { concerns } = useConcern();
  const realConcerns = concerns;

  const [concernId, setConcernId] = useState('');
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [status, setStatus] = useState('active');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchClients().then(setClients).catch((e) => setError(e.message));
    setConcernId(project?.concern_id ?? '');
    setClientId(project?.client_id ?? '');
    setTitle(project?.title ?? '');
    setContractValue(project?.contract_value != null ? String(project.contract_value) : '');
    setStatus(project?.status ?? 'active');
    setStartDate(project?.start_date ?? '');
    setEndDate(project?.end_date ?? '');
    setError('');
  }, [open, project]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!concernId) return setError('Concern is required.');
    if (!title.trim()) return setError('Title is required.');

    const payload = {
      concern_id: concernId,
      client_id: clientId || null,
      title: title.trim(),
      contract_value: contractValue ? Number(contractValue) : 0,
      status,
      start_date: startDate || null,
      end_date: endDate || null,
    };

    setSaving(true);
    setError('');
    try {
      if (project) await updateProject(project.id, payload);
      else await createProject(payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={project ? 'Edit project' : 'New project'}>
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

        <Field label="Client" hint="Optional">
          <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Title" required>
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>

        <Field label="Contract value">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={contractValue}
            onChange={(e) => setContractValue(e.target.value)}
          />
        </Field>

        <Field label="Status" required>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="stalled">Stalled</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="End date">
            <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : project ? 'Save changes' : 'Add project'}
        </button>
      </form>
    </Sheet>
  );
}
