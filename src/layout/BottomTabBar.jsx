import { NavLink } from 'react-router-dom';
import { bottomTabModules } from './navConfig.js';
import { navIcons } from './navIcons.js';

export default function BottomTabBar({ onMoreClick }) {
  const MoreIcon = navIcons.more;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {bottomTabModules.map((m) => {
          const TabIcon = navIcons[m.icon];
          return (
            <NavLink
              key={m.path}
              to={m.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2 min-h-[44px] text-[11px] ${
                  isActive ? 'text-primary font-semibold' : 'text-slate-500'
                }`
              }
            >
              <TabIcon className="w-5 h-5" strokeWidth={2} />
              <span>{m.label}</span>
            </NavLink>
          );
        })}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-1 py-2 min-h-[44px] text-[11px] text-slate-500"
        >
          <MoreIcon className="w-5 h-5" strokeWidth={2} />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
