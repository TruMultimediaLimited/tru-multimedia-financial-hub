import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { useConcern } from '../../context/ConcernContext.jsx';
import { supabase } from '../../lib/supabase.js';
import {
  createTransaction,
  updateTransaction,
  addPayment,
  fetchClients,
  fetchProjects,
  fetchEmployees,
  fetchProjectIncomeTotal,
  createClient,
} from '../../lib/ledgerData.js';
import { createEmployee } from '../../lib/employeeData.js';
import { fetchOwners } from '../../lib/ownerData.js';
import { fetchProjectsWithTotals, syncProjectCompletion } from '../../lib/projectData.js';
import { formatMoney } from '../../lib/format.js';

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

function ClientPicker({
  clientId,
  setClientId,
  clients,
  showNewClient,
  setShowNewClient,
  newClientName,
  setNewClientName,
  newClientPhone,
  setNewClientPhone,
  savingClient,
  onSave,
}) {
  if (showNewClient) {
    return (
      <div className="border border-slate-300 rounded-md p-3 space-y-2">
        <input className={inputClass} placeholder="Client name" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
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
            onClick={onSave}
            className="px-3 py-1.5 rounded-md text-sm bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
          >
            {savingClient ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setShowNewClient(false)}
            className="px-3 py-1.5 rounded-md text-sm border border-slate-300 text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }
  return (
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
        className="shrink-0 px-3 rounded-md text-sm border border-slate-300 text-slate-700 hover:text-slate-900"
      >
        + New
      </button>
    </div>
  );
}

function NewEmployeeMiniForm({ name, setName, saving, onSave, onCancel }) {
  return (
    <div className="border border-slate-300 rounded-md p-3 space-y-2">
      <input className={inputClass} placeholder="Employee name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="px-3 py-1.5 rounded-md text-sm bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-md text-sm border border-slate-300 text-slate-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function TransactionForm({ open, onClose, onSaved, defaultType = 'income', transaction = null, fixedType = null }) {
  const navigate = useNavigate();
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

  // New-income-only: this project belongs to the selected client, and its
  // category auto-fills below rather than being typed freely — a project
  // is the fixed unit of work, so the income under it should read as
  // "this project's income," not a loose transaction.
  const [clientProjects, setClientProjects] = useState([]);
  const [loadingClientProjects, setLoadingClientProjects] = useState(false);
  const [channel, setChannel] = useState('bkash');
  const [handledBy, setHandledBy] = useState('');
  const [owners, setOwners] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  const [showNewEmployee, setShowNewEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [savingEmployee, setSavingEmployee] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // For a NEW income entry, a project is required and its category is
  // auto-filled — a fundamentally different (and simpler) form than
  // editing, or an expense, both of which keep the free-form fields below.
  const isNewIncome = !transaction && type === 'income';

  useEffect(() => {
    if (!open) return;
    fetchClients().then(setClients).catch((e) => setError(e.message));
    fetchEmployees(null).then(setEmployees).catch((e) => setError(e.message));
    fetchOwners().then(setOwners).catch((e) => setError(e.message));
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user ?? null));

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
    setChannel('bkash');
    setHandledBy('');
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

  useEffect(() => {
    if (!isNewIncome || !concernId || !clientId) {
      setClientProjects([]);
      return;
    }
    let cancelled = false;
    setLoadingClientProjects(true);
    fetchProjectsWithTotals({ concernId, clientId })
      .then((rows) => !cancelled && setClientProjects(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoadingClientProjects(false));
    return () => {
      cancelled = true;
    };
  }, [isNewIncome, concernId, clientId]);

  if (!open) return null;

  const selectedProject = clientProjects.find((p) => p.id === projectId) ?? null;

  async function handleSaveNewClient() {
    if (!newClientName.trim()) return;
    setSavingClient(true);
    setError('');
    try {
      const row = await createClient({
        name: newClientName.trim(),
        phone: newClientPhone.trim() || null,
        concernIds: concernId ? [concernId] : [],
      });
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
      if (isNewIncome) setHandledBy(`employee:${row.id}`);
      else setEmployeeId(row.id);
      setShowNewEmployee(false);
      setNewEmployeeName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingEmployee(false);
    }
  }

  async function handleIncomeCreate(e) {
    e.preventDefault();
    setError('');

    if (!concernId) return setError('Concern is required.');
    if (!clientId) return setError('Client is required.');
    if (!projectId) return setError('Project is required.');
    const amount = Number(totalAmount);
    if (!(amount > 0)) return setError('Amount must be greater than 0.');
    if (!channel) return setError('Channel is required.');
    if (!handledBy) return setError('Handled by is required.');

    if (selectedProject && Number(selectedProject.contract_value) > 0) {
      try {
        const existing = await fetchProjectIncomeTotal(projectId, null);
        const remaining = Number(selectedProject.contract_value) - existing;
        if (amount > remaining) {
          return setError(`Amount exceeds this project's remaining value (${formatMoney(Math.max(remaining, 0))}).`);
        }
      } catch (err) {
        return setError(err.message);
      }
    }

    setSaving(true);
    try {
      const txn = await createTransaction({
        concern_id: concernId,
        project_id: projectId,
        client_id: clientId,
        employee_id: null,
        type: 'income',
        category: selectedProject?.project_categories?.name ?? null,
        total_amount: amount,
        description: description.trim() || null,
        transaction_date: date,
      });
      await addPayment({
        transaction_id: txn.id,
        amount,
        channel,
        payment_date: date,
        note: null,
        handled_by_employee_id: handledBy.startsWith('employee:') ? handledBy.split(':')[1] : null,
        handled_by_user_id: handledBy === 'self' ? currentUser?.id ?? null : null,
        handled_by_owner_id: handledBy.startsWith('owner:') ? handledBy.split(':')[1] : null,
      });
      await syncProjectCompletion(projectId);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenericSubmit(e) {
    e.preventDefault();
    setError('');

    if (!concernId) return setError('Concern is required.');
    if (type === 'income' && !clientId) return setError('Client is required.');
    const amount = Number(totalAmount);
    if (!(amount > 0)) return setError('Total amount must be greater than 0.');

    if (type === 'income' && projectId) {
      const project = projects.find((p) => p.id === projectId);
      if (project && Number(project.contract_value) > 0) {
        try {
          const existing = await fetchProjectIncomeTotal(projectId, transaction?.id ?? null);
          const remaining = Number(project.contract_value) - existing;
          if (amount > remaining) {
            return setError(`Amount exceeds this project's remaining value (${formatMoney(Math.max(remaining, 0))}).`);
          }
        } catch (err) {
          return setError(err.message);
        }
      }
    }

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
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const handleSubmit = isNewIncome ? handleIncomeCreate : handleGenericSubmit;

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

        {!transaction && !fixedType && (
          <Field label="Type" required>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2 rounded-md text-sm border ${
                  type === 'income' ? 'bg-income/15 border-income text-income' : 'border-slate-300 text-slate-500'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2 rounded-md text-sm border ${
                  type === 'expense' ? 'bg-expense/15 border-expense text-expense' : 'border-slate-300 text-slate-500'
                }`}
              >
                Expense
              </button>
            </div>
          </Field>
        )}

        {isNewIncome ? (
          <>
            <Field label="Client" required>
              <ClientPicker
                clientId={clientId}
                setClientId={setClientId}
                clients={clients}
                showNewClient={showNewClient}
                setShowNewClient={setShowNewClient}
                newClientName={newClientName}
                setNewClientName={setNewClientName}
                newClientPhone={newClientPhone}
                setNewClientPhone={setNewClientPhone}
                savingClient={savingClient}
                onSave={handleSaveNewClient}
              />
            </Field>

            <Field label="Project" required>
              {!clientId ? (
                <p className="text-xs text-slate-500">Select a client first.</p>
              ) : loadingClientProjects ? (
                <p className="text-xs text-slate-500">Loading projects…</p>
              ) : clientProjects.length === 0 ? (
                <p className="text-xs text-slate-500">
                  This client has no projects yet.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/clients/${clientId}`);
                    }}
                    className="underline text-slate-700"
                  >
                    Add one from their page
                  </button>
                  .
                </p>
              ) : (
                <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">Select project</option>
                  {clientProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {selectedProject && (
              <Field label="Category">
                <input className={inputClass} value={selectedProject.project_categories?.name ?? '—'} disabled />
              </Field>
            )}

            <Field label="Amount" required>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </Field>

            <Field label="Channel" required>
              <select className={inputClass} value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Handled by" required>
              {!showNewEmployee ? (
                <div className="flex gap-2">
                  <select className={inputClass} value={handledBy} onChange={(e) => setHandledBy(e.target.value)}>
                    <option value="">Select</option>
                    {currentUser && <option value="self">Myself ({currentUser.email})</option>}
                    {owners.map((o) => (
                      <option key={o.id} value={`owner:${o.id}`}>
                        {o.name} (Owner)
                      </option>
                    ))}
                    {employees.map((emp) => (
                      <option key={emp.id} value={`employee:${emp.id}`}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewEmployee(true)}
                    className="shrink-0 px-3 rounded-md text-sm border border-slate-300 text-slate-700 hover:text-slate-900"
                  >
                    + New
                  </button>
                </div>
              ) : (
                <NewEmployeeMiniForm
                  name={newEmployeeName}
                  setName={setNewEmployeeName}
                  saving={savingEmployee}
                  onSave={handleSaveNewEmployee}
                  onCancel={() => setShowNewEmployee(false)}
                />
              )}
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
          </>
        ) : (
          <>
            {type === 'income' ? (
              <Field label="Client" required>
                <ClientPicker
                  clientId={clientId}
                  setClientId={setClientId}
                  clients={clients}
                  showNewClient={showNewClient}
                  setShowNewClient={setShowNewClient}
                  newClientName={newClientName}
                  setNewClientName={setNewClientName}
                  newClientPhone={newClientPhone}
                  setNewClientPhone={setNewClientPhone}
                  savingClient={savingClient}
                  onSave={handleSaveNewClient}
                />
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
                      className="shrink-0 px-3 rounded-md text-sm border border-slate-300 text-slate-700 hover:text-slate-900"
                    >
                      + New
                    </button>
                  </div>
                ) : (
                  <NewEmployeeMiniForm
                    name={newEmployeeName}
                    setName={setNewEmployeeName}
                    saving={savingEmployee}
                    onSave={handleSaveNewEmployee}
                    onCancel={() => setShowNewEmployee(false)}
                  />
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
          </>
        )}

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-md text-sm font-medium bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
        >
          {saving ? 'Saving…' : transaction ? 'Save changes' : `Save ${type}`}
        </button>
      </form>
    </Sheet>
  );
}
