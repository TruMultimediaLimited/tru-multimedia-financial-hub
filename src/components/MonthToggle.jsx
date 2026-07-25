export default function MonthToggle({ label, offset, onPrev, onNext, onCurrent }) {
  return (
    <div className="h-9 flex items-center gap-1 bg-surfaceRaised border border-slate-200 rounded-full px-1.5">
      <button
        onClick={onPrev}
        aria-label="Previous month"
        className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-slate-600 hover:bg-surface"
      >
        ‹
      </button>
      <button
        onClick={onCurrent}
        className={`text-sm font-medium px-1 whitespace-nowrap ${offset === 0 ? 'text-slate-900' : 'text-primary'}`}
      >
        {label}
      </button>
      <button
        onClick={onNext}
        disabled={offset >= 0}
        aria-label="Next month"
        className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-slate-600 hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  );
}
