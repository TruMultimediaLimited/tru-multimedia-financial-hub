import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import {
  createTransaction,
  updateTransaction,
  fetchClients,
  fetchProjects,
  fetchEmployees,
  createClient,
} from '../../lib/ledgerData.js';
import { createEmployee } from '../../lib/employeeData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

const EXPENSE_CATEGORIES = [
  'Salary/Payroll',
  'Office Rent',
  'Electricity Bill',
  'Equipment',
  'Food & Refreshments',
  'Guest Entertainment',
  'Transport',
  'Internet & Phone',
  'Maintenance',
  'Other',
];

export default function TransactionForm({ open, onClose, onSaved, defaultType = 'income', transaction = null }) {
  const { concerns, selectedConcernId } = useConcern();
  const realConcerns = concerns;

  const [concernId, setConcernId] = useState('');
  const [type, setType] = useState(defaultType);
  const [clientId, setClientId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [category, setCategory] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');

  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [savingEmployee, setSavingEmployee] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchClients().then(setClients).catch((e) => setError(e.message));
    fetchEmployees(null).then(setEmployees).catch((e) => setError(e.message));

    if (transaction) {
      setConcernId(transaction.concern_id ?? '');
      setType(transaction.type);
      setClientId(transaction.client_id ?? '');
      setEmployeeId(transaction.employee_id ?? '');
      setCategory(transaction.category ?? '');
      setTotalAmount(String(transaction.total_amount ?? ''));
      setDate(transaction.transaction_date ?? todayStr());
      setDescription(transaction.description ?? '');
      setProjectId(transaction.project_id ?? '');
    } else {
      setConcernId(selectedConcernId ?? '');
      setType(defaultType);
      setClientId('');
      setEmployeeId('');
      setCategory('');
      setTotalAmount('');
      setDate(todayStr());
      setDescription('');
      setProjectId('');
    }
    setShowNewClient(false);
    setShowNewEmployee(false);
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

  async function handleSaveNewClient() {
    if (!newClientName.trim()) return;
    setSavingClient(true);
    setError('');
    try {
      const row = await createClient({ name: newClientName.trim(), phone: newClientPhone.trim() || null });
      setClients((prev) => [...prev, row]);
      setClientId(row.id);
      setShowNewClient(false);
      setNewClientName('');
      setNewClientPhone('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingClient(false);
    }
  }

  async function handleSaveNewEmployee() {
    if (!newEmployeeName.trim()) return;
    setSavingEmployee(true);
    setError('');
    try {
      const parentConcern = concerns.find((c) => c.parent_concern_id === null);
      const row = await createEmployee({ concern_id: parentConcern?.id, name: newEmployeeName.trim() });
      setEmployees((prev) => [...prev, row]);
      setEmployeeId(row.id);
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

    if (!concernId) return setError('Concern is required.');
    if (type === 'income' && !clientId) return setError('Client is required.');
    const amount = Number(totalAmount);
    if (!(amount > 0)) return setError('Total amount must be greater than 0.');

    const payload = {
      concern_id: concernId,
      project_id: projectId || null,
      client_id: type === 'income' ? clientId : null,
      employee_id: type === 'expense' ? employeeId || null : null,
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
                onClick={() => setType('income')}
                className={`py-2 rounded-md text-sm border ${
                  type === 'income' ? 'bg-income/15 border-income text-income' : 'border-gray-300 text-gray-500'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 rounded-md text-sm border ${
                  type === 'expense' ? 'bg-expense/15 border-expense text-expense' : 'border-gray-300 text-gray-500'
                }`}
              >
                Expense
              </button>
            </div>
          </Field>
        )}

        {type === 'income' ? (
          <Field label="Client" required>
            {!showNewClient ? (
              <div className="flex gap-2">
                <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewClient(true)}
                  className="shrink-0 px-3 rounded-md text-sm border border-gray-300 text-gray-700 hover:text-gray-900"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-md p-3 space-y-2">
                <input
                  className={inputClass}
                  placeholder="Client name"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Phone (optional)"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={savingClient}
                    onClick={handleSaveNewClient}
                    className="px-3 py-1.5 rounded-md text-sm bg-gray-900 text-white disabled:opacity-50"
                  >
                    {savingClient ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewClient(false)}
                    className="px-3 py-1.5 rounded-md text-sm border border-gray-300 text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Field>
        ) : (
          <Field label="Employee" hint="Optional — leave blank for expenses not tied to a specific person">
            {!showNewEmployee ? (
              <div className="flex gap-2">
                <select className={inputClass} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                  <option value="">No employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewEmployee(true)}
                  className="shrink-0 px-3 rounded-md text-sm border border-gray-300 text-gray-700 hover:text-gray-900"
                >
                  + New
                </button>
              </div>
            ) : (
              <div className="border border-gray-300 rounded-md p-3 space-y-2">
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
                    className="px-3 py-1.5 rounded-md text-sm bg-gray-900 text-white disabled:opacity-50"
                  >
                    {savingEmployee ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewEmployee(false)}
                    className="px-3 py-1.5 rounded-md text-sm border border-gray-300 text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Field>
        )}

        <Field label="Category">
          {type === 'expense' ? (
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select category</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Photography" />
          )}
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
          className="w-full py-2.5 rounded-md text-sm font-medium bg-gray-900 text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : transaction ? 'Save changes' : `Save ${type}`}
        </button>
      </form>
    </Sheet>
  );
}
