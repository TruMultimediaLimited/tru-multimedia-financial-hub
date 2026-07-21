export const inputClass =
  'w-full bg-surfaceRaised border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-gray-500';

export default function Field({ label, required, hint, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs text-gray-400 mb-1">
        {label}
        {required && <span className="text-expense"> *</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}
