import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Wallet, Receipt, TrendingUp, TrendingDown, Inbox, Building2, Layers } from 'lucide-react';
import { useConcern } from '../context/ConcernContext.jsx';
import EmptyState from '../components/EmptyState.jsx';
import MonthToggle from '../components/MonthToggle.jsx';
import PageTitle from '../components/PageTitle.jsx';
import { formatMoney, formatDate, CHANNEL_LABELS } from '../lib/format.js';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { useMonthRange } from '../lib/monthRange.js';
import {
  fetchDueSummary,
  fetchProjectValueBreakdown,
  fetchPaymentsReceivedBreakdown,
  fetchExpenseBreakdown,
  fetchProjectProfitBreakdown,
} from '../lib/dashboardData.js';

const EMPTY_BREAKDOWN = { total: 0, rows: [] };

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedConcernId } = useConcern();
  const { offset, setOffset, monthStart, monthEnd, label: monthLabel } = useMonthRange();

  const [projectValue, setProjectValue] = useState(EMPTY_BREAKDOWN);
  const [paymentsReceived, setPaymentsReceived] = useState(EMPTY_BREAKDOWN);
  const [expense, setExpense] = useState(EMPTY_BREAKDOWN);
  const [projectProfit, setProjectProfit] = useState(EMPTY_BREAKDOWN);
  const [dueSummary, setDueSummary] = useState({ receivables: [], payables: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dueSort, setDueSort] = useState('amount');
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedReceivable, setExpandedReceivable] = useState(null);
  const [expandedPayable, setExpandedPayable] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const concernId = selectedConcernId || null;
    const monthRange = { dateFrom: monthStart, dateTo: monthEnd };
    Promise.all([
      fetchProjectValueBreakdown(concernId, monthRange),
      fetchPaymentsReceivedBreakdown(concernId, monthRange),
      fetchExpenseBreakdown(concernId, monthRange),
      fetchProjectProfitBreakdown(concernId, monthRange),
      fetchDueSummary(concernId),
    ])
      .then(([valueResult, receivedResult, expenseResult, profitResult, dueResult]) => {
        if (cancelled) return;
        setProjectValue(valueResult);
        setPaymentsReceived(receivedResult);
        setExpense(expenseResult);
        setProjectProfit(profitResult);
        setDueSummary(dueResult);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selectedConcernId, monthStart, monthEnd]);

  function sortRows(rows) {
    return [...rows].sort((a, b) =>
      dueSort === 'amount' ? b.due - a.due : a.oldestDate < b.oldestDate ? -1 : 1
    );
  }

  function toggleCard(key) {
    setExpandedCard((current) => (current === key ? null : key));
  }

  const totalReceivable = dueSummary.receivables.reduce((sum, r) => sum + r.due, 0);
  const totalPayable = dueSummary.payables.reduce((sum, r) => sum + r.due, 0);

  // Total Expense splits into money spent on a specific project (team
  // salaries, project gear/food/rent) vs. general office overhead (rent,
  // bills) that isn't tied to any project — same distinction already used
  // by the Expense list's Team/Salaries vs. Office & Other Expenses groups.
  const projectExpenseRows = expense.rows.filter((r) => r.projectId);
  const officeExpenseRows = expense.rows.filter((r) => !r.projectId);
  const projectExpenseTotal = projectExpenseRows.reduce((sum, r) => sum + r.amount, 0);
  const officeExpenseTotal = officeExpenseRows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <PageTitle colorClass="bg-primary/10 border-primary/25 text-primary">Dashboard</PageTitle>
        <MonthToggle
          label={monthLabel}
          offset={offset}
          onPrev={() => setOffset((o) => o - 1)}
          onNext={() => setOffset((o) => Math.min(0, o + 1))}
          onCurrent={() => setOffset(0)}
        />
      </div>

      <p className="text-[11px] text-slate-400 mb-3">
        Cash-basis — these totals count money actually received or paid, not full billed/invoiced amounts.
      </p>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <div className="flex flex-col gap-3">
              <SummaryCard
                icon={Folder}
                iconClass={ENTITY_COLORS.project.icon}
                label={
                  <>
                    Total Project
                    <br />
                    Value
                  </>
                }
                value={formatMoney(projectValue.total)}
                accent="text-slate-900"
                active={expandedCard === 'value'}
                onClick={() => toggleCard('value')}
                cardBg="bg-violet-50"
                cardBorder="border-violet-200"
              />
              <SummaryCard
                icon={Wallet}
                iconClass="bg-income/10 text-income"
                label="Total Payment Received"
                value={formatMoney(paymentsReceived.total)}
                accent="text-income"
                active={expandedCard === 'received'}
                onClick={() => toggleCard('received')}
                cardBg="bg-income/5"
                cardBorder="border-income/30"
              />
              <SummaryCard
                icon={projectProfit.total >= 0 ? TrendingUp : TrendingDown}
                iconClass={projectProfit.total >= 0 ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'}
                label={
                  <>
                    Total Project
                    <br />
                    Profit
                  </>
                }
                value={formatMoney(projectProfit.total)}
                accent={projectProfit.total >= 0 ? 'text-income' : 'text-expense'}
                active={expandedCard === 'profit'}
                onClick={() => toggleCard('profit')}
                cardBg={projectProfit.total >= 0 ? 'bg-income/5' : 'bg-expense/5'}
                cardBorder={projectProfit.total >= 0 ? 'border-income/30' : 'border-expense/30'}
              />
            </div>
            <div className="flex flex-col gap-3">
              <SummaryCard
                icon={Receipt}
                iconClass="bg-expense/10 text-expense"
                label="Project Expense"
                value={formatMoney(projectExpenseTotal)}
                accent="text-expense"
                active={expandedCard === 'projectExpense'}
                onClick={() => toggleCard('projectExpense')}
                cardBg="bg-expense/5"
                cardBorder="border-expense/30"
              />
              <SummaryCard
                icon={Building2}
                iconClass="bg-expense/10 text-expense"
                label="Office Expense"
                value={formatMoney(officeExpenseTotal)}
                accent="text-expense"
                active={expandedCard === 'office'}
                onClick={() => toggleCard('office')}
                cardBg="bg-expense/5"
                cardBorder="border-expense/30"
              />
              <SummaryCard
                icon={Layers}
                iconClass="bg-expense/10 text-expense"
                label="Total Expense"
                value={formatMoney(expense.total)}
                accent="text-expense"
                active={expandedCard === 'expense'}
                onClick={() => toggleCard('expense')}
                cardBg="bg-expense/5"
                cardBorder="border-expense/30"
              />
            </div>
          </div>

          {expandedCard === 'value' && (
            <BreakdownPanel emptyText="No projects yet.">
              {projectValue.rows.map((r) => (
                <BreakdownRow
                  key={r.id}
                  onClick={() => navigate(`/projects/${r.id}`)}
                  title={r.title}
                  sub={r.concernName}
                  value={formatMoney(r.contractValue)}
                />
              ))}
            </BreakdownPanel>
          )}

          {expandedCard === 'received' && (
            <BreakdownPanel emptyText="No payments received yet.">
              {paymentsReceived.rows.map((r) => (
                <BreakdownRow
                  key={r.id}
                  onClick={() => navigate(`/ledger/${r.transactionId}`)}
                  title={r.source}
                  sub={`${formatDate(r.date)} · via ${CHANNEL_LABELS[r.channel] ?? r.channel}`}
                  value={formatMoney(r.amount)}
                  valueClassName="text-income"
                />
              ))}
            </BreakdownPanel>
          )}

          {expandedCard === 'projectExpense' && (
            <BreakdownPanel emptyText="No project expenses paid yet.">
              {projectExpenseRows.map((r) => (
                <BreakdownRow
                  key={r.id}
                  onClick={() => navigate(`/ledger/${r.transactionId}`)}
                  title={r.category}
                  sub={`${r.projectTitle} · ${formatDate(r.date)} · via ${CHANNEL_LABELS[r.channel] ?? r.channel}`}
                  value={formatMoney(r.amount)}
                  valueClassName="text-expense"
                />
              ))}
            </BreakdownPanel>
          )}

          {expandedCard === 'office' && (
            <BreakdownPanel emptyText="No office expenses paid yet.">
              {officeExpenseRows.map((r) => (
                <BreakdownRow
                  key={r.id}
                  onClick={() => navigate(`/ledger/${r.transactionId}`)}
                  title={r.category}
                  sub={`${r.concernName} · ${formatDate(r.date)} · via ${CHANNEL_LABELS[r.channel] ?? r.channel}`}
                  value={formatMoney(r.amount)}
                  valueClassName="text-expense"
                />
              ))}
            </BreakdownPanel>
          )}

          {expandedCard === 'expense' && (
            <BreakdownPanel emptyText="No expenses paid yet.">
              {expense.rows.map((r) => (
                <BreakdownRow
                  key={r.id}
                  onClick={() => navigate(`/ledger/${r.transactionId}`)}
                  title={r.category}
                  sub={`${r.concernName} · ${formatDate(r.date)} · via ${CHANNEL_LABELS[r.channel] ?? r.channel}`}
                  value={formatMoney(r.amount)}
                  valueClassName="text-expense"
                />
              ))}
            </BreakdownPanel>
          )}

          {expandedCard === 'profit' && (
            <BreakdownPanel emptyText="No fully paid-off projects yet.">
              {projectProfit.rows.map((r) => (
                <BreakdownRow
                  key={r.id}
                  onClick={() => navigate(`/projects/${r.id}`)}
                  title={r.title}
                  sub={r.concernName}
                  value={formatMoney(r.profit)}
                  valueClassName={r.profit >= 0 ? 'text-income' : 'text-expense'}
                />
              ))}
            </BreakdownPanel>
          )}

          <div className="flex items-center justify-between mb-2 mt-4">
            <h2 className="text-sm font-medium text-slate-700">Due list</h2>
            <div className="flex gap-1">
              <SortButton active={dueSort === 'amount'} onClick={() => setDueSort('amount')} label="By amount" />
              <SortButton active={dueSort === 'age'} onClick={() => setDueSort('age')} label="By age" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <DueColumn
              title="Receivable"
              rows={sortRows(dueSummary.receivables)}
              expandedId={expandedReceivable}
              onToggle={(id) => setExpandedReceivable((cur) => (cur === id ? null : id))}
              onBreakdownClick={(b) => navigate(b.type === 'project' ? `/projects/${b.id}` : `/ledger/${b.id}`)}
              emptyText="No outstanding client dues."
              colorKey="client"
              breakdownColorKey={(b) => (b.type === 'project' ? 'project' : 'client')}
            />
            <DueColumn
              title="Payable"
              rows={sortRows(dueSummary.payables)}
              expandedId={expandedPayable}
              onToggle={(id) => setExpandedPayable((cur) => (cur === id ? null : id))}
              onBreakdownClick={(b) => b.employeeId && navigate(`/employees/${b.employeeId}`)}
              emptyText="No outstanding employee dues."
              colorKey="project"
              breakdownColorKey="employee"
            />
          </div>
        </>
      )}
    </div>
  );
}

function SortButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
        active ? 'bg-primary text-white border-primary' : 'bg-surfaceRaised text-slate-600 border-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function SummaryCard({
  icon: Icon,
  iconClass,
  label,
  value,
  accent,
  active,
  onClick,
  cardBg = 'bg-surfaceRaised',
  cardBorder = 'border-slate-200',
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left border rounded-2xl shadow-card px-3.5 py-2.5 transition-colors hover:border-slate-300 ${cardBg} ${
        active ? 'border-primary' : cardBorder
      }`}
    >
      <div className="flex items-start justify-between mb-1 min-h-[2.1rem]">
        <span className="text-[11px] leading-tight text-slate-500">{label}</span>
        {Icon && (
          <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${iconClass}`}>
            <Icon className="w-3 h-3" />
          </span>
        )}
      </div>
      <div className={`text-lg font-bold ${accent}`}>{value}</div>
    </button>
  );
}

function BreakdownPanel({ children, emptyText }) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-4 mb-4">
      {isEmpty ? <EmptyState icon={Inbox} message={emptyText} /> : <div className="space-y-1">{children}</div>}
    </div>
  );
}

function BreakdownRow({ onClick, title, sub, value, valueClassName = 'text-slate-900' }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-1.5 px-2 rounded-xl cursor-pointer hover:bg-surface"
    >
      <div>
        <div className="text-sm text-slate-900">{title}</div>
        {sub && <div className="text-xs text-slate-500">{sub}</div>}
      </div>
      <div className={`text-sm ${valueClassName}`}>{value}</div>
    </div>
  );
}

