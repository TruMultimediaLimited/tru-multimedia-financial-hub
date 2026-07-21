import { NavLink } from 'react-router-dom';
import { modules } from './navConfig.js';
import Icon from './Icon.jsx';
import ConcernSwitcher from './ConcernSwitcher.jsx';

export default function Sidebar({ userEmail, onSignOut }) {
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 bg-surface border-r border-gray-800">
      <div className="px-4 pt-5 pb-4 border-b border-gray-800">
        <div className="font-semibold text-gray-100 leading-tight">Tru Multimedia Limited</div>
        <div className="text-xs text-gray-500 mb-3">Tru ERP · v2</div>
        <ConcernSwitcher className="w-full" />
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {modules.map((m) => (
          <NavLink
            key={m.path}
            to={m.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm ${
                isActive
                  ? 'bg-surfaceRaised text-gray-50 border-r-2 border-income'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-surfaceRaised/60'
              }`
            }
          >
            <Icon name={m.icon} />
            <span>{m.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-gray-800 text-sm">
        <div className="text-gray-300 truncate mb-2">{userEmail}</div>
        <button
          onClick={onSignOut}
          className="text-gray-500 hover:text-gray-200 text-xs"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
