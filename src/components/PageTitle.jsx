export default function PageTitle({ children, colorClass }) {
  return (
    <h1 className={`flex-1 h-8 inline-flex items-center justify-center rounded-full border px-3 text-xs font-bold ${colorClass}`}>
      {children}
    </h1>
  );
}
