import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS } from '../lib/format.js';
import { fetchTransactions, computeBalances } from '../lib/ledgerData.js';
import { fetchEmployee, deleteEmployee } from '../lib/employeeData.js';
import EmployeeForm from './employees/EmployeeForm.jsx';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchEmployee(id), fetchTransactions({ employeeId: id })])
      .then(([emp, txns]) => {
        if (cancelled) return;
        setEmployee(emp);
        setTransactions(txns);
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

  const totalPaid = transactions.reduce((s, t) => s + computeBalances(t).paidAmount, 0);
  const totalDue = transactions.reduce((s, t) => s + computeBalances(t).dueAmount, 0);

  return (
    <div>
      <button onClick={() => navigate('/employees')} className="text-xs text-gray-500 mb-3">
        ← Back to Employees
      </button>

      <div className="bg-surfaceRaised border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-lg font-semibold text-gray-900">{employee.name}</div>
            <div className="text-xs text-gray-500">{employee.role || 'No role set'}</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-md text-xs border border-gray-300 text-gray-700">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-md text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">Paid to date</div>
            <div className="text-gray-900">{formatMoney(totalPaid)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Due</div>
            <div className={totalDue > 0 ? 'text-due' : 'text-gray-900'}>{formatMoney(totalDue)}</div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <h2 className="text-sm font-medium text-gray-700 mb-2">Expense history</h2>
      <p className="text-xs text-gray-500 mb-2">
        Who was given how much and when — add a new entry from Expense → + Add expense with this employee selected.
      </p>
      {transactions.length === 0 && <p className="text-sm text-gray-500">No expenses recorded for this employee yet.</p>}
      <div className="space-y-2">
        {transactions.map((t) => {
          const { status } = computeBalances(t);
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/ledger/${t.id}`)}
              className="flex items-center justify-between border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-surfaceRaised/60"
            >
              <div>
                <div className="text-sm text-gray-900">{t.category || 'Uncategorized'}</div>
                <div className="text-xs text-gray-500">
                  {t.concerns?.name} · {formatDate(t.transaction_date)}
                  {t.projects?.title && ` · ${t.projects.title}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-900">{formatMoney(t.total_amount)}</div>
                <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>
              </div>
            </div>
          );
        })}
      </div>

      <EmployeeForm open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} employee={employee} />
    </div>
  );
}
