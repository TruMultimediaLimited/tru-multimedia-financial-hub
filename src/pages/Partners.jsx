import React from "react";

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

const PARTNERS_DATA = [
  {
    id: "1",
    name: "Ifthaker Hossain Radone",
    share: 34,
    totalInvestment: 1200000,
    totalContribution: 450000,
    currentBalance: 32000,
  },
  {
    id: "2",
    name: "Rezwan Kobir Zoha",
    share: 33,
    totalInvestment: 1150000,
    totalContribution: 380000,
    currentBalance: 8000,
  },
  {
    id: "3",
    name: "Rasel Ahmed",
    share: 33,
    totalInvestment: 1150000,
    totalContribution: 420000,
    currentBalance: 0,
  },
];

function PartnerCard({ partner }) {
  const totalReturns = partner.totalInvestment + (partner.totalContribution / 3);
  const profitMargin = ((totalReturns - partner.totalInvestment) / partner.totalInvestment * 100).toFixed(1);

  return (
    <div
      className="rounded-xl border p-6 flex flex-col gap-4"
      style={{ background: tokens.surface, borderColor: tokens.hairline }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: tokens.bone }}>
            {partner.name}
          </h3>
          <p className="text-sm mt-1" style={{ color: tokens.muted }}>
            Ownership: {partner.share}%
          </p>
        </div>
        <span
          className="px-3 py-1 rounded-full text-sm font-semibold"
          style={{
            background: `rgba(59, 130, 246, 0.1)`,
            color: tokens.gold,
          }}
        >
          {partner.share}%
        </span>
      </div>

      <div className="border-t pt-4" style={{ borderColor: tokens.hairline }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Total Investment</p>
            <p className="text-sm font-mono mt-1" style={{ color: tokens.moss }}>
              {fmtBDT(partner.totalInvestment)}
            </p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Contribution (Office)</p>
            <p className="text-sm font-mono mt-1" style={{ color: tokens.gold }}>
              {fmtBDT(partner.totalContribution)}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-4" style={{ borderColor: tokens.hairline }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Profit Margin</p>
            <p className="text-sm font-mono mt-1" style={{ color: tokens.moss }}>
              +{profitMargin}%
            </p>
          </div>
          <div>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Outstanding</p>
            <p
              className="text-sm font-mono mt-1"
              style={{
                color: partner.currentBalance > 0 ? tokens.rust : tokens.muted,
              }}
            >
              {partner.currentBalance > 0 ? fmtBDT(partner.currentBalance) : "Settled"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Partners() {
  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>
            Partnership
          </p>
          <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>
            Partner Details
          </h1>
          <p style={{ color: tokens.muted }}>Investment, contribution & settlement tracking</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {PARTNERS_DATA.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ background: tokens.surface, borderColor: tokens.hairline }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: tokens.bone }}>
            Summary
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[11px]" style={{ color: tokens.muted }}>Total Investment</p>
              <p className="text-xl font-mono font-semibold mt-2" style={{ color: tokens.moss }}>
                {fmtBDT(PARTNERS_DATA.reduce((sum, p) => sum + p.totalInvestment, 0))}
              </p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: tokens.muted }}>Total Contribution</p>
              <p className="text-xl font-mono font-semibold mt-2" style={{ color: tokens.gold }}>
                {fmtBDT(PARTNERS_DATA.reduce((sum, p) => sum + p.totalContribution, 0))}
              </p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: tokens.muted }}>Outstanding Owed</p>
              <p className="text-xl font-mono font-semibold mt-2" style={{ color: tokens.rust }}>
                {fmtBDT(PARTNERS_DATA.reduce((sum, p) => sum + p.currentBalance, 0))}
              </p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: tokens.muted }}>Partners</p>
              <p className="text-xl font-mono font-semibold mt-2" style={{ color: tokens.bone }}>
                {PARTNERS_DATA.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
