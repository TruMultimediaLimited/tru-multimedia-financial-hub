import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { formatMoney, formatDate } from '../lib/format.js';
import { fetchEmployee, deleteEmployee, fetchWorkLogs, updateWorkLog, deleteWorkLog } from '../lib/employeeData.js';
import EmployeeForm from './employees/EmployeeForm.jsx';
import WorkLogForm from './employees/WorkLogForm.jsx';

const TYPE_LABELS = { fixed: 'Fixed', remote: 'Remote', project_based: 'Project-based' };

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [workLogs, setWorkLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchEmployee(id), fetchWorkLogs(id)])
      .then(([emp, logs]) => {
        if (cancelled) return;
        setEmployee(emp);
        setWorkLogs(logs);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  async function handleDelete() {
    if (!window.confirm(`Delete ${employee.name}?`)) return;
    try {
      await deleteEmployee(id);
      navigate('/employees');
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error && !employee) return <p className="text-sm text-expense">{error}</p>;
  if (!employee) return null;

  const isProjectBased = employee.type === 'project_based';
  const totalPaid = workLogs.filter((l) => l.paid).reduce((s, l) => s + Number(l.amount), 0);
  const totalUnpaid = workLogs.filter((l) => !l.paid).reduce((s, l) => s + Number(l.amount), 0);

  const projectGroups = isProjectBased
    ? Array.from(
        workLogs.reduce((map, log) => {
          const key = log.project_id ?? 'none';
          const label = log.projects?.title ?? 'No project';
          const entry = map.get(key) ?? { label, logs: [], total: 0, unpaid: 0 };
          entry.logs.push(log);
          entry.total += Number(log.amount);
          if (!log.paid) entry.unpaid += Number(log.amount);
          map.set(key, entry);
          return map;
        }, new Map())
      ).map(([key, val]) => ({ key, ...val }))
    : [];

  return (
    <div>
      <button onClick={() => navigate('/employees')} className="text-xs text-gray-500 mb-3">
        ← Back to Employees
      </button>

      <div className="border border-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-lg font-semibold text-gray-100">{employee.name}</div>
            <div className="text-xs text-gray-500">
              {employee.role || 'No role set'} · {employee.concerns?.name}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-md text-xs border border-gray-700 text-gray-300">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-md text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <Badge className="bg-surfaceRaised text-gray-300 border-gray-700">{TYPE_LABELS[employee.type]}</Badge>
          <Badge className="bg-surfaceRaised text-gray-300 border-gray-700">{employee.status.replace('_', ' ')}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Salary/Rate</div>
            <div className="text-gray-100">{employee.monthly_salary ? `${formatMoney(employee.monthly_salary)}/mo` : 'Per-project'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Paid to date</div>
            <div className="text-gray-100">{formatMoney(totalPaid)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Unpaid</div>
            <div className={totalUnpaid > 0 ? 'text-due' : 'text-gray-100'}>{formatMoney(totalUnpaid)}</div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      {isProjectBased ? (
        <>
          <h2 className="text-sm font-medium text-gray-300 mb-2">Linked projects</h2>
          {projectGroups.length === 0 && <p className="text-sm text-gray-500 mb-4">No work logged yet.</p>}
          <div className="space-y-3 mb-4">
            {projectGroups.map((g) => (
              <div key={g.key} className="border border-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-100">{g.label}</span>
                  <span className="text-sm text-gray-300">{formatMoney(g.total)}</span>
                </div>
                <div className="space-y-1">
                  {g.logs.map((log) => (
                    <WorkLogRow key={log.id} log={log} onChanged={() => setReloadKey((k) => k + 1)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="text-sm font-medium text-gray-300 mb-2">Salary history</h2>
          {workLogs.length === 0 && <p className="text-sm text-gray-500 mb-4">No payments logged yet.</p>}
          <div className="space-y-2 mb-4">
            {workLogs.map((log) => (
              <WorkLogRow key={log.id} log={log} onChanged={() => setReloadKey((k) => k + 1)} />
            ))}
          </div>
        </>
      )}

      <h2 className="text-sm font-medium text-gray-300 mb-2">{isProjectBased ? 'Log project work' : 'Log payment'}</h2>
      <WorkLogForm
        employeeId={employee.id}
        concernId={employee.concern_id}
        isProjectBased={isProjectBased}
        onSaved={() => setReloadKey((k) => k + 1)}
      />

      <EmployeeForm open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} employee={employee} />
    </div>
  );
}

function WorkLogRow({ log, onChanged }) {
  async function togglePaid() {
    await updateWorkLog(log.id, { paid: !log.paid });
    onChanged();
  }

  async function handleDelete() {
    if (!window.confirm('Delete this entry?')) return;
    await deleteWorkLog(log.id);
    onChanged();
  }

  return (
    <div className="flex items-center justify-between border border-gray-800 rounded-lg p-3">
      <div>
        <div className="text-gray-100 text-sm">{log.task_description}</div>
        <div className="text-xs text-gray-500">
          {formatDate(log.work_date)} · {formatMoney(log.amount)}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={togglePaid}
          className={`px-2 py-0.5 rounded-full text-xs border ${
            log.paid ? 'bg-income/15 text-income border-income/30' : 'bg-due/15 text-due border-due/30'
          }`}
        >
          {log.paid ? 'Paid' : 'Unpaid'}
        </button>
        <button onClick={handleDelete} className="text-xs text-expense">
          Delete
        </button>
      </div>
    </div>
  );
}
