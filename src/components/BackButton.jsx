import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Always navigates to wherever the user actually came from (browser
// history), rather than a hardcoded destination — correct even when a
// page is reached via more than one route (e.g. a client's project
// reached from the client page vs. a dashboard breakdown link).
export default function BackButton({ label = 'Back', className = '' }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-1.5 -ml-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-surfaceRaised transition-colors mb-3 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
