import ConcernSwitcher from './ConcernSwitcher.jsx';

export default function TopBar({ title }) {
  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-2 px-4 py-2.5 bg-surface border-b border-gray-800">
      <ConcernSwitcher />
      <span className="text-sm font-medium text-gray-200 truncate">{title}</span>
    </header>
  );
}
