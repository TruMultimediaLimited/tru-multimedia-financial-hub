export default function PagePlaceholder({ title, phase }) {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
      <div className="text-gray-700 font-medium mb-1">{title}</div>
      <div className="text-sm">Content coming in {phase}.</div>
    </div>
  );
}
