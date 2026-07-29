import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import BackButton from '../components/BackButton.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageTitle from '../components/PageTitle.jsx';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { formatMoney, STATUS_STYLES, STATUS_LABELS, PAYMENT_ROW_TINT } from '../lib/format.js';
import { fetchEmployeesWithTotals } from '../lib/employeeData.js';
import EmployeeForm from './employees/EmployeeForm.jsx';

const TYPE_LABELS = { fixed: 'Fixed Salary', project_based: 'Project', remote: 'Remote' };

export default function Employees() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEmployeesWithTotals()
      .then((rows) => !cancelled && setEmployees(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) || (emp.role ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <BackButton />
      <div className="flex items-center justify-between gap-2 mb-4">
        <PageTitle colorClass="bg-teal-100 border-teal-200 text-teal-700">Employees</PageTitle>
        <button
          onClick={() => setFormOpen(true)}
          className="h-8 inline-flex items-center justify-center rounded-full px-3 text-xs font-bold bg-primary/15 text-primary border border-primary/30"
        >
          + New employee
        </button>
      </div>

      <input
        placeholder="Search by name or role"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-surfaceRaised border border-slate-300 rounded-xl px-3 py-3 md:py-2 text-sm text-slate-900 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 mb-4"
      />

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8">
          <EmptyState icon={UserCog} message="No employees found." />
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal">Name</th>
                  <th className="py-2 pr-3 font-normal">Role</th>
                  <th className="py-2 pr-3 font-normal">Type</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
                  <th className="py-2 pr-3 font-normal text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    className="border-b border-slate-200/60 cursor-pointer hover:bg-surfaceRaised/60"
                  >
                    <td className="py-2.5 pr-3 text-slate-900">{emp.name}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{emp.role || '—'}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{TYPE_LABELS[emp.type] ?? emp.type}</td>
                    <td className="py-2.5 pr-3">
                      {emp.status !== 'none' ? (
                        <Badge className={STATUS_STYLES[emp.status]}>{STATUS_LABELS[emp.status]}</Badge>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right">
                      {emp.totalDue > 0 ? <span className="text-due">{formatMoney(emp.totalDue)}</span> : <span className="text-slate-500">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {filtered.map((emp) => {
              const rowTint =
                emp.status === 'none'
                  ? `${ENTITY_COLORS.employee.bg} ${ENTITY_COLORS.employee.border}`
                  : PAYMENT_ROW_TINT[emp.status];
              return (
                <div
                  key={emp.id}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  className={`flex items-center justify-between border border-slate-200 border-l-4 rounded-2xl shadow-card p-4 cursor-pointer hover:bg-surface ${rowTint}`}
                >
                  <div>
                    <div className="text-slate-900 font-medium">{emp.name}</div>
                    <div className="text-sm text-slate-500">
                      {emp.role || 'No role set'}
                      {emp.type === 'fixed' && ' · Fixed Salary'}
                    </div>
                  </div>
                  {emp.status !== 'none' && (
                    <div className="text-right">
                      <Badge className={STATUS_STYLES[emp.status]}>{STATUS_LABELS[emp.status]}</Badge>
                      {emp.totalDue > 0 && <div className="text-xs text-due mt-1">{formatMoney(emp.totalDue)} due</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <EmployeeForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
