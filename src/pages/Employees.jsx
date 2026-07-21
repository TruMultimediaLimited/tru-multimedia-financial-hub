import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchEmployeesFull } from '../lib/employeeData.js';
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
    fetchEmployeesFull()
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-slate-900">Employees</h1>
        <button onClick={() => setFormOpen(true)} className="px-3 py-1.5 rounded-md text-sm bg-primary text-white hover:bg-primaryHover">
          + New employee
        </button>
      </div>

      <input
        placeholder="Search by name or role"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-surfaceRaised border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 mb-4"
      />

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
          No employees found.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((emp) => (
            <div
              key={emp.id}
              onClick={() => navigate(`/employees/${emp.id}`)}
              className="flex items-center justify-between border border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-surfaceRaised/60"
            >
              <span className="text-slate-900 font-medium">{emp.name}</span>
              <span className="text-sm text-slate-500">{emp.role || 'No role set'}</span>
            </div>
          ))}
        </div>
      )}

      <EmployeeForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
