import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConcern } from '../context/ConcernContext.jsx';
import { supabase } from '../lib/supabase.js';
import { inputClass } from '../components/Field.jsx';
import BackButton from '../components/BackButton.jsx';
import BarChart from '../components/BarChart.jsx';
import { formatMoney, CHANNEL_LABELS } from '../lib/format.js';
import { fetchProjects } from '../lib/ledgerData.js';
import { fetchDueSummary } from '../lib/dashboardData.js';
import { fetchChannelBreakdown } from '../lib/dashboardData.js';
import { fetchIncomeExpenseReport, fetchPLByPeriod, fetchEmployeeCostReport, toCsv, downloadCsv } from '../lib/reportsData.js';

export default function Reports() {
  const navigate = useNavigate();
  const { concerns } = useConcern();
  const realConcerns = concerns;

  const [concernId, setConcernId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [plPeriod, setPlPeriod] = useState('month');
  const [dueSort, setDueSort] = useState('amount');

  const [projects, setProjects] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const [incomeExpense, setIncomeExpense] = useState({ totals: { income: 0, expense: 0 }, byCategory: [], byMonth: [] });
  const [plRows, setPlRows] = useState([]);
  const [dueSummary, setDueSummary] = useState({ receivables: [], payables: [] });
  const [channels, setChannels] = useState([]);
  const [employeeCosts, setEmployeeCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user ?? null));
  }, []);

  useEffect(() => {
    fetchProjects(concernId || null).then(setProjects).catch((e) => setError(e.message));
  }, [concernId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const filters = { dateFrom: dateFrom || null, dateTo: dateTo || null, concernId: concernId || null, projectId: projectId || null };

    Promise.all([
      fetchIncomeExpenseReport(filters),
      fetchPLByPeriod({ ...filters, period: plPeriod }),
      fetchDueSummary(concernId || null),
      fetchChannelBreakdown({ concernId: concernId || null, currentUserId: currentUser?.id ?? null, dateFrom: dateFrom || null, dateTo: dateTo || null }),
      fetchEmployeeCostReport(filters),
    ])
      .then(([ie, pl, due, ch, cost]) => {
        if (cancelled) return;
        setIncomeExpense(ie);
        setPlRows(pl);
        setDueSummary(due);
        setChannels(ch);
        setEmployeeCosts(cost);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, concernId, projectId, plPeriod, currentUser]);

  function sortedDue(rows) {
    return [...rows].sort((a, b) => (dueSort === 'amount' ? b.due - a.due : a.oldestDate < b.oldestDate ? -1 : 1));
  }

  function exportDueCsv() {
    const rows = [
      ...sortedDue(dueSummary.receivables).map((r) => ({ ...r, kind: 'Receivable' })),
      ...sortedDue(dueSummary.payables).map((r) => ({ ...r, kind: 'Payable' })),
    ];
    const csv = toCsv(rows, [
      { label: 'Type', value: (r) => r.kind },
      { label: 'Name', value: (r) => r.name },
      { label: 'Due amount', value: (r) => r.due },
      { label: 'Outstanding since', value: (r) => r.oldestDate },
    ]);
    downloadCsv('due-report.csv', csv);
  }

  return (
    <div>
      <BackButton />
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Reports</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <select className={inputClass} value={concernId} onChange={(e) => setConcernId(e.target.value)}>
          <option value="">All concerns</option>
          {realConcerns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={inputClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <input type="date" className={inputClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
        <input type="date" className={inputClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && (
        <>
          {/* Income vs Expense */}
          <Section title="Income vs Expense">
            <div className="flex gap-4 mb-3 text-sm">
              <span className="text-income">Income {formatMoney(incomeExpense.totals.income)}</span>
              <span className="text-expense">Expense {formatMoney(incomeExpense.totals.expense)}</span>
            </div>
            <BarChart
              data={incomeExpense.byMonth}
              xKey="month"
              series={[
                { key: 'income', label: 'Income', color: '#16A34A' },
                { key: 'expense', label: 'Expense', color: '#DC2626' },
              ]}
            />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3 font-normal">Category</th>
                    <th className="py-2 pr-3 font-normal text-right">Income</th>
                    <th className="py-2 pr-3 font-normal text-right">Expense</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeExpense.byCategory.map((c) => (
                    <tr key={c.category} className="border-b border-slate-200/60">
                      <td className="py-2 pr-3 text-slate-900">{c.category}</td>
                      <td className="py-2 pr-3 text-right text-income">{c.income > 0 ? formatMoney(c.income) : '—'}</td>
                      <td className="py-2 pr-3 text-right text-expense">{c.expense > 0 ? formatMoney(c.expense) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Profit / Loss */}
          <Section title="Profit / Loss">
            <div className="flex gap-1 mb-3">
              {['month', 'quarter', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPlPeriod(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border ${
                    plPeriod === p ? 'bg-primary text-white border-primary' : 'bg-surfaceRaised text-slate-600 border-slate-200'
                  }`}
                >
                  {p}ly
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2 pr-3 font-normal">Period</th>
                    <th className="py-2 pr-3 font-normal text-right">Income</th>
                    <th className="py-2 pr-3 font-normal text-right">Expense</th>
                    <th className="py-2 pr-3 font-normal text-right">Net P/L</th>
                  </tr>
                </thead>
                <tbody>
                  {plRows.map((r) => (
                    <tr key={r.period} className="border-b border-slate-200/60">
                      <td className="py-2 pr-3 text-slate-900">{r.period}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{formatMoney(r.income)}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{formatMoney(r.expense)}</td>
                      <td className={`py-2 pr-3 text-right ${r.netPl >= 0 ? 'text-income' : 'text-expense'}`}>{formatMoney(r.netPl)}</td>
                    </tr>
                  ))}
                  {plRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-slate-500">
                        No transactions in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          {/* Due report */}
          <Section
            title="Due report"
            action={
              <div className="flex gap-1">
                <button
                  onClick={() => setDueSort('amount')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    dueSort === 'amount' ? 'bg-primary text-white border-primary' : 'bg-surfaceRaised text-slate-600 border-slate-200'
                  }`}
                >
                  By amount
                </button>
                <button
                  onClick={() => setDueSort('age')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    dueSort === 'age' ? 'bg-primary text-white border-primary' : 'bg-surfaceRaised text-slate-600 border-slate-200'
                  }`}
                >
                  By age
                </button>
                <button onClick={exportDueCsv} className="px-2 py-1 rounded-xl text-xs border border-slate-300 text-slate-700">
                  Export CSV
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DueList title="Receivable" rows={sortedDue(dueSummary.receivables)} onRowClick={(id) => navigate(`/clients/${id}`)} />
              <DueList title="Payable" rows={sortedDue(dueSummary.payables)} onRowClick={(id) => navigate(`/employees/${id}`)} />
            </div>
          </Section>

          {/* Payment channel report */}
          <Section title="Payment channel report">
            {channels.length === 0 ? (
              <p className="text-sm text-slate-500">No payments in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 font-normal">Channel</th>
                      <th className="py-2 pr-3 font-normal">Handled by</th>
                      <th className="py-2 pr-3 font-normal text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((row) => (
                      <tr key={`${row.channel}|${row.handler}`} className="border-b border-slate-200/60">
                        <td className="py-2 pr-3 text-slate-700">{CHANNEL_LABELS[row.channel] ?? row.channel}</td>
                        <td className="py-2 pr-3 text-slate-700">{row.handler}</td>
                        <td className="py-2 pr-3 text-right text-slate-900">{formatMoney(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Employee cost report */}
          <Section title="Employee cost report">
            {employeeCosts.length === 0 ? (
              <p className="text-sm text-slate-500">No employee expenses in this range.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 font-normal">Employee</th>
                      <th className="py-2 pr-3 font-normal">Role</th>
                      <th className="py-2 pr-3 font-normal text-right">Total paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeCosts.map((r) => (
                      <tr
                        key={r.employeeId}
                        onClick={() => navigate(`/employees/${r.employeeId}`)}
                        className="border-b border-slate-200/60 cursor-pointer hover:bg-surfaceRaised/60"
                      >
                        <td className="py-2 pr-3 text-slate-900">{r.name}</td>
                        <td className="py-2 pr-3 text-slate-500">{r.role || '—'}</td>
                        <td className="py-2 pr-3 text-right text-slate-900">{formatMoney(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, action, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-slate-700">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function DueList({ title, rows, onRowClick }) {
  return (
    <div className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-4">
      <div className="text-xs text-slate-500 mb-2">{title}</div>
      {rows.length === 0 && <p className="text-sm text-slate-500">None.</p>}
      <div className="space-y-1">
        {rows.map((r) => (
          <div
            key={r.id}
            onClick={() => onRowClick(r.id)}
            className="flex items-center justify-between py-1.5 px-2 rounded-xl cursor-pointer hover:bg-surface"
          >
            <span className="text-sm text-slate-900">{r.name}</span>
            <span className="text-sm text-due">{formatMoney(r.due)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
