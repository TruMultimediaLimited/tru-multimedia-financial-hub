import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { inputClass } from '../components/Field.jsx';
import { formatMoney } from '../lib/format.js';
import { useConcern } from '../context/ConcernContext.jsx';
import { fetchEmployeesFull } from '../lib/employeeData.js';
import EmployeeForm from './employees/EmployeeForm.jsx';

const TYPE_LABELS = { fixed: 'Fixed', remote: 'Remote', project_based: 'Project-based' };
const STATUS_BADGE = {
  active: 'bg-income/15 text-income border-income/30',
  on_leave: 'bg-due/15 text-due border-due/30',
  inactive: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export default function Employees() {
  const navigate = useNavigate();
  const { concerns } = useConcern();
  const realConcerns = concerns.filter((c) => c.parent_concern_id !== null);

  const [typeFilter, setTypeFilter] = useState('');
  const [concernFilter, setConcernFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEmployeesFull({ type: typeFilter || null, concernId: concernFilter || null })
      .then((rows) => !cancelled && setEmployees(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [typeFilter, concernFilter, reloadKey]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-100">Employees</h1>
        <button onClick={() => setFormOpen(true)} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-900">
          + New employee
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <select className={inputClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="fixed">Fixed</option>
          <option value="remote">Remote</option>
          <option value="project_based">Project-based</option>
        </select>
        <select className={inputClass} value={concernFilter} onChange={(e) => setConcernFilter(e.target.value)}>
          <option value="">All concerns</option>
          {realConcerns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && employees.length === 0 && (
        <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center text-gray-500">
          No employees found.
        </div>
      )}

      {!loading && employees.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="py-2 pr-3 font-normal">Name</th>
                  <th className="py-2 pr-3 font-normal">Type</th>
                  <th className="py-2 pr-3 font-normal">Concern</th>
                  <th className="py-2 pr-3 font-normal text-right">Salary/Rate</th>
                  <th className="py-2 pr-3 font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    onClick={() => navigate(`/employees/${emp.id}`)}
                    className="border-b border-gray-800/60 cursor-pointer hover:bg-surfaceRaised/60"
                  >
                    <td className="py-2.5 pr-3 text-gray-100">{emp.name}</td>
                    <td className="py-2.5 pr-3 text-gray-400">{TYPE_LABELS[emp.type]}</td>
                    <td className="py-2.5 pr-3 text-gray-400">{emp.concerns?.name}</td>
                    <td className="py-2.5 pr-3 text-right text-gray-300">
                      {emp.monthly_salary ? `${formatMoney(emp.monthly_salary)}/mo` : 'Per-project'}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge className={STATUS_BADGE[emp.status]}>{emp.status.replace('_', ' ')}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                onClick={() => navigate(`/employees/${emp.id}`)}
                className="border border-gray-800 rounded-lg p-3 cursor-pointer active:bg-surfaceRaised/60"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-100 font-medium">{emp.name}</span>
                  <Badge className={STATUS_BADGE[emp.status]}>{emp.status.replace('_', ' ')}</Badge>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {TYPE_LABELS[emp.type]} · {emp.concerns?.name}
                </div>
                <div className="text-sm text-gray-400">
                  {emp.monthly_salary ? `${formatMoney(emp.monthly_salary)}/mo` : 'Per-project'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <EmployeeForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
