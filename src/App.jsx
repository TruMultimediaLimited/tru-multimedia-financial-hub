
import React, { useState, useEffect } from "react";
import { Home, DollarSign, TrendingDown, Users, BarChart3, Users2, Briefcase, History, LogOut, ChevronDown, ChevronUp } from "lucide-react";
import Overview from "./pages/Overview";
import Income from "./pages/Income";
import Expenses from "./pages/Expenses";
import Staff from "./pages/Staff";
import Reports from "./pages/Reports";
import Partners from "./pages/Partners";
import Projects from "./pages/Projects";
import Login from "./pages/Login";
import AuditLog from "./pages/AuditLog";
import { tokens } from "./lib/theme";

const TABS = [
  { id: "overview", label: "Dashboard", icon: Home },
  { id: "projects", label: "Projects", icon: Briefcase },
  { id: "income", label: "Income", icon: DollarSign },
  { id: "expenses", label: "Expenses", icon: TrendingDown },
  { id: "staff", label: "Staff & Payroll", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "partners", label: "Partners", icon: Users2 },
  { id: "activity", label: "Activity Log", icon: History },
];

export default function App({ supabase }) {
  const [expandedTab, setExpandedTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const bump = () => setRefreshKey((k) => k + 1);

  if (session === undefined) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: tokens.ink }}>
        <p style={{ color: tokens.muted }}>Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <Login supabase={supabase} />;
  }

  function toggleTab(id) {
    setExpandedTab((current) => (current === id ? null : id));
  }

  function renderTabContent(id) {
    switch (id) {
      case "overview":
        return <Overview supabase={supabase} key={refreshKey} />;
      case "projects":
        return <Projects supabase={supabase} />;
      case "income":
        return <Income supabase={supabase} onChanged={bump} />;
      case "expenses":
        return <Expenses supabase={supabase} onChanged={bump} />;
      case "staff":
        return <Staff supabase={supabase} />;
      case "reports":
        return <Reports supabase={supabase} />;
      case "partners":
        return <Partners supabase={supabase} />;
      case "activity":
        return <AuditLog supabase={supabase} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div
        className="border-b px-5 py-6 flex items-start justify-between"
        style={{ background: tokens.surface, borderColor: tokens.hairline }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: tokens.bone }}>
            Tru Multimedia
          </h1>
          <p className="text-[11px] uppercase tracking-widest mt-1" style={{ color: tokens.muted }}>
            Financial Engine
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-75"
          style={{ color: tokens.muted }}
        >
          <LogOut size={16} /> Log out
        </button>
      </div>

      <div className="flex flex-col">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isExpanded = expandedTab === id;
          return (
            <div key={id} className="border-b" style={{ borderColor: tokens.hairline }}>
              <button
                onClick={() => toggleTab(id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                style={{ background: isExpanded ? tokens.surface : "transparent" }}
              >
                <span className="flex items-center gap-3 text-sm font-medium" style={{ color: isExpanded ? tokens.gold : tokens.bone }}>
                  <Icon size={18} />
                  {label}
                </span>
                {isExpanded ? (
                  <ChevronUp size={18} style={{ color: tokens.muted }} />
                ) : (
                  <ChevronDown size={18} style={{ color: tokens.muted }} />
                )}
              </button>

              {isExpanded && (
                <div className="overflow-y-auto" style={{ maxHeight: "80vh" }}>
                  {renderTabContent(id)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-center py-6" style={{ color: tokens.muted }}>© 2026 Tru Multimedia Ltd.</p>
    </div>
  );
}
