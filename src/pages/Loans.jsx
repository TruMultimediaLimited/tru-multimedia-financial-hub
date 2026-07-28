import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import BackButton from '../components/BackButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageTitle from '../components/PageTitle.jsx';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { formatMoney, formatDate } from '../lib/format.js';
import { fetchLoansWithTotals } from '../lib/loanData.js';
import LoanForm from './loans/LoanForm.jsx';

export default function Loans() {
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLoansWithTotals()
      .then((rows) => !cancelled && setLoans(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div>
      <BackButton />
      <div className="flex items-center gap-2 mb-4">
        <PageTitle colorClass="bg-amber-100 border-amber-200 text-amber-700">Loans</PageTitle>
        <button
          onClick={() => setFormOpen(true)}
          className="h-8 inline-flex items-center justify-center rounded-full px-3 text-xs font-bold bg-primary/15 text-primary border border-primary/30"
        >
          + New loan
        </button>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && loans.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8">
          <EmptyState icon={Landmark} message="No loans yet." />
        </div>
      )}

      {!loading && loans.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal">Name</th>
                  <th className="py-2 pr-3 font-normal text-right">Principal</th>
                  <th className="py-2 pr-3 font-normal">Since</th>
                  <th className="py-2 pr-3 font-normal text-right">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr
                    key={loan.id}
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    className="border-b border-slate-200/60 cursor-pointer hover:bg-surfaceRaised/60"
                  >
                    <td className="py-2.5 pr-3 text-slate-900">{loan.name}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-700">{formatMoney(loan.principal_amount)}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{formatDate(loan.start_date)}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-900 font-medium">{formatMoney(loan.remainingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {loans.map((loan) => (
              <div
                key={loan.id}
                onClick={() => navigate(`/loans/${loan.id}`)}
                className={`flex items-center justify-between border border-slate-200 border-l-4 ${ENTITY_COLORS.loan.bg} ${ENTITY_COLORS.loan.border} rounded-2xl shadow-card p-4 cursor-pointer hover:bg-surface`}
              >
                <div>
                  <div className="text-slate-900 font-medium">{loan.name}</div>
                  <div className="text-xs text-slate-500">
                    Principal {formatMoney(loan.principal_amount)} · since {formatDate(loan.start_date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Remaining</div>
                  <div className="text-lg font-bold text-slate-900">{formatMoney(loan.remainingBalance)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <LoanForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
