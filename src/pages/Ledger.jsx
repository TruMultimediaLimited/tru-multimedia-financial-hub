import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConcern } from '../context/ConcernContext.jsx';
import { supabase } from '../lib/supabase.js';
import Badge from '../components/Badge.jsx';
import { inputClass } from '../components/Field.jsx';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS } from '../lib/format.js';
import { fetchTransactions, fetchProjects, fetchEmployees, computeBalances } from '../lib/ledgerData.js';
import TransactionForm from './ledger/TransactionForm.jsx';

export default function Ledger() {
  const navigate = useNavigate();
  const { selectedConcernId, concerns } = useConcern();
  const realConcerns = concerns;

  const [concernFilter, setConcernFilter] = useState(selectedConcernId ?? '');
  const [projectFilter, setProjectFilter] = useState('');
  const [handledByFilter, setHandledByFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeTab, setTypeTab] = useState('all');

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState('income');

  useEffect(() => {
    setConcernFilter(selectedConcernId ?? '');
  }, [selectedConcernId]);

  useEffect(() => {
    fetchProjects(concernFilter || null).then(setProjects).catch((e) => setError(e.message));
    fetchEmployees(concernFilter || null).then(setEmployees).catch((e) => setError(e.message));
  }, [concernFilter]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const handledBy = handledByFilter
      ? handledByFilter === 'self'
        ? { kind: 'user', id: currentUser?.id }
        : { kind: 'employee', id: handledByFilter.split(':')[1] }
      : null;

    fetchTransactions({
      concernId: concernFilter || null,
      projectId: projectFilter || null,
      type: typeTab === 'all' ? null : typeTab,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      handledBy,
    })
      .then((rows) => {
        if (!cancelled) setTransactions(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [concernFilter, projectFilter, typeTab, dateFrom, dateTo, handledByFilter, currentUser, reloadKey]);

  function openAdd(type) {
    setFormType(type);
    setFormOpen(true);
  }

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Ledger</h1>
        <div className="flex gap-2">
          <button
            onClick={() => openAdd('income')}
            className="px-3 py-1.5 rounded-md text-sm bg-income/15 text-income border border-income/30"
          >
            + Add income
          </button>
          <button
            onClick={() => openAdd('expense')}
            className="px-3 py-1.5 rounded-md text-sm bg-expense/15 text-expense border border-expense/30"
          >
            + Add expense
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {['all', 'income', 'expense'].map((t) => (
          <button
            key={t}
            onClick={() => setTypeTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs capitalize ${
              typeTab === t ? 'bg-surfaceRaised text-gray-900' : 'text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <select className={inputClass} value={concernFilter} onChange={(e) => setConcernFilter(e.target.value)}>
          <option value="">All concerns</option>
          {realConcerns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select className={inputClass} value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <select className={inputClass} value={handledByFilter} onChange={(e) => setHandledByFilter(e.target.value)}>
          <option value="">Anyone (handled by)</option>
          {currentUser && <option value="self">Myself</option>}
          {employees.map((emp) => (
            <option key={emp.id} value={`employee:${emp.id}`}>
              {emp.name}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="date"
            className={inputClass}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
          />
          <input
            type="date"
            className={inputClass}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
          />
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && transactions.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
          No transactions match these filters.
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-3 font-normal">Concern</th>
                  <th className="py-2 pr-3 font-normal">Party</th>
                  <th className="py-2 pr-3 font-normal text-right">Total</th>
                  <th className="py-2 pr-3 font-normal text-right">Paid</th>
                  <th className="py-2 pr-3 font-normal text-right">Due</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
                  <th className="py-2 pr-3 font-normal">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <TransactionRow key={t.id} t={t} onClick={() => navigate(`/ledger/${t.id}`)} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {transactions.map((t) => (
              <TransactionCard key={t.id} t={t} onClick={() => navigate(`/ledger/${t.id}`)} />
            ))}
          </div>
        </>
      )}

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} defaultType={formType} />
    </div>
  );
}

function partyName(t) {
  return t.clients?.name ?? t.employees?.name ?? '—';
}

function TransactionRow({ t, onClick }) {
  const { paidAmount, dueAmount, status } = computeBalances(t);
  return (
    <tr onClick={onClick} className="border-b border-gray-200/60 cursor-pointer hover:bg-surfaceRaised/60">
      <td className="py-2.5 pr-3 text-gray-700">{t.concerns?.name}</td>
      <td className="py-2.5 pr-3 text-gray-900">{partyName(t)}</td>
      <td className="py-2.5 pr-3 text-right text-gray-700">{formatMoney(t.total_amount)}</td>
      <td className="py-2.5 pr-3 text-right text-gray-700">{formatMoney(paidAmount)}</td>
      <td className="py-2.5 pr-3 text-right text-gray-700">{dueAmount > 0 ? formatMoney(dueAmount) : '—'}</td>
      <td className="py-2.5 pr-3">
        <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
      </td>
      <td className="py-2.5 pr-3 text-gray-500">{formatDate(t.transaction_date)}</td>
    </tr>
  );
}

function TransactionCard({ t, onClick }) {
  const { paidAmount, dueAmount, status } = computeBalances(t);
  return (
    <div
      onClick={onClick}
      className="bg-surfaceRaised border border-gray-200 rounded-lg p-3 cursor-pointer active:bg-surface"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-900 font-medium">{partyName(t)}</span>
        <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
      </div>
      <div className="text-xs text-gray-500 mb-2">
        {t.concerns?.name} · {formatDate(t.transaction_date)}
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-500">Total {formatMoney(t.total_amount)}</span>
        <span className="text-gray-500">Paid {formatMoney(paidAmount)}</span>
        {dueAmount > 0 && <span className="text-due">Due {formatMoney(dueAmount)}</span>}
      </div>
    </div>
  );
}
