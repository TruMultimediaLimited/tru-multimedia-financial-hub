import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award } from 'lucide-react';
import Badge from '../components/Badge.jsx';
import BackButton from '../components/BackButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import PageTitle from '../components/PageTitle.jsx';
import { ENTITY_COLORS } from '../lib/entityColors.js';
import { formatMoney } from '../lib/format.js';
import { fetchOwnersWithTotals } from '../lib/ownerData.js';

export default function Owners() {
  const navigate = useNavigate();

  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, []);

  return (
    <div>
      <BackButton />
      <div className="mb-4">
        <PageTitle colorClass="bg-rose-100 border-rose-200 text-rose-700">Owners</PageTitle>
      </div>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && owners.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8">
          <EmptyState icon={Award} message="No owners yet." />
        </div>
      )}

      {!loading && owners.length > 0 && (
        <div className="space-y-2">
          {owners.map((o) => (
            <div
              key={o.id}
              onClick={() => navigate(`/owners/${o.id}`)}
              className={`${ENTITY_COLORS.owner.bg} border border-slate-200 border-l-4 ${ENTITY_COLORS.owner.border} rounded-2xl shadow-card p-4 cursor-pointer hover:bg-surface`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-900 font-medium">{o.name}</span>
                <span className="text-xs text-slate-500">
                  {o.role || 'Partner'}
                  {o.company_share_percent != null && ` · ${o.company_share_percent}% share`}
                </span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Received {formatMoney(o.totalReceived)}</span>
                <span>Given {formatMoney(o.totalGiven)}</span>
                <span>Invested {formatMoney(o.totalInvested)}</span>
                {o.netOwedToOwner !== 0 && (
                  <Badge className={o.netOwedToOwner > 0 ? 'bg-due/15 text-due border-due/30' : 'bg-income/15 text-income border-income/30'}>
                    {o.netOwedToOwner > 0
                      ? `Company owes ${formatMoney(o.netOwedToOwner)}`
                      : `Owes company ${formatMoney(-o.netOwedToOwner)}`}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
