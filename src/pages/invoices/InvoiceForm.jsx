import { useEffect, useState } from 'react';
import Sheet from '../../components/Sheet.jsx';
import Field, { inputClass } from '../../components/Field.jsx';
import { fetchClients, fetchTransactions } from '../../lib/ledgerData.js';
import { fetchProjectsForClient } from '../../lib/projectData.js';
import { createInvoice, updateInvoice, fetchNextInvoiceNumber } from '../../lib/invoiceData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function InvoiceForm({ open, onClose, onSaved, invoice = null }) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [refType, setRefType] = useState('transaction');
  const [transactionId, setTransactionId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [issuedDate, setIssuedDate] = useState(todayStr());
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const [clients, setClients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchClients().then(setClients).catch((e) => setError(e.message));

    if (invoice) {
      setInvoiceNumber(invoice.invoice_number);
      setClientId(invoice.client_id);
      setRefType(invoice.transaction_id ? 'transaction' : 'project');
      setTransactionId(invoice.transaction_id ?? '');
      setProjectId(invoice.project_id ?? '');
      setIssuedDate(invoice.issued_date ?? todayStr());
      setDueDate(invoice.due_date ?? '');
      setNotes(invoice.notes ?? '');
    } else {
      fetchNextInvoiceNumber().then(setInvoiceNumber).catch((e) => setError(e.message));
      setClientId('');
      setRefType('transaction');
      setTransactionId('');
      setProjectId('');
      setIssuedDate(todayStr());
      setDueDate('');
      setNotes('');
    }
    setError('');
  }, [open, invoice]);

  useEffect(() => {
    if (!clientId) {
      setTransactions([]);
      setProjects([]);
      return;
    }
    fetchTransactions({ clientId, type: 'income' }).then(setTransactions).catch((e) => setError(e.message));
    fetchProjectsForClient(clientId).then(setProjects).catch((e) => setError(e.message));
  }, [clientId]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!invoiceNumber.trim()) return setError('Invoice number is required.');
    if (!clientId) return setError('Client is required.');
    if (refType === 'transaction' && !transactionId) return setError('Select a transaction to invoice.');
    if (refType === 'project' && !projectId) return setError('Select a project to invoice.');

    const payload = {
      invoice_number: invoiceNumber.trim(),
      client_id: clientId,
      transaction_id: refType === 'transaction' ? transactionId : null,
      project_id: refType === 'project' ? projectId : null,
      issued_date: issuedDate,
      due_date: dueDate || null,
      notes: notes.trim() || null,
    };

    setSaving(true);
    try {
      if (invoice) await updateInvoice(invoice.id, payload);
      else await createInvoice(payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={invoice ? 'Edit invoice' : 'New invoice'}>
      <form onSubmit={handleSubmit}>
        <Field label="Invoice number" required>
          <input className={inputClass} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </Field>

        <Field label="Client" required>
          <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Bill for" required>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRefType('transaction')}
              className={`py-2 rounded-md text-sm border ${refType === 'transaction' ? 'bg-surfaceRaised border-gray-500 text-gray-100' : 'border-gray-700 text-gray-400'}`}
            >
              A transaction
            </button>
            <button
              type="button"
              onClick={() => setRefType('project')}
              className={`py-2 rounded-md text-sm border ${refType === 'project' ? 'bg-surfaceRaised border-gray-500 text-gray-100' : 'border-gray-700 text-gray-400'}`}
            >
              A project
            </button>
          </div>
        </Field>

        {refType === 'transaction' ? (
          <Field label="Transaction" required hint={!clientId ? 'Pick a client first' : null}>
            <select className={inputClass} value={transactionId} onChange={(e) => setTransactionId(e.target.value)}>
              <option value="">Select transaction</option>
              {transactions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.category || 'Uncategorized'} — {t.transaction_date}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Project" required hint={!clientId ? 'Pick a client first' : null}>
            <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Issued date" required>
            <input type="date" className={inputClass} value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
          </Field>
          <Field label="Due date">
            <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>

        <Field label="Notes">
          <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 rounded-md text-sm font-medium bg-gray-100 text-gray-900 disabled:opacity-50"
        >
          {saving ? 'Saving…' : invoice ? 'Save changes' : 'Create invoice'}
        </button>
      </form>
    </Sheet>
  );
}
