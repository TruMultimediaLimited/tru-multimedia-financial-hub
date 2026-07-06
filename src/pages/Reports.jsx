import React from "react";
import { Download, TrendingUp } from "lucide-react";

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

const REPORTS = [
  { id: 1, title: "Monthly P&L Report", period: "June 2026", type: "Financial" },
  { id: 2, title: "Income vs Expense Analysis", period: "Q2 2026", type: "Analysis" },
  { id: 3, title: "Partner Contribution Summary", period: "June 2026", type: "Partnership" },
  { id: 4, title: "Concern-wise Performance", period: "H1 2026", type: "Performance" },
];

export default function Reports() {
  const handleDownload = (report) => {
    alert(`Downloading: ${report.title}`);
  };

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>
            Analytics
          </p>
          <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>
            Reports & Analytics
          </h1>
          <p style={{ color: tokens.muted }}>Export and analyze financial data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {REPORTS.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border p-6 flex items-center justify-between"
              style={{ background: tokens.surface, borderColor: tokens.hairline }}
            >
              <div>
                <h3 style={{ color: tokens.bone }} className="font-semibold">
                  {report.title}
                </h3>
                <p style={{ color: tokens.muted }} className="text-sm mt-1">
                  {report.period} • {report.type}
                </p>
              </div>
              <button
                onClick={() => handleDownload(report)}
                style={{ background: tokens.gold, color: "white" }}
                className="p-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                <Download size={18} />
              </button>
            </div>
          ))}
        </div>

        <div
          className="rounded-xl border p-8 text-center"
          style={{ background: tokens.surface, borderColor: tokens.hairline }}
        >
          <TrendingUp size={48} style={{ color: tokens.gold }} className="mx-auto mb-4" />
          <h3 style={{ color: tokens.bone }} className="text-xl font-semibold mb-2">
            Advanced Analytics Coming Soon
          </h3>
          <p style={{ color: tokens.muted }}>
            Real-time dashboards, custom reports, and trend analysis features will be available in the next update.
          </p>
        </div>
      </div>
    </div>
  );
}
