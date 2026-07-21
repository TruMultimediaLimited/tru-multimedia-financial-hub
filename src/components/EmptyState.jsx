export default function EmptyState({ icon: Icon, message, subtitle, action, large = false }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-6">
      {Icon && large && (
        <span className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
        </span>
      )}
      {Icon && !large && <Icon className="w-7 h-7 text-slate-300 mb-2" strokeWidth={1.5} />}
      <p className={large ? 'text-[15px] font-semibold text-slate-800' : 'text-sm text-slate-500'}>{message}</p>
      {subtitle && <p className="text-sm text-slate-500 mt-1 max-w-[260px]">{subtitle}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className={`mt-4 h-11 px-5 rounded-xl text-sm font-medium transition-colors ${
            action.className ?? 'bg-primary text-white hover:bg-primaryHover'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
