
import React, { useState, useEffect } from "react";
import { Home, DollarSign, TrendingDown, Users, BarChart3, Users2, Menu, X } from "lucide-react";
import Overview from "./pages/Overview";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import Staff from "./pages/Staff";
import Reports from "./pages/Reports";
import Partners from "./pages/Partners";

const tokens = {
  ink: "#0F172A",
  surface: "#1E293B",
  surfaceRaised: "#334155",
  hairline: "#475569",
  bone: "#F1F5F9",
  muted: "#94A3B8",
  moss: "#10B981",
  rust: "#EF4444",
  gold: "#3B82F6",
};

const TABS = [
  { id: "overview", label: "Dashboard", icon: Home },
  { id: "income", label: "Income", icon: DollarSign },
  { id: "expenses", label: "Expenses", icon: TrendingDown },
  { id: "staff", label: "Staff & Payroll", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "partners", label: "Partners", icon: Users2 },
];

export default function App({ supabase }) {
  const [currentTab, setCurrentTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [currentTab]);

  const bump = () => setRefreshKey((k) => k + 1);

  const pages = {
    overview: <Overview supabase={supabase} key={refreshKey} />,
    income: <Income supabase={supabase} onChanged={bump} />,
    expenses: <Expenses supabase={supabase} onChanged={bump} />,
    staff: <Staff supabase={supabase} />,
    reports: <Reports />,
    partners: <Partners />,
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: tokens.ink }}>
      <div
        className={`fixed inset-y-0 left-0 w-64 border-r transform transition-transform md:relative md:translate-x-0 z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: tokens.surface, borderColor: tokens.hairline }}
      >
        <div className="p-6 flex flex-col h-full">
          <div>
            <h1 className="text-xl font-bold" style={{ color: tokens.bone }}>
              Tru Multimedia
            </h1>
            <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: tokens.muted }}>
              Financial Engine
            </p>

            <nav className="mt-8 space-y-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentTab(id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center gap-3 text-sm font-medium transition-colors ${
                    currentTab === id ? "" : "hover:opacity-75"
                  }`}
                  style={{
                    background: currentTab === id ? tokens.gold : "transparent",
                    color: currentTab === id ? "white" : tokens.bone,
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          <div className="text-[11px]" style={{ color: tokens.muted }}>
            <p>© 2026 Tru Multimedia Ltd.</p>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 md:hidden"
          style={{ color: tokens.muted }}
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="border-b p-4 flex items-center justify-between"
          style={{ background: tokens.surface, borderColor: tokens.hairline }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden"
            style={{ color: tokens.bone }}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {pages[currentTab]}
        </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
