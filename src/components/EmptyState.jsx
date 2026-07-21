export default function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-6">
      {Icon && <Icon className="w-7 h-7 text-slate-300 mb-2" strokeWidth={1.5} />}
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}
