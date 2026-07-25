import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import BackButton from '../components/BackButton.jsx';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { formatMoney, formatDate, STATUS_STYLES, STATUS_LABELS, PAYMENT_ROW_TINT } from '../lib/format.js';
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
  const [paymentFilter, setPaymentFilter] = useState('all');

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

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error && !employee) return <p className="text-sm text-expense">{error}</p>;
  if (!employee) return null;

  const totalPaid = transactions.reduce((s, t) => s + computeBalances(t).paidAmount, 0);
  const totalDue = transactions.reduce((s, t) => s + computeBalances(t).dueAmount, 0);
  const visibleTransactions = transactions.filter(
    (t) => paymentFilter === 'all' || computeBalances(t).status === paymentFilter
  );

  return (
    <div>
      <BackButton />

      <div className={`${ENTITY_COLORS.employee.bg} border border-slate-200 border-l-4 ${ENTITY_COLORS.employee.border} rounded-2xl shadow-card p-4 mb-4`}>
        <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-900 break-words">{employee.name}</div>
            <div className="text-xs text-slate-500">{employee.role || 'No role set'}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEditOpen(true)} className="px-3 py-1.5 rounded-xl text-xs border border-slate-300 text-slate-700">
              Edit
            </button>
            <button onClick={handleDelete} className="px-3 py-1.5 rounded-xl text-xs border border-expense/40 text-expense">
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-slate-500">Paid to date</div>
            <div className="text-slate-900">{formatMoney(totalPaid)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Due</div>
            <div className={totalDue > 0 ? 'text-due' : 'text-slate-900'}>{formatMoney(totalDue)}</div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm font-medium text-slate-700">Expense history</h2>
        <div className="flex gap-1">
          <PaymentFilterButton active={paymentFilter === 'all'} onClick={() => setPaymentFilter('all')} label="All" />
          <PaymentFilterButton active={paymentFilter === 'paid'} onClick={() => setPaymentFilter('paid')} label="Paid" />
          <PaymentFilterButton active={paymentFilter === 'partial'} onClick={() => setPaymentFilter('partial')} label="Partial" />
          <PaymentFilterButton active={paymentFilter === 'pending'} onClick={() => setPaymentFilter('pending')} label="Due" />
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-2">
        Who was given how much and when — add a new entry from a project's own page ("+ Add team member" or "+ Other Expense").
      </p>
      {transactions.length === 0 && <p className="text-sm text-slate-500">No expenses recorded for this employee yet.</p>}
      {transactions.length > 0 && visibleTransactions.length === 0 && (
        <p className="text-sm text-slate-500">No entries match this filter.</p>
      )}
      <div className="space-y-2">
        {visibleTransactions.map((t) => {
          const { status } = computeBalances(t);
          return (
            <div
              key={t.id}
              onClick={() => navigate(`/ledger/${t.id}`)}
              className={`flex items-center justify-between border border-slate-200 border-l-4 rounded-xl p-3 cursor-pointer hover:bg-surface ${PAYMENT_ROW_TINT[status]}`}
            >
              <div>
                <div className="text-sm text-slate-900">{t.category || 'Uncategorized'}</div>
                <div className="text-xs text-slate-500">
                  {t.concerns?.name} · {formatDate(t.transaction_date)}
                  {t.projects?.title && ` · ${t.projects.title}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-900">{formatMoney(t.total_amount)}</div>
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

function PaymentFilterButton({ active, label, onClick }) {
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
