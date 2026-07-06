import React from "react";
import { Users } from "lucide-react";

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

const STAFF_DATA = [
  { id: 1, name: "John Doe", concern: "4R Studio", role: "Video Editor", salary: 25000, status: "Active" },
  { id: 2, name: "Jane Smith", concern: "Truphoto Studio", role: "Photographer", salary: 30000, status: "Active" },
  { id: 3, name: "Ahmed Khan", concern: "Tru Multimedia Limited", role: "Graphic Designer", salary: 22000, status: "Active" },
  { id: 4, name: "Sara Ali", concern: "Uthsob Mukhor", role: "Coordinator", salary: 18000, status: "On Leave" },
];

export default function Staff() {
  const activeSalaryBill = STAFF_DATA.reduce((sum, s) => sum + s.salary, 0);

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>
            Human Resources
          </p>
          <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>
            Staff & Payroll
          </h1>
          <p style={{ color: tokens.muted }}>Team members and salary management</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div
            className="rounded-xl border p-5"
            style={{ background: tokens.surface, borderColor: tokens.hairline }}
          >
            <p className="text-[11px]" style={{ color: tokens.muted }}>Total Staff</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.moss }}>
              {STAFF_DATA.length}
            </p>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{ background: tokens.surface, borderColor: tokens.hairline }}
          >
            <p className="text-[11px]" style={{ color: tokens.muted }}>Monthly Salary Bill</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.rust }}>
              {fmtBDT(activeSalaryBill)}
            </p>
          </div>
          <div
            className="rounded-xl border p-5"
            style={{ background: tokens.surface, borderColor: tokens.hairline }}
          >
            <p className="text-[11px]" style={{ color: tokens.muted }}>Average Salary</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.gold }}>
              {fmtBDT(activeSalaryBill / STAFF_DATA.length)}
            </p>
          </div>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ background: tokens.surface, borderColor: tokens.hairline }}
        >
          <h3 className="text-lg font-semibold mb-6" style={{ color: tokens.bone }}>
            Team Members
          </h3>

          <div className="flex flex-col gap-3">
            {STAFF_DATA.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ background: tokens.surfaceRaised }}
              >
                <div className="flex items-center gap-3">
                  <Users size={20} style={{ color: tokens.gold }} />
                  <div>
                    <p style={{ color: tokens.bone }}>{member.name}</p>
                    <p className="text-sm" style={{ color: tokens.muted }}>
                      {member.role} • {member.concern}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono" style={{ color: tokens.bone }}>
                    {fmtBDT(member.salary)}
                  </p>
                  <p
                    className="text-[11px] mt-1"
                    style={{
                      color: member.status === "Active" ? tokens.moss : tokens.muted,
                    }}
                  >
                    {member.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
