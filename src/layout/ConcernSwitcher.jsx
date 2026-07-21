import { useConcern } from '../context/ConcernContext.jsx';

export default function ConcernSwitcher({ className = '' }) {
  const { concerns, selectedConcernId, setSelectedConcernId, loading } = useConcern();

  return (
    <select
      className={`bg-surfaceRaised text-sm text-slate-900 border border-slate-300 rounded-md px-2 py-1.5 ${className}`}
      value={selectedConcernId ?? ''}
      onChange={(e) => setSelectedConcernId(e.target.value || null)}
      disabled={loading}
    >
      <option value="">All Concern</option>
      {concerns.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
