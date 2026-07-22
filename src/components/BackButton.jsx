import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Defaults to browser history (wherever the user actually came from)
// rather than a hardcoded destination — correct even when a page is
// reached via more than one route. Pass onClick to reuse the same
// look for a modal/sheet's own close action instead.
export default function BackButton({ label = 'Back', onClick, className = '' }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={onClick ?? (() => navigate(-1))}
      className={`inline-flex items-center gap-1.5 -ml-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-surfaceRaised transition-colors mb-3 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}
