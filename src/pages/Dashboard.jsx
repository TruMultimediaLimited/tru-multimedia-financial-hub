import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConcern } from '../context/ConcernContext.jsx';
import { supabase } from '../lib/supabase.js';
import Badge from '../components/Badge.jsx';
import { formatMoney, formatDate, CHANNEL_LABELS } from '../lib/format.js';
import { fetchConcernPL, fetchDueSummary, fetchChannelBreakdown } from '../lib/dashboardData.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { concerns, selectedConcernId, setSelectedConcernId } = useConcern();
  const realConcerns = concerns.filter((c) => c.parent_concern_id !== null);

  const [pl, setPl] = useState({ totalIncome: 0, totalExpense: 0, netPl: 0 });
  const [dueSummary, setDueSummary] = useState({ receivables: [], payables: [] });
  const [channels, setChannels] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dueSort, setDueSort] = useState('amount');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      fetchConcernPL(selectedConcernId || null),
      fetchDueSummary(selectedConcernId || null),
      fetchChannelBreakdown({ concernId: selectedConcernId || null, currentUserId: currentUser?.id ?? null }),
    ])
      .then(([plResult, dueResult, channelResult]) => {
        if (cancelled) return;
        setPl(plResult);
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

  const totalReceivable = dueSummary.receivables.reduce((sum, r) => sum + r.due, 0);
  const totalPayable = dueSummary.payables.reduce((sum, r) => sum + r.due, 0);

  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-100 mb-4">Dashboard</h1>

      <div className="flex flex-wrap gap-2 mb-5">
        <ConcernChip active={!selectedConcernId} label="সকল (Consolidated)" onClick={() => setSelectedConcernId(null)} />
        {realConcerns.map((c) => (
          <ConcernChip
            key={c.id}
            active={selectedConcernId === c.id}
            label={c.name}
            onClick={() => setSelectedConcernId(c.id)}
          />
        ))}
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <SummaryCard
              label="Total Income"
              sub="Received + Due"
              value={formatMoney(pl.totalIncome)}
              accent="text-income"
              footnote={totalReceivable > 0 ? `${formatMoney(totalReceivable)} due` : null}
            />
            <SummaryCard
              label="Total Expense"
              value={formatMoney(pl.totalExpense)}
              accent="text-expense"
              footnote={totalPayable > 0 ? `${formatMoney(totalPayable)} due` : null}
            />
            <SummaryCard
              label="Net Profit/Loss"
              value={formatMoney(pl.netPl)}
              accent={pl.netPl >= 0 ? 'text-income' : 'text-expense'}
            />
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-gray-300">Due list</h2>
            <div className="flex gap-1">
              <SortButton active={dueSort === 'amount'} onClick={() => setDueSort('amount')} label="By amount" />
              <SortButton active={dueSort === 'age'} onClick={() => setDueSort('age')} label="By age" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <DueColumn
              title="Receivable — clients owe us"
              rows={sortRows(dueSummary.receivables)}
              onRowClick={(id) => navigate(`/clients/${id}`)}
              emptyText="No outstanding client dues."
            />
            <DueColumn
              title="Payable — we owe vendors"
              rows={sortRows(dueSummary.payables)}
              onRowClick={(id) => navigate(`/vendors/${id}`)}
              emptyText="No outstanding vendor dues."
            />
          </div>

          <h2 className="text-sm font-medium text-gray-300 mb-2">Channel breakdown</h2>
          {channels.length === 0 ? (
            <p className="text-sm text-gray-500">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-800">
                    <th className="py-2 pr-3 font-normal">Channel</th>
                    <th className="py-2 pr-3 font-normal">Handled by</th>
                    <th className="py-2 pr-3 font-normal text-right">Total</th>
                    <th className="py-2 pr-3 font-normal text-right">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((row) => (
                    <tr key={`${row.channel}|${row.handler}`} className="border-b border-gray-800/60">
                      <td className="py-2 pr-3">
                        <Badge className="bg-surfaceRaised text-gray-300 border-gray-700">
                          {CHANNEL_LABELS[row.channel] ?? row.channel}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-gray-300">{row.handler}</td>
                      <td className="py-2 pr-3 text-right text-gray-100">{formatMoney(row.total)}</td>
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

function ConcernChip({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs border ${
        active ? 'bg-gray-100 text-gray-900 border-gray-100' : 'border-gray-700 text-gray-400'
      }`}
    >
      {label}
    </button>
  );
}

function SortButton({ active, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md text-xs ${active ? 'bg-surfaceRaised text-gray-100' : 'text-gray-500'}`}
    >
      {label}
    </button>
  );
}

function SummaryCard({ label, sub, value, accent, footnote }) {
  return (
    <div className="border border-gray-800 rounded-lg p-4">
      <div className="text-xs text-gray-500">
        {label}
        {sub && <span className="text-gray-600"> ({sub})</span>}
      </div>
      <div className={`text-xl font-semibold mt-1 ${accent}`}>{value}</div>
      {footnote && <div className="text-xs text-due mt-1">{footnote}</div>}
    </div>
  );
}

function DueColumn({ title, rows, onRowClick, emptyText }) {
  return (
    <div className="border border-gray-800 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-2">{title}</div>
      {rows.length === 0 && <p className="text-sm text-gray-500">{emptyText}</p>}
      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.id}
            onClick={() => onRowClick(r.id)}
            className="flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer hover:bg-surfaceRaised/60"
          >
            <div>
              <div className="text-sm text-gray-100">{r.name}</div>
              <div className="text-xs text-gray-500">since {formatDate(r.oldestDate)}</div>
            </div>
            <div className="text-sm text-due">{formatMoney(r.due)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