function DueColumn({ title, rows, expandedId, onToggle, onBreakdownClick, emptyText, colorKey, breakdownColorKey }) {
  const color = ENTITY_COLORS[colorKey];
  return (
    <div className={`${color.bg} border border-slate-200 border-l-4 ${color.border} rounded-2xl shadow-card p-4`}>
      <div className={`text-xs font-medium mb-2 ${color.text}`}>{title}</div>
      {rows.length === 0 && <p className="text-sm text-slate-500">{emptyText}</p>}
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.id}>
            <div
              onClick={() => onToggle(r.id)}
              className="flex items-center justify-between py-1.5 px-2 rounded-xl cursor-pointer hover:bg-surface"
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 shrink-0 rounded-full ${color.dot}`} />
                <div>
                  <div className="text-sm text-slate-900">{r.name}</div>
                  {r.oldestDate && <div className="text-xs text-slate-500">since {formatDate(r.oldestDate)}</div>}
                </div>
              </div>
              <div className="text-sm text-due">{formatMoney(r.due)}</div>
            </div>
            {expandedId === r.id && (
              <div className="ml-2 mb-1 pl-2 border-l-2 border-slate-200 space-y-0.5">
                {r.breakdown.map((b) => {
                  const bColor = ENTITY_COLORS[typeof breakdownColorKey === 'function' ? breakdownColorKey(b) : breakdownColorKey];
                  return (
                    <div
                      key={b.id}
                      onClick={() => onBreakdownClick(b)}
                      className="flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer hover:bg-surface"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1 h-1 shrink-0 rounded-full ${bColor.dot}`} />
                        <span className="text-xs text-slate-700">{b.label}</span>
                      </div>
                      <span className="text-xs text-due">{formatMoney(b.due)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
