import React, { useState, useEffect } from "react";
import { Home, DollarSign, TrendingDown, Users, BarChart3, Menu, X } from "lucide-react";
import Overview from "./pages/Overview";
import AddTransactionForm from "./components/AddTransactionForm";

const tokens = {
  ink: "#12181A",
  surface: "#1B2326",
  surfaceRaised: "#222C2F",
  hairline: "#2E393C",
  bone: "#EDEAE2",
  muted: "#8B9598",
  moss: "#8FB08A",
  rust: "#C3714E",
  gold: "#D3A653",
};

const TABS = [
  { id: "overview", label: "Dashboard", icon: Home },
  { id: "income", label: "Income", icon: DollarSign },
  { id: "expenses", label: "Expenses", icon: TrendingDown },
  { id: "staff", label: "Staff & Payroll", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

export default function App({ supabase }) {
  const [currentTab, setCurrentTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [currentTab]);

  const pages = {
    overview: <Overview supabase={supabase} key={refreshKey} />,
    income: <PageStub title="Income" subtitle="View all income entries" />,
    expenses: <PageStub title="Expenses" subtitle="Track all business expenses" />,
    staff: <PageStub title="Staff & Payroll" subtitle="Manage staff and generate payroll" />,
    reports: <PageStub title="Reports" subtitle="Export and analyze financial data" />,
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
                    color: currentTab === id ? tokens.ink : tokens.bone,
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

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: tokens.gold, color: tokens.ink }}
          >
            <span className="text-lg">+</span> Add transaction
          </button>
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

      {showAddModal && (
        <AddTransactionForm
          supabase={supabase}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

function PageStub({ title, subtitle }) {
  return (
    <div className="max-w-5xl mx-auto px-5 py-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest" style={{ color: tokens.muted }}>
          Coming soon
        </p>
        <h1 className="text-2xl font-semibold mt-2" style={{ color: tokens.bone }}>
          {title}
        </h1>
        <p style={{ color: tokens.muted }}>{subtitle}</p>
      </div>

      <div
        className="rounded-xl border p-8 text-center"
        style={{ background: tokens.surface, borderColor: tokens.hairline }}
      >
        <p style={{ color: tokens.muted }}>This section is under development</p>
      </div>
    </div>
  );
}
