import { NavLink } from 'react-router-dom';
import { moreSheetModules } from './navConfig.js';
import Icon from './Icon.jsx';

export default function MoreSheet({ open, onClose, userEmail, onSignOut }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-surface border-t border-gray-200 rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-sm font-medium text-gray-800">More</span>
          <button onClick={onClose} className="p-1 text-gray-500" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <nav className="py-1">
          {moreSheetModules.map((m) => (
            <NavLink
              key={m.path}
              to={m.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 text-sm ${
                  isActive ? 'text-gray-900' : 'text-gray-700'
                }`
              }
            >
              <Icon name={m.icon} />
              <span>{m.label}</span>
            </NavLink>
          ))}
          <div className="border-t border-gray-200 mt-1 pt-1">
            <div className="px-4 py-2 text-xs text-gray-500 truncate">{userEmail}</div>
            <button
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="w-full text-left flex items-center gap-3 px-4 py-3.5 text-sm text-gray-700"
            >
              Sign out
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
