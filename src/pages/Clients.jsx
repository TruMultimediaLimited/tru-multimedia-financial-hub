import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import Badge from '../components/Badge.jsx';
import BackButton from '../components/BackButton.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatMoney } from '../lib/format.js';
import { fetchClientsWithTotals } from '../lib/partyData.js';
import PartyForm from './parties/PartyForm.jsx';

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchClientsWithTotals()
      .then((rows) => !cancelled && setClients(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? '').includes(search)
  );

  return (
    <div>
      <BackButton />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="px-3 py-1.5 rounded-xl text-sm bg-primary text-white hover:bg-primaryHover"
        >
          + New client
        </button>
      </div>

      <input
        placeholder="Search by name or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-surfaceRaised border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-900 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 mb-4"
      />

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="border border-dashed border-slate-300 rounded-2xl p-8">
          <EmptyState icon={Users} message="No clients found." />
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-3 font-normal">Name</th>
                  <th className="py-2 pr-3 font-normal">Contact</th>
                  <th className="py-2 pr-3 font-normal text-right">Billed</th>
                  <th className="py-2 pr-3 font-normal text-right">Paid</th>
                  <th className="py-2 pr-3 font-normal text-right">Due</th>
                  <th className="py-2 pr-3 font-normal text-right">Transactions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/clients/${c.id}`)}
                    className="border-b border-slate-200/60 cursor-pointer hover:bg-surfaceRaised/60"
                  >
                    <td className="py-2.5 pr-3 text-slate-900">{c.name}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{c.phone || c.email || '—'}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-700">{formatMoney(c.totalBilled)}</td>
                    <td className="py-2.5 pr-3 text-right text-slate-700">{formatMoney(c.totalPaid)}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {c.totalDue > 0 ? (
                        <Badge className="bg-due/15 text-due border-due/30">{formatMoney(c.totalDue)}</Badge>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-slate-500">{c.transactionCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/clients/${c.id}`)}
                className="bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-4 cursor-pointer active:bg-surface"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-900 font-medium">{c.name}</span>
                  {c.totalDue > 0 && (
                    <Badge className="bg-due/15 text-due border-due/30">{formatMoney(c.totalDue)} due</Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500 mb-2">{c.phone || c.email || 'No contact info'}</div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Billed {formatMoney(c.totalBilled)}</span>
                  <span>{c.transactionCount} transactions</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <PartyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
