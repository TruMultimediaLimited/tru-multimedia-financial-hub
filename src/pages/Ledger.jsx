import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, Wallet, Plus } from 'lucide-react';
import { useConcern } from '../context/ConcernContext.jsx';
import { supabase } from '../lib/supabase.js';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Sheet from '../components/Sheet.jsx';
import Dropdown from '../components/Dropdown.jsx';
import { inputClass } from '../components/Field.jsx';
import { initials, avatarColor } from '../lib/avatar.js';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS } from '../lib/format.js';
import { fetchTransactions, fetchProjects, fetchEmployees, computeBalances } from '../lib/ledgerData.js';
import TransactionForm from './ledger/TransactionForm.jsx';

export default function Ledger({ fixedType = null }) {
  const navigate = useNavigate();
  const { selectedConcernId, concerns } = useConcern();
  const realConcerns = concerns;

  const [concernFilter, setConcernFilter] = useState(selectedConcernId ?? '');
  const [projectFilter, setProjectFilter] = useState('');
  const [handledByFilter, setHandledByFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [typeTab, setTypeTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
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
      type: fixedType ?? (typeTab === 'all' ? null : typeTab),
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
  }, [concernFilter, projectFilter, typeTab, dateFrom, dateTo, handledByFilter, currentUser, reloadKey, fixedType]);

  function openAdd(type) {
    setFormType(type);
    setFormOpen(true);
  }

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  function clearSecondaryFilters() {
    setConcernFilter(selectedConcernId ?? '');
    setHandledByFilter('');
    setDateFrom('');
    setDateTo('');
    setTypeTab('all');
  }

  const title = fixedType ? (fixedType === 'income' ? 'Income' : 'Expense') : 'Ledger';
  const typeWord = fixedType === 'expense' ? 'Expense' : 'Income';

  const filtered = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      const haystack = `${partyName(t)} ${t.projects?.title ?? ''} ${t.category ?? ''} ${t.description ?? ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [transactions, search]);

  const stats = useMemo(() => {
    const thisMonthPrefix = new Date().toISOString().slice(0, 7);
    let total = 0;
    let thisMonth = 0;
    let pending = 0;
    filtered.forEach((t) => {
      const { dueAmount, status } = computeBalances(t);
      total += Number(t.total_amount);
      if ((t.transaction_date ?? '').slice(0, 7) === thisMonthPrefix) thisMonth += Number(t.total_amount);
      if (status !== 'paid') pending += dueAmount;
    });
    return { total, thisMonth, pending, count: filtered.length };
  }, [filtered]);

  const activeSecondaryFilters =
    [concernFilter, handledByFilter, dateFrom, dateTo].filter(Boolean).length +
    (!fixedType && typeTab !== 'all' ? 1 : 0);

  const projectOptions = [
    { value: '', label: 'All projects' },
    ...projects.map((p) => ({ value: p.id, label: p.title })),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-slate-900">{title}</h1>
        <div className="flex gap-2">
          {(!fixedType || fixedType === 'income') && (
            <button
              onClick={() => openAdd('income')}
              className="h-11 px-5 flex items-center gap-1.5 rounded-full text-sm font-medium bg-income text-white hover:bg-income/90 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Income
            </button>
          )}
          {(!fixedType || fixedType === 'expense') && (
            <button
              onClick={() => openAdd('expense')}
              className="h-11 px-5 flex items-center gap-1.5 rounded-full text-sm font-medium bg-expense text-white hover:bg-expense/90 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full h-11 bg-white border border-slate-200 rounded-full pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
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

      <div className="mb-6">
        <Dropdown value={projectFilter} onChange={setProjectFilter} options={projectOptions} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label={`Total ${typeWord}`} value={formatMoney(stats.total)} />
        <StatCard label="This Month" value={formatMoney(stats.thisMonth)} />
        <StatCard label="Pending" value={formatMoney(stats.pending)} />
        <StatCard label="Transactions" value={stats.count} />
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <EmptyState
          large
          icon={Wallet}
          message={`No ${fixedType === 'expense' ? 'expenses' : 'income'} found`}
          subtitle={`Tap Add ${typeWord} to record your first ${fixedType === 'expense' ? 'expense' : 'payment'}.`}
          action={{
            label: `+ Add ${typeWord}`,
            onClick: () => openAdd(fixedType ?? 'income'),
            className: `${fixedType === 'expense' ? 'bg-expense' : 'bg-income'} text-white hover:opacity-90`,
          }}
        />
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-3 transition-opacity duration-200">
          {filtered.map((t) => (
            <TransactionCard
              key={t.id}
              t={t}
              onClick={() => navigate(`/ledger/${t.id}`)}
              isExpense={t.type === 'expense'}
            />
          ))}
        </div>
      )}

      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <div className="space-y-4">
          {!fixedType && (
            <div>
              <span className="block text-xs font-medium text-slate-500 mb-1.5">Type</span>
              <Dropdown
                value={typeTab}
                onChange={setTypeTab}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'income', label: 'Income' },
                  { value: 'expense', label: 'Expense' },
                ]}
              />
            </div>
          )}
          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1.5">Concern</span>
            <Dropdown
              value={concernFilter}
              onChange={setConcernFilter}
              options={[{ value: '', label: 'All concerns' }, ...realConcerns.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1.5">Handled by</span>
            <Dropdown
              value={handledByFilter}
              onChange={setHandledByFilter}
              options={[
                { value: '', label: 'Anyone' },
                ...(currentUser ? [{ value: 'self', label: 'Myself' }] : []),
                ...employees.map((emp) => ({ value: `employee:${emp.id}`, label: emp.name })),
              ]}
            />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1.5">Date range</span>
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

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-[18px] shadow-card p-4">
      <div className="text-xs text-slate-500 mb-1 truncate">{label}</div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function TransactionCard({ t, onClick, isExpense }) {
  const { status } = computeBalances(t);
  const name = partyName(t);
  const accent = isExpense ? 'text-expense' : 'text-income';
  const sign = isExpense ? '-' : '+';
  const avatarId = t.client_id ?? t.employee_id ?? t.id;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[24px] shadow-card p-4 cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start gap-3">
        <span
          className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor(avatarId)}`}
        >
          {initials(name)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-semibold text-slate-900 truncate">{name}</div>
          <div className="text-sm text-slate-500 truncate">{t.projects?.title ?? t.category ?? '—'}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1.5" />
      </div>
      <div className="flex items-center justify-between gap-2 mt-3 pl-[56px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
          <span className="text-xs text-slate-500 truncate">{formatDate(t.transaction_date)}</span>
        </div>
        <span className={`text-[28px] leading-none font-bold shrink-0 ${accent}`}>
          {sign}
          {formatMoney(t.total_amount)}
        </span>
      </div>
    </div>
  );
}
