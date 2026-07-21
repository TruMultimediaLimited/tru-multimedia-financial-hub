export const inputClass =
  'w-full bg-surfaceRaised border border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

export default function Field({ label, required, hint, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs text-slate-500 mb-1">
        {label}
        {required && <span className="text-expense"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
    </label>
  );
}
