import ConcernSwitcher from './ConcernSwitcher.jsx';

export default function TopBar() {
  return (
    <header className="md:hidden sticky top-0 z-20 flex items-center gap-2 px-4 py-2.5 bg-surface border-b border-slate-200">
      <ConcernSwitcher />
    </header>
  );
}
