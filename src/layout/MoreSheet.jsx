import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { moreSheetModules, MORE_SHEET_GROUPS } from './navConfig.js';
import { navIcons } from './navIcons.js';
import Icon from './Icon.jsx';

export default function MoreSheet({ open, onClose, userEmail, onSignOut }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-surface border-t border-slate-200 rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-start justify-between px-4 pt-4 pb-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">More</div>
            <div className="text-xs text-slate-500 mt-0.5">Manage your business</div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500" aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <nav className="pb-2">
          {MORE_SHEET_GROUPS.map((group) => {
            const items = moreSheetModules.filter((m) => m.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="mb-2">
                <div className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group}
                </div>
                {items.map((m) => {
                  const ModIcon = navIcons[m.icon];
                  return (
                    <NavLink
                      key={m.path}
                      to={m.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3.5 text-sm ${
                          isActive ? 'text-primary font-medium' : 'text-slate-700'
                        }`
                      }
                    >
                      <ModIcon className="w-[18px] h-[18px]" strokeWidth={2} />
                      <span className="flex-1">{m.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </NavLink>
                  );
                })}
              </div>
            );
          })}

          <div className="border-t border-slate-200 mt-1 pt-1 pb-6">
            <div className="px-4 py-2 text-xs text-slate-500 truncate">{userEmail}</div>
            <button
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="w-full text-left flex items-center gap-3 px-4 py-3.5 text-sm text-slate-700"
            >
              Sign out
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
