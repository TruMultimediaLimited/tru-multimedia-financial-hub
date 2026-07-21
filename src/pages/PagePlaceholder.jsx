export default function PagePlaceholder({ title, phase }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
      <div className="text-slate-700 font-medium mb-1">{title}</div>
      <div className="text-sm">Content coming in {phase}.</div>
    </div>
  );
}
