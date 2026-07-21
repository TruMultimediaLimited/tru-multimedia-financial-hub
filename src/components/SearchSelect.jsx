import { useEffect, useRef, useState } from 'react';
import { inputClass } from './Field.jsx';
import Icon from '../layout/Icon.jsx';

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
      <Icon name="search" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={`${inputClass} pl-9`}
      />

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full bg-surfaceRaised border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto py-1">
          {filtered.map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-surface"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
