import Icon from '../layout/Icon.jsx';

// Bottom sheet on mobile, centered modal on desktop — per docs/ui-spec.md §10.
export default function Sheet({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto rounded-t-2xl bg-surface border-t border-slate-200 pb-[env(safe-area-inset-bottom)]
                   md:inset-0 md:m-auto md:h-fit md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-xl md:border"
      >
        <div className="sticky top-0 flex items-center justify-between px-4 py-3.5 bg-surface border-b border-slate-200">
          <span className="text-sm font-medium text-slate-900">{title}</span>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-slate-800" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
