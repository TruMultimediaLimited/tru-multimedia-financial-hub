import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award } from 'lucide-react';
import BackButton from '../components/BackButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageTitle from '../components/PageTitle.jsx';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { formatMoney } from '../lib/format.js';
import { fetchOwnersWithTotals } from '../lib/ownerData.js';
import OwnerForm from './owners/OwnerForm.jsx';

export default function Owners() {
  const navigate = useNavigate();

  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchOwnersWithTotals()
      .then((rows) => !cancelled && setOwners(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  return (
    <div>
      <BackButton />
      <div className="flex items-center justify-between gap-2 mb-4">
        <PageTitle colorClass="bg-rose-100 border-rose-200 text-rose-700">Owners</PageTitle>
        <button
          onClick={() => setFormOpen(true)}
          className="h-8 inline-flex items-center justify-center rounded-full px-3 text-xs font-bold bg-primary/15 text-primary border border-primary/30"
        >
          + New owner
        </button>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && owners.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8">
          <EmptyState icon={Award} message="No owners yet." />
        </div>
      )}

      {!loading && owners.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal">Name</th>
                  <th className="py-2 pr-3 font-normal text-right">Received</th>
                  <th className="py-2 pr-3 font-normal text-right">Given</th>
                  <th className="py-2 pr-3 font-normal text-right">Net</th>
                  <th className="py-2 pr-3 font-normal text-right">Invested</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => navigate(`/owners/${o.id}`)}
                    className="border-b border-slate-200/60 cursor-pointer hover:bg-surfaceRaised/60"
                  >
                    <td className="py-2.5 pr-3 text-slate-900">{o.name}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-700">{formatMoney(o.totalReceived)}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-700">{formatMoney(o.totalGiven)}</td>
                    <td className="py-2.5 pr-3 text-right text-due">{formatMoney(o.netOwedToOwner)}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-700">{formatMoney(o.totalInvested)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {owners.map((o) => (
              <div
                key={o.id}
                onClick={() => navigate(`/owners/${o.id}`)}
                className={`${ENTITY_COLORS.owner.bg} border border-slate-200 border-l-4 ${ENTITY_COLORS.owner.border} rounded-2xl shadow-card p-4 cursor-pointer hover:bg-surface flex items-center justify-between`}
              >
                <span className="text-slate-900 font-medium">{o.name}</span>
                <span className="text-xs text-primary underline underline-offset-2">View more</span>
              </div>
            ))}
          </div>
        </>
      )}

      <OwnerForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
