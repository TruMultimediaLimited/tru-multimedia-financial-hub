import { useEffect, useRef, useState } from 'react';

// Matches Dropdown.jsx's compact sizing — this and Dropdown sit side by
// side in the same filter box (see Projects.jsx), so they stay visually
// consistent rather than using the larger form-field inputClass.
const searchInputClass =
  'w-full bg-surfaceRaised border border-slate-300 rounded-xl px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

// Text input + custom dropdown of options — type to filter, or open it
// empty to browse the full alphabetical list. Stands in for a native
// <input list="..."> datalist, which renders inconsistently (and often
// not at all) on mobile browsers.
export default function SearchSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = value.trim() ? options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase())) : options;

  return (
    <div className="relative" ref={ref}>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={searchInputClass}
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full bg-surfaceRaised border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto py-1">
          {filtered.map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className="w-full text-left px-2.5 py-1 text-sm text-slate-700 hover:bg-surface"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
