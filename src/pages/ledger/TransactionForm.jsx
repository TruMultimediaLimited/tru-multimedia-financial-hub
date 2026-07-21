import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import {
  createTransaction,
  updateTransaction,
  fetchClients,
  fetchVendors,
  fetchProjects,
  createClient,
  createVendor,
} from '../../lib/ledgerData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TransactionForm({ open, onClose, onSaved, defaultType = 'income', transaction = null }) {
  const { concerns, selectedConcernId } = useConcern();
  const realConcerns = concerns.filter((c) => c.parent_concern_id !== null);

  const [concernId, setConcernId] = useState('');
  const [type, setType] = useState(defaultType);
  const [partyId, setPartyId] = useState('');
  const [category, setCategory] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');

  const [clients, setClients] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);

  const [showNewParty, setShowNewParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [savingParty, setSavingParty] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchClients().then(setClients).catch((e) => setError(e.message));
    fetchVendors().then(setVendors).catch((e) => setError(e.message));

    if (transaction) {
      setConcernId(transaction.concern_id ?? '');
      setType(transaction.type);
      setPartyId(transaction.client_id ?? transaction.vendor_id ?? '');
      setCategory(transaction.category ?? '');
      setTotalAmount(String(transaction.total_amount ?? ''));
      setDate(transaction.transaction_date ?? todayStr());
      setDescription(transaction.description ?? '');
      setProjectId(transaction.project_id ?? '');
    } else {
      setConcernId(selectedConcernId ?? '');
      setType(defaultType);
      setPartyId('');
      setCategory('');
      setTotalAmount('');
      setDate(todayStr());
      setDescription('');
      setProjectId('');
    }
    setShowNewParty(false);
    setError('');
  }, [open, transaction, defaultType, selectedConcernId]);

  useEffect(() => {
    if (!concernId) {
      setProjects([]);
      return;
    }
    fetchProjects(concernId).then(setProjects).catch((e) => setError(e.message));
  }, [concernId]);

  if (!open) return null;

  const partyOptions = type === 'income' ? clients : vendors;
  const partyLabel = type === 'income' ? 'Client' : 'Vendor';

  async function handleSaveNewParty() {
    if (!newPartyName.trim()) return;
    setSavingParty(true);
    setError('');
    try {
      const row =
        type === 'income'
          ? await createClient({ name: newPartyName.trim(), phone: newPartyPhone.trim() || null })
          : await createVendor({ name: newPartyName.trim(), phone: newPartyPhone.trim() || null });

      if (type === 'income') setClients((prev) => [...prev, row]);
      else setVendors((prev) => [...prev, row]);

      setPartyId(row.id);
      setShowNewParty(false);
      setNewPartyName('');
      setNewPartyPhone('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingParty(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!concernId) return setError('Concern is required.');
    if (!partyId) return setError(`${partyLabel} is required.`);
    const amount = Number(totalAmount);
    if (!(amount > 0)) return setError('Total amount must be greater than 0.');

    const payload = {
      concern_id: concernId,
      project_id: projectId || null,
      client_id: type === 'income' ? partyId : null,
      vendor_id: type === 'expense' ? partyId : null,
      type,
      category: category.trim() || null,
      total_amount: amount,
      description: description.trim() || null,
      transaction_date: date,
    };

    setSaving(true);
    try {
      if (transaction) {
        await updateTransaction(transaction.id, payload);
      } else {
        await createTransaction(payload);
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
    <Sheet open={open} onClose={onClose} title={transaction ? 'Edit transaction' : `Add ${type}`}>
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

        {!transaction && (
          <Field label="Type" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('income');
                  setPartyId('');
                }}
                className={`py-2 rounded-md text-sm border ${
                  type === 'income' ? 'bg-income/15 border-income text-income' : 'border-gray-700 text-gray-400'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('expense');
                  setPartyId('');
                }}
                className={`py-2 rounded-md text-sm border ${
                  type === 'expense' ? 'bg-expense/15 border-expense text-expense' : 'border-gray-700 text-gray-400'
                }`}
              >
                Expense
              </button>
            </div>
          </Field>
        )}

        <Field label={partyLabel} required>
          {!showNewParty ? (
            <div className="flex gap-2">
              <select className={inputClass} value={partyId} onChange={(e) => setPartyId(e.target.value)}>
                <option value="">Select {partyLabel.toLowerCase()}</option>
                {partyOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewParty(true)}
                className="shrink-0 px-3 rounded-md text-sm border border-gray-700 text-gray-300 hover:text-gray-100"
              >
                + New
              </button>
            </div>
          ) : (
            <div className="border border-gray-700 rounded-md p-3 space-y-2">
              <input
                className={inputClass}
                placeholder={`${partyLabel} name`}
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Phone (optional)"
                value={newPartyPhone}
                onChange={(e) => setNewPartyPhone(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingParty}
                  onClick={handleSaveNewParty}
                  className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-900 disabled:opacity-50"
                >
                  {savingParty ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewParty(false)}
                  className="px-3 py-1.5 rounded-md text-sm border border-gray-700 text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Field>

        <Field label="Category" hint="e.g. Photography, Equipment, Payroll">
          <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>

        <Field label="Total amount" required>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
        </Field>

        <Field label="Date" required>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Description">
          <textarea
            className={inputClass}
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Project" hint="Optional">
          <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : transaction ? 'Save changes' : `Save ${type}`}
        </button>
      </form>
    </Sheet>
  );
}
