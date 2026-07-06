import React, { useState } from "react";
import { ArrowDownRight } from "lucide-react";

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

const fmtBDT = (n) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(n || 0);

const EXPENSE_ENTRIES = [
  { id: 1, date: "2026-07-05", category: "office_rent", amount: 50000, concern: "Tru Multimedia Limited", description: "Monthly office rent" },
  { id: 2, date: "2026-07-04", category: "salary", amount: 80000, concern: "4R Studio", description: "Staff salary" },
  { id: 3, date: "2026-07-03", category: "equipment", amount: 120000, concern: "Truphoto Studio", description: "Camera equipment" },
  { id: 4, date: "2026-07-02", category: "electricity", amount: 15000, concern: "Uthsob Mukhor", description: "Monthly electricity bill" },
];

export default function Expenses() {
  const [filterConcern, setFilterConcern] = useState("");

  const filteredEntries = filterConcern
    ? EXPENSE_ENTRIES.filter((e) => e.concern === filterConcern)
    : EXPENSE_ENTRIES;

  const totalExpense = filteredEntries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>
            Cost Tracking
          </p>
          <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>
            Expenses
          </h1>
          <p style={{ color: tokens.muted }}>All business expenses across concerns</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div
            className="rounded-xl border p-5"
            style={{ background: tokens.surface, borderColor: tokens.hairline }}
          >
            <p className="text-[11px]" style={{ color: tokens.muted }}>Total Expenses</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.rust }}>
              {fmtBDT(totalExpense)}
            </p>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{ background: tokens.surface, borderColor: tokens.hairline }}
          >
            <p className="text-[11px]" style={{ color: tokens.muted }}>Entries</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.gold }}>
              {filteredEntries.length}
            </p>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{ background: tokens.surface, borderColor: tokens.hairline }}
          >
            <p className="text-[11px]" style={{ color: tokens.muted }}>Average</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.bone }}>
              {fmtBDT(totalExpense / filteredEntries.length)}
            </p>
          </div>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ background: tokens.surface, borderColor: tokens.hairline }}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold" style={{ color: tokens.bone }}>
              Recent Expenses
            </h3>
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                background: tokens.surfaceRaised,
                borderColor: tokens.hairline,
                color: tokens.bone,
              }}
              value={filterConcern}
              onChange={(e) => setFilterConcern(e.target.value)}
            >
              <option value="">All Concerns</option>
              <option value="Tru Multimedia Limited">Tru Multimedia</option>
              <option value="Truphoto Studio">Truphoto Studio</option>
              <option value="4R Studio">4R Studio</option>
              <option value="Uthsob Mukhor">Uthsob Mukhor</option>
            </select>
          </div>

          <div className="flex flex-col gap-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: tokens.surfaceRaised, borderColor: tokens.hairline }}
              >
                <div className="flex items-center gap-3">
                  <ArrowDownRight size={20} style={{ color: tokens.rust }} />
                  <div>
                    <p style={{ color: tokens.bone }}>{entry.description}</p>
                    <p className="text-sm" style={{ color: tokens.muted }}>
                      {entry.concern} • {entry.date}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-mono" style={{ color: tokens.rust }}>
                  -{fmtBDT(entry.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
