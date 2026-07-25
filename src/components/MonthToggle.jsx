export default function MonthToggle({ label, offset, onPrev, onNext, onCurrent }) {
  return (
    <div className="h-9 flex items-center gap-1 bg-primary/10 border border-primary/25 rounded-full px-1.5">
      <button
        onClick={onPrev}
        aria-label="Previous month"
        className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-primary/70 hover:bg-primary/10"
      >
        ‹
      </button>
      <button
        onClick={onCurrent}
        className={`text-sm px-1 whitespace-nowrap text-primary ${offset === 0 ? 'font-bold' : 'font-medium'}`}
      >
        {label}
      </button>
      <button
        onClick={onNext}
        disabled={offset >= 0}
        aria-label="Next month"
        className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full text-primary/70 hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>
  );
}
