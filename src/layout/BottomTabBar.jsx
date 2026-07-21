import { NavLink } from 'react-router-dom';
import { bottomTabModules } from './navConfig.js';
import Icon from './Icon.jsx';

export default function BottomTabBar({ onMoreClick }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5">
        {bottomTabModules.map((m) => (
          <NavLink
            key={m.path}
            to={m.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 min-h-[44px] text-[11px] ${
                isActive ? 'text-gray-900' : 'text-gray-500'
              }`
            }
          >
            <Icon name={m.icon} className="w-5 h-5" />
            <span>{m.label}</span>
          </NavLink>
        ))}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-0.5 py-2 min-h-[44px] text-[11px] text-gray-500"
        >
          <Icon name="more" className="w-5 h-5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
