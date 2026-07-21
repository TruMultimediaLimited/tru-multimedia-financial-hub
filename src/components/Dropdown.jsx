import { useEffect, useRef, useState } from 'react';

// Custom-styled stand-in for a native <select> — Android Chrome renders
// native selects as a full-screen dark system picker that clashes badly
// with this app's light theme, so filters use this instead.
export default function Dropdown({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between bg-surfaceRaised border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 hover:border-gray-400"
      >
        <span>{selected?.label}</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full bg-surfaceRaised border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto py-1">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm ${
                o.value === value ? 'bg-surface text-gray-900 font-medium' : 'text-gray-700 hover:bg-surface'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
