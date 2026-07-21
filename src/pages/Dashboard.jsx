import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConcern } from '../context/ConcernContext.jsx';
import { supabase } from '../lib/supabase.js';
import Badge from '../components/Badge.jsx';
import { formatMoney, formatDate, CHANNEL_LABELS } from '../lib/format.js';
import {
  fetchDueSummary,
  fetchChannelBreakdown,
  fetchProjectValueBreakdown,
  fetchPaymentsReceivedBreakdown,
  fetchExpenseBreakdown,
  fetchProjectProfitBreakdown,
} from '../lib/dashboardData.js';

const EMPTY_BREAKDOWN = { total: 0, rows: [] };

export default function Dashboard() {
  const navigate = useNavigate();
  const { selectedConcernId } = useConcern();

  const [projectValue, setProjectValue] = useState(EMPTY_BREAKDOWN);
  const [paymentsReceived, setPaymentsReceived] = useState(EMPTY_BREAKDOWN);
  const [expense, setExpense] = useState(EMPTY_BREAKDOWN);
  const [projectProfit, setProjectProfit] = useState(EMPTY_BREAKDOWN);
  const [dueSummary, setDueSummary] = useState({ receivables: [], payables: [] });
  const [channels, setChannels] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dueSort, setDueSort] = useState('amount');
  const [expandedCard, setExpandedCard] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const concernId = selectedConcernId || null;
    Promise.all([
      fetchProjectValueBreakdown(concernId),
      fetchPaymentsReceivedBreakdown(concernId),
      fetchExpenseBreakdown(concernId),
      fetchProjectProfitBreakdown(concernId),
      fetchDueSummary(concernId),
      fetchChannelBreakdown({ concernId, currentUserId: currentUser?.id ?? null }),
    ])
      .then(([valueResult, receivedResult, expenseResult, profitResult, dueResult, channelResult]) => {
        if (cancelled) return;
        setProjectValue(valueResult);
        setPaymentsReceived(receivedResult);
        setExpense(expenseResult);
        setProjectProfit(profitResult);
        setDueSummary(dueResult);
        setChannels(channelResult);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [selectedConcernId, currentUser]);

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

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-4">Dashboard</h1>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
            <SummaryCard
              label="Total Project Value"
              value={formatMoney(projectValue.total)}
              accent="text-gray-900"
              active={expandedCard === 'value'}
              onClick={() => toggleCard('value')}
            />
            <SummaryCard
              label="Total Payment Received"
              value={formatMoney(paymentsReceived.total)}
              accent="text-income"
              active={expandedCard === 'received'}
              onClick={() => toggleCard('received')}
            />
            <SummaryCard
              label="Total Expense"
              value={formatMoney(expense.total)}
              accent="text-expense"
              active={expandedCard === 'expense'}
              onClick={() => toggleCard('expense')}
            />
            <SummaryCard
              label="Project Profit"
              value={formatMoney(projectProfit.total)}
              accent={projectProfit.total >= 0 ? 'text-income' : 'text-expense'}
              active={expandedCard === 'profit'}
              onClick={() => toggleCard('profit')}
            />
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

          {expandedCard === 'expense' && (
            <BreakdownPanel emptyText="No expenses yet.">
              {expense.rows.map((r) => (
                <BreakdownRow
                  key={r.id}
                  onClick={() => navigate(`/ledger/${r.id}`)}
                  title={r.category}
                  sub={`${r.concernName} · ${formatDate(r.date)}`}
                  value={formatMoney(r.amount)}
                  valueClassName="text-expense"
                />
              ))}
            </BreakdownPanel>
          )}

          {expandedCard === 'profit' && (
            <BreakdownPanel emptyText="No completed projects yet.">
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
            <h2 className="text-sm font-medium text-gray-700">Due list</h2>
            <div className="flex gap-1">
              <SortButton active={dueSort === 'amount'} onClick={() => setDueSort('amount')} label="By amount" />
              <SortButton active={dueSort === 'age'} onClick={() => setDueSort('age')} label="By age" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <DueColumn
              title="Receivable"
              rows={sortRows(dueSummary.receivables)}
              onRowClick={(id) => navigate(`/clients/${id}`)}
              emptyText="No outstanding client dues."
            />
            <DueColumn
              title="Payable"
              rows={sortRows(dueSummary.payables)}
              onRowClick={(id) => navigate(`/employees/${id}`)}
              emptyText="No outstanding employee dues."
            />
          </div>

          <h2 className="text-sm font-medium text-gray-700 mb-2">Channel breakdown</h2>
          {channels.length === 0 ? (
            <p className="text-sm text-gray-500">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-3 font-normal">Channel</th>
                    <th className="py-2 pr-3 font-normal">Handled by</th>
                    <th className="py-2 pr-3 font-normal text-right">Total</th>
                    <th className="py-2 pr-3 font-normal text-right">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((row) => (
                    <tr key={`${row.channel}|${row.handler}`} className="border-b border-gray-200/60">
                      <td className="py-2 pr-3">
                        <Badge className="bg-surfaceRaised text-gray-700 border-gray-300">
                          {CHANNEL_LABELS[row.channel] ?? row.channel}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-gray-700">{row.handler}</td>
                      <td className="py-2 pr-3 text-right text-gray-900">{formatMoney(row.total)}</td>
                      <td className="py-2 pr-3 text-right text-gray-500">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SortButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs ${active ? 'bg-surfaceRaised text-gray-900' : 'text-gray-500'}`}
    >
      {label}
    </button>
  );
}

function SummaryCard({ label, value, accent, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left bg-surfaceRaised border rounded-lg px-3 py-2.5 hover:border-gray-300 ${
        active ? 'border-gray-900' : 'border-gray-200'
      }`}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 ${accent}`}>{value}</div>
    </button>
  );
}

function BreakdownPanel({ children, emptyText }) {
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div className="bg-surfaceRaised border border-gray-200 rounded-lg p-3 mb-4">
      {isEmpty ? <p className="text-sm text-gray-500">{emptyText}</p> : <div className="space-y-1">{children}</div>}
    </div>
  );
}

function BreakdownRow({ onClick, title, sub, value, valueClassName = 'text-gray-900' }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-surface"
    >
      <div>
        <div className="text-sm text-gray-900">{title}</div>
        {sub && <div className="text-xs text-gray-500">{sub}</div>}
      </div>
      <div className={`text-sm ${valueClassName}`}>{value}</div>
    </div>
  );
}

function DueColumn({ title, rows, onRowClick, emptyText }) {
  return (
    <div className="bg-surfaceRaised border border-gray-200 rounded-lg p-3">
      <div className="text-xs text-gray-500 mb-2">{title}</div>
      {rows.length === 0 && <p className="text-sm text-gray-500">{emptyText}</p>}
      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.id}
            onClick={() => onRowClick(r.id)}
            className="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-surface"
          >
            <div>
              <div className="text-sm text-gray-900">{r.name}</div>
              <div className="text-xs text-gray-500">since {formatDate(r.oldestDate)}</div>
            </div>
            <div className="text-sm text-due">{formatMoney(r.due)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
