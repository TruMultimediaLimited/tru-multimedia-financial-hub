import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../components/Badge.jsx';
import { formatMoney } from '../lib/format.js';
import { fetchVendorsWithTotals } from '../lib/partyData.js';
import PartyForm from './parties/PartyForm.jsx';

export default function Vendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchVendorsWithTotals()
      .then((rows) => !cancelled && setVendors(rows))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) || (v.phone ?? '').includes(search)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-100">Vendors</h1>
        <button
          onClick={() => setFormOpen(true)}
          className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-900"
        >
          + New vendor
        </button>
      </div>

      <input
        placeholder="Search by name or phone"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-surfaceRaised border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 mb-4"
      />

      {error && <p className="text-sm text-expense mb-3">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && filtered.length === 0 && (
        <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center text-gray-500">
          No vendors found.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-800">
                  <th className="py-2 pr-3 font-normal">Name</th>
                  <th className="py-2 pr-3 font-normal">Contact</th>
                  <th className="py-2 pr-3 font-normal text-right">Paid</th>
                  <th className="py-2 pr-3 font-normal text-right">Due</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/vendors/${v.id}`)}
                    className="border-b border-gray-800/60 cursor-pointer hover:bg-surfaceRaised/60"
                  >
                    <td className="py-2.5 pr-3 text-gray-100">{v.name}</td>
                    <td className="py-2.5 pr-3 text-gray-400">{v.phone || v.email || '—'}</td>
                    <td className="py-2.5 pr-3 text-right text-gray-300">{formatMoney(v.totalPaid)}</td>
                    <td className="py-2.5 pr-3 text-right">
                      {v.totalDue > 0 ? (
                        <Badge className="bg-due/15 text-due border-due/30">{formatMoney(v.totalDue)}</Badge>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {filtered.map((v) => (
              <div
                key={v.id}
                onClick={() => navigate(`/vendors/${v.id}`)}
                className="border border-gray-800 rounded-lg p-3 cursor-pointer active:bg-surfaceRaised/60"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-100 font-medium">{v.name}</span>
                  {v.totalDue > 0 && (
                    <Badge className="bg-due/15 text-due border-due/30">{formatMoney(v.totalDue)} due</Badge>
                  )}
                </div>
                <div className="text-xs text-gray-500 mb-2">{v.phone || v.email || 'No contact info'}</div>
                <div className="text-sm text-gray-400">Paid {formatMoney(v.totalPaid)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <PartyForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
        kind="vendor"
      />
    </div>
  );
}
