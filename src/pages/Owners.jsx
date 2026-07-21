import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900">Owners</h1>
        <button onClick={() => setFormOpen(true)} className="px-3 py-1.5 rounded-md text-sm bg-gray-900 text-white">
          + New owner
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Partner-level balances — how much each owner has personally received vs. given on the company's behalf, plus capital invested.
      </p>

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && owners.length === 0 && (
        <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">No owners yet.</div>
      )}

      {!loading && owners.length > 0 && (
        <div className="space-y-2">
          {owners.map((o) => (
            <div
              key={o.id}
              onClick={() => navigate(`/owners/${o.id}`)}
              className="bg-surfaceRaised border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-surface"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-900 font-medium">{o.name}</span>
                <span className="text-xs text-gray-500">
                  {o.role || 'Partner'}
                  {o.company_share_percent != null && ` · ${o.company_share_percent}% share`}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
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

      <OwnerForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
