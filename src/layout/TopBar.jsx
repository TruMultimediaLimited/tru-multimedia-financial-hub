import ConcernSwitcher from './ConcernSwitcher.jsx';

export default function TopBar({ title }) {
  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-2 px-4 py-2.5 bg-surface border-b border-gray-200">
      <ConcernSwitcher />
      <span className="text-sm font-medium text-gray-800 truncate">{title}</span>
      <span className="text-[10px] text-gray-600 shrink-0">v2</span>
    </header>
  );
}
