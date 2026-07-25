import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import BottomTabBar from './BottomTabBar.jsx';
import MoreSheet from './MoreSheet.jsx';

export default function AppShell({ userEmail, onSignOut }) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-slate-900 md:flex">
      <Sidebar userEmail={userEmail} onSignOut={onSignOut} />

      <div className="flex-1 min-w-0">
        <TopBar />
        <main className="px-4 py-4 md:px-8 md:py-6 pb-20 md:pb-6 max-w-5xl mx-auto">
          <Outlet />
        </main>
      </div>

      <BottomTabBar onMoreClick={() => setMoreOpen(true)} />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        userEmail={userEmail}
        onSignOut={onSignOut}
      />
    </div>
  );
}
