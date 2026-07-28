import { useEffect, useState } from 'react';
import BackButton from '../components/BackButton.jsx';
import PageTitle from '../components/PageTitle.jsx';
import Sheet from '../components/Sheet.jsx';
import Field, { inputClass } from '../components/Field.jsx';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { formatMoney, formatDate } from '../lib/format.js';
import {
  fetchOpeningDues,
  createOpeningDue,
  deleteOpeningDue,
  fetchOpeningDuePayments,
  addOpeningDuePayment,
} from '../lib/openingDueData.js';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function OldDues() {
  const [dues, setDues] = useState({ receivables: [], payables: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOpeningDues()
      .then((rows) => !cancelled && setDues(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteOpeningDue(id);
      if (expandedId === id) setExpandedId(null);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <BackButton />
      <div className="flex items-center justify-between gap-2 mb-2">
        <PageTitle colorClass="bg-slate-200 border-slate-300 text-slate-700">Old Dues</PageTitle>
        <button
          onClick={() => setFormOpen(true)}
          className="h-8 inline-flex items-center justify-center rounded-full px-3 text-xs font-bold bg-primary/15 text-primary border border-primary/30"
        >
          + New entry
        </button>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Pre-cutover balances only — separate from Income/Expense/Projects, never affects the Dashboard or any report.
      </p>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && (
        <div className="space-y-4">
          <OldDueSection
            title="Receivable"
            colorKey="client"
            rows={dues.receivables}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onDelete={handleDelete}
            onPaid={refresh}
          />
          <OldDueSection
            title="Payable"
            colorKey="project"
            rows={dues.payables}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onDelete={handleDelete}
            onPaid={refresh}
          />
        </div>
      )}

      <NewOpeningDueForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} />
    </div>
  );
}

function OldDueSection({ title, colorKey, rows, expandedId, setExpandedId, onDelete, onPaid }) {
  const color = ENTITY_COLORS[colorKey];
  return (
    <div>
      <h2 className="text-sm font-medium text-slate-700 mb-2">{title}</h2>
      {rows.length === 0 && <p className="text-sm text-slate-500">None.</p>}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className={`${color.bg} border border-slate-200 border-l-4 ${color.border} rounded-2xl shadow-card p-4`}>
            <div
              onClick={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="text-slate-900 font-medium">{r.partyName}</span>
              <div className="text-right">
                <div className="text-sm text-due">{formatMoney(r.remainingAmount)}</div>
                <span className="text-xs text-primary underline underline-offset-2">
                  {expandedId === r.id ? 'Hide' : 'View more'}
                </span>
              </div>
            </div>
            {expandedId === r.id && <OldDueDetail dueEntry={r} onDelete={onDelete} onPaid={onPaid} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function OldDueDetail({ dueEntry, onDelete, onPaid }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOpeningDuePayments(dueEntry.id)
      .then((rows) => !cancelled && setPayments(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [dueEntry.id, reloadKey]);

  async function handleAddPayment(e) {
    e.preventDefault();
    setError('');
    const amt = Number(amount);
    if (!(amt > 0)) return setError('Amount must be greater than 0.');
    if (amt > dueEntry.remainingAmount) return setError(`Amount exceeds the remaining due (${formatMoney(dueEntry.remainingAmount)}).`);

    setSaving(true);
    try {
      await addOpeningDuePayment({ opening_due_id: dueEntry.id, amount: amt, payment_date: date, note: note.trim() || null });
      setAmount('');
      setNote('');
      setReloadKey((k) => k + 1);
      onPaid();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>
          Opening {formatMoney(dueEntry.openingAmount)} · Paid {formatMoney(dueEntry.paidAmount)}
        </span>
        <button onClick={() => onDelete(dueEntry.id)} className="text-expense">
          Delete entry
        </button>
      </div>

      {loading && <p className="text-xs text-slate-500 mb-2">Loading…</p>}
      {!loading && payments.length === 0 && <p className="text-xs text-slate-500 mb-2">No payments logged yet.</p>}
      {!loading && payments.length > 0 && (
        <div className="space-y-1 mb-3">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-surfaceRaised rounded-xl px-3 py-2">
              <span className="text-xs text-slate-600">
                {formatDate(p.payment_date)}
                {p.note && ` · ${p.note}`}
              </span>
              <span className="text-xs text-slate-900">{formatMoney(p.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {dueEntry.remainingAmount > 0 && (
        <form onSubmit={handleAddPayment} className="flex items-end gap-2">
          <div className="flex-1">
            <input
              type="number"
              min="0"
              max={dueEntry.remainingAmount}
              step="0.01"
              placeholder="Amount"
              className={inputClass}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="h-11 px-4 rounded-xl text-xs font-medium bg-primary text-white hover:bg-primaryHover disabled:opacity-50"
          >
            {saving ? 'Adding…' : '+ Add'}
          </button>
        </form>
      )}
      {error && <p className="text-xs text-expense mt-2">{error}</p>}
    </div>
  );
}

function NewOpeningDueForm({ open, onClose, onSaved }) {
  const [partyName, setPartyName] = useState('');
  const [type, setType] = useState('receivable');
  const [openingAmount, setOpeningAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPartyName('');
    setType('receivable');
    setOpeningAmount('');
    setNote('');
    setError('');
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!partyName.trim()) return setError('Name is required.');
    if (!(Number(openingAmount) > 0)) return setError('Amount must be greater than 0.');

    setSaving(true);
    setError('');
    try {
      await createOpeningDue({
        party_name: partyName.trim(),
        type,
        opening_amount: Number(openingAmount),
        note: note.trim() || null,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="New old due">
      <form onSubmit={handleSubmit}>
        <Field label="Type" required>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('receivable')}
              className={`py-2 rounded-xl text-sm border ${
                type === 'receivable' ? 'bg-income/15 border-income text-income' : 'border-slate-300 text-slate-500'
              }`}
            >
              Receivable — they owe us
            </button>
            <button
              type="button"
              onClick={() => setType('payable')}
              className={`py-2 rounded-xl text-sm border ${
                type === 'payable' ? 'bg-expense/15 border-expense text-expense' : 'border-slate-300 text-slate-500'
              }`}
            >
              Payable — we owe them
            </button>
          </div>
        </Field>

        <Field label="Name">
          <input
            className={inputClass}
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            placeholder="Client or employee name"
          />
        </Field>

        <Field label="Amount" required>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
          />
        </Field>

        <Field label="Note" hint="Optional">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {error && <p className="text-sm text-expense mb-3">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Add entry'}
        </button>
      </form>
    </Sheet>
  );
}
