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
      <div className="flex items-center gap-2 mb-4">
        <PageTitle colorClass="bg-teal-100 border-teal-200 text-teal-700">Employees</PageTitle>
        <button
          onClick={() => setFormOpen(true)}
          className="flex-1 h-8 flex items-center justify-center rounded-full text-xs font-bold bg-teal-100 text-teal-700 border border-teal-200"
        >
          + New employee
        </button>
      </div>

      <input
        placeholder="Search by name or role"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-surfaceRaised border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-900 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 mb-4"
      />

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8">
          <EmptyState icon={UserCog} message="No employees found." />
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
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
                  <div className="text-sm text-slate-500">{emp.role || 'No role set'}</div>
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
      )}

      <EmployeeForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
