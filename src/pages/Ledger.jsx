import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Filter } from 'lucide-react';
import { useConcern } from '../context/ConcernContext.jsx';
import { supabase } from '../lib/supabase.js';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Sheet from '../components/Sheet.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { inputClass } from '../components/Field.jsx';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS, CHANNEL_LABELS } from '../lib/format.js';
import { fetchTransactions, fetchProjects, fetchEmployees, computeBalances } from '../lib/ledgerData.js';
import { fetchOwners } from '../lib/ownerData.js';
import TransactionForm from './ledger/TransactionForm.jsx';

export default function Ledger({ fixedType = null }) {
  const navigate = useNavigate();
  const { selectedConcernId } = useConcern();

  const [concernFilter, setConcernFilter] = useState(selectedConcernId ?? '');
  const [projectFilter, setProjectFilter] = useState('');
  const [handledByFilter, setHandledByFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeTab, setTypeTab] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [owners, setOwners] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState(fixedType ?? 'income');

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
    fetchOwners().then(setOwners).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const handledBy = handledByFilter
      ? handledByFilter === 'self'
        ? { kind: 'user', id: currentUser?.id }
        : { kind: handledByFilter.split(':')[0], id: handledByFilter.split(':')[1] }
      : null;

    fetchTransactions({
      concernId: concernFilter || null,
      projectId: projectFilter || null,
      type: fixedType ?? (typeTab === 'all' ? null : typeTab),
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      handledBy,
      channel: channelFilter || null,
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
  }, [concernFilter, projectFilter, typeTab, dateFrom, dateTo, handledByFilter, channelFilter, currentUser, reloadKey, fixedType]);

  function openAdd(type) {
    setFormType(type);
    setFormOpen(true);
  }

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  function clearSecondaryFilters() {
    setHandledByFilter('');
    setChannelFilter('');
    setDateFrom('');
    setDateTo('');
  }

  // The Expense list is meant to read as "money actually spent," matching
  // the same cash-basis principle already used for the Dashboard's Total
  // Expense figure — a Salary/Payroll commitment with nothing paid against
  // it yet isn't an expense that's happened, so it stays hidden here until
  // at least a partial payment lands (fully due-but-unpaid entries are
  // still visible via the Payable due list and each project's Team table).
  const visibleTransactions =
    fixedType === 'expense' ? transactions.filter((t) => computeBalances(t).paidAmount > 0) : transactions;
  const hiddenDueCount = transactions.length - visibleTransactions.length;

  const title = fixedType ? (fixedType === 'income' ? 'Income' : 'Expense') : 'Ledger';
  const handledByLabel = fixedType === 'expense' ? 'Paid By' : 'Received By';
  const activeSecondaryFilters = [handledByFilter, channelFilter, dateFrom, dateTo].filter(Boolean).length;
  const projectOptions = [
    { value: '', label: 'All projects' },
    ...projects.map((p) => ({ value: p.id, label: p.title })),
  ];
  const handledByOptions = [
    { value: '', label: 'Anyone' },
    ...(currentUser ? [{ value: 'self', label: 'Myself' }] : []),
    ...owners.map((o) => ({ value: `owner:${o.id}`, label: `${o.name} (Owner)` })),
    ...employees.map((emp) => ({ value: `employee:${emp.id}`, label: emp.name })),
  ];
  const channelOptions = [
    { value: '', label: 'All channels' },
    ...Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label })),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <div className="flex gap-2">
          {(!fixedType || fixedType === 'income') && (
            <button
              onClick={() => openAdd('income')}
              className="px-3 py-1.5 rounded-xl text-sm bg-income/15 text-income border border-income/30"
            >
              + Add income
            </button>
          )}
          {(!fixedType || fixedType === 'expense') && (
            <button
              onClick={() => openAdd('expense')}
              className="px-3 py-1.5 rounded-xl text-sm bg-expense/15 text-expense border border-expense/30"
            >
              + Add expense
            </button>
          )}
        </div>
      </div>

      {!fixedType && (
        <div className="flex gap-1 mb-4">
          {['all', 'income', 'expense'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeTab(t)}
              className={`px-3 py-1.5 rounded-xl text-xs capitalize ${
                typeTab === t ? 'bg-surfaceRaised text-slate-900' : 'text-slate-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <Dropdown value={projectFilter} onChange={setProjectFilter} options={projectOptions} />
        </div>
        <button
          onClick={() => setFiltersOpen(true)}
          className="relative w-11 h-11 shrink-0 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-slate-300 transition-colors"
          aria-label="Filters"
        >
          <Filter className="w-4 h-4" />
          {activeSecondaryFilters > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] leading-4 flex items-center justify-center">
              {activeSecondaryFilters}
            </span>
          )}
        </button>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && visibleTransactions.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8">
          <EmptyState
            icon={Inbox}
            message={
              hiddenDueCount > 0
                ? `No expenses paid yet — ${hiddenDueCount} due but unpaid ${hiddenDueCount === 1 ? 'entry is' : 'entries are'} hidden until paid.`
                : 'No transactions match these filters.'
            }
          />
        </div>
      )}
      {!loading && hiddenDueCount > 0 && visibleTransactions.length > 0 && (
        <p className="text-xs text-slate-500 mb-3">
          {hiddenDueCount} due but unpaid {hiddenDueCount === 1 ? 'entry is' : 'entries are'} hidden until paid.
        </p>
      )}

      {!loading && visibleTransactions.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
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
                {visibleTransactions.map((t) => (
                  <TransactionRow key={t.id} t={t} onClick={() => navigate(`/ledger/${t.id}`)} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {visibleTransactions.map((t) => (
              <TransactionCard key={t.id} t={t} onClick={() => navigate(`/ledger/${t.id}`)} />
            ))}
          </div>
        </>
      )}

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="space-y-4">
          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1.5">{handledByLabel}</span>
            <Dropdown value={handledByFilter} onChange={setHandledByFilter} options={handledByOptions} />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1.5">Channel</span>
            <Dropdown value={channelFilter} onChange={setChannelFilter} options={channelOptions} />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1.5">Date Range</span>
            <div className="grid grid-cols-2 gap-2">
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
          <div className="flex gap-2 pt-2">
            <button
              onClick={clearSecondaryFilters}
              className="flex-1 h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-surface transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setFiltersOpen(false)}
              className="flex-1 h-11 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primaryHover transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </Sheet>

      <TransactionForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={refresh} defaultType={formType} fixedType={fixedType} />
    </div>
  );
}

function partyName(t) {
  return t.clients?.name ?? t.employees?.name ?? '—';
}

function TransactionRow({ t, onClick }) {
  const { paidAmount, dueAmount, status } = computeBalances(t);
  const typeClass = t.type === 'income' ? 'text-income' : 'text-expense';
  return (
    <tr
      onClick={onClick}
      className={`border-b border-l-4 ${
        t.type === 'income' ? 'border-l-income/40 bg-income/5' : 'border-l-expense/40 bg-expense/5'
      } border-slate-200/60 cursor-pointer hover:bg-surfaceRaised/60`}
    >
      <td className="py-2.5 pr-3 text-slate-700">{t.concerns?.name}</td>
      <td className="py-2.5 pr-3 text-slate-900">{partyName(t)}</td>
      <td className={`py-2.5 pr-3 text-right ${typeClass}`}>{formatMoney(t.total_amount)}</td>
      <td className="py-2.5 pr-3 text-right text-slate-700">{formatMoney(paidAmount)}</td>
      <td className="py-2.5 pr-3 text-right text-slate-700">{dueAmount > 0 ? formatMoney(dueAmount) : '—'}</td>
      <td className="py-2.5 pr-3">
        <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
      </td>
      <td className="py-2.5 pr-3 text-slate-500">{formatDate(t.transaction_date)}</td>
    </tr>
  );
}

function TransactionCard({ t, onClick }) {
  const { paidAmount, dueAmount, status } = computeBalances(t);
  const typeClass = t.type === 'income' ? 'text-income' : 'text-expense';
  return (
    <div
      onClick={onClick}
      className={`border border-l-4 rounded-2xl shadow-card p-4 cursor-pointer active:bg-surface ${
        t.type === 'income' ? 'bg-income/5 border-slate-200 border-l-income/50' : 'bg-expense/5 border-slate-200 border-l-expense/50'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-900 font-medium">{partyName(t)}</span>
        <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
      </div>
      <div className="text-xs text-slate-500 mb-2">
        {t.concerns?.name} · {formatDate(t.transaction_date)}
      </div>
      <div className="flex justify-between text-sm">
        <span className={typeClass}>Total {formatMoney(t.total_amount)}</span>
        <span className="text-slate-500">Paid {formatMoney(paidAmount)}</span>
        {dueAmount > 0 && <span className="text-due">Due {formatMoney(dueAmount)}</span>}
      </div>
    </div>
  );
}
