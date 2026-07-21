import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import { fetchClients } from '../../lib/ledgerData.js';
import { createProject, updateProject, fetchProjectCategories, createProjectCategory } from '../../lib/projectData.js';

export default function ProjectForm({ open, onClose, onSaved, project = null, defaultClientId = null }) {
  const { concerns } = useConcern();
  const realConcerns = concerns;

  const [concernId, setConcernId] = useState('');
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [status, setStatus] = useState('running');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchClients().then(setClients).catch((e) => setError(e.message));
    fetchProjectCategories().then(setCategories).catch((e) => setError(e.message));
    setConcernId(project?.concern_id ?? '');
    setClientId(project?.client_id ?? defaultClientId ?? '');
    setTitle(project?.title ?? '');
    setCategoryId(project?.category_id ?? '');
    setContractValue(project?.contract_value != null ? String(project.contract_value) : '');
    setStatus(project?.status ?? 'running');
    setStartDate(project?.start_date ?? '');
    setEndDate(project?.end_date ?? '');
    setShowNewCategory(false);
    setError('');
  }, [open, project, defaultClientId]);

  if (!open) return null;

  async function handleSaveNewCategory() {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    setError('');
    try {
      const row = await createProjectCategory(newCategoryName.trim());
      setCategories((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(row.id);
      setShowNewCategory(false);
      setNewCategoryName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!concernId) return setError('Concern is required.');
    if (!title.trim()) return setError('Title is required.');
    if (!categoryId) return setError('Category is required.');

    const payload = {
      concern_id: concernId,
      client_id: clientId || null,
      title: title.trim(),
      category_id: categoryId,
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

        <Field label="Category" required>
          {!showNewCategory ? (
            <div className="flex gap-2">
              <select className={inputClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCategory(true)}
                className="shrink-0 px-3 rounded-md text-sm border border-slate-300 text-slate-700 hover:text-slate-900"
              >
                + New
              </button>
            </div>
          ) : (
            <div className="border border-slate-300 rounded-md p-3 space-y-2">
              <input
                className={inputClass}
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingCategory}
                  onClick={handleSaveNewCategory}
                  className="px-3 py-1.5 rounded-md text-sm bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
                >
                  {savingCategory ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(false)}
                  className="px-3 py-1.5 rounded-md text-sm border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Field>

        <Field label="Amount">
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
            <option value="running">Running</option>
            <option value="hold">Hold</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
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
          className="w-full py-2.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
        >
          {saving ? 'Saving…' : project ? 'Save changes' : 'Add project'}
        </button>
      </form>
    </Sheet>
  );
}
