import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Plus, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";

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

async function fetchConcernPL(supabase) {
  const { data, error } = await supabase.from("concern_pl_view").select("*");
  if (error) throw error;
  return data;
}

async function fetchAccumulatedTrend(supabase) {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, transaction_date")
    .order("transaction_date", { ascending: true });
  if (error) throw error;

  const byMonth = {};
  data.forEach((t) => {
    const month = t.transaction_date.slice(0, 7);
    const signed = t.type === "income" ? Number(t.amount) : -Number(t.amount);
    byMonth[month] = (byMonth[month] || 0) + signed;
  });

  let running = 0;
  return Object.keys(byMonth)
    .sort()
    .map((month) => {
      running += byMonth[month];
      return { month, net: byMonth[month], accumulated: running };
    });
}

async function fetchPartnerLedgerBalance(supabase) {
  const { data, error } = await supabase
    .from("partner_ledger_balance_view")
    .select("*, partners(name)");
  if (error) throw error;
  return data;
}

const fmtBDT = (n) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(n || 0);

const SAMPLE_CONCERNS = [
  { concern_id: "1", concern_name: "Tru Multimedia Limited", total_income: 1250000, total_expense: 980000, net_pl: 270000 },
  { concern_id: "2", concern_name: "Truphoto Studio", total_income: 640000, total_expense: 510000, net_pl: 130000 },
  { concern_id: "3", concern_name: "4R Studio", total_income: 420000, total_expense: 460000, net_pl: -40000 },
  { concern_id: "4", concern_name: "Uthsob Mukhor", total_income: 90000, total_expense: 75000, net_pl: 15000 },
];

const SAMPLE_TREND = [
  { month: "2026-02", accumulated: 40000 },
  { month: "2026-03", accumulated: 95000 },
  { month: "2026-04", accumulated: 180000 },
  { month: "2026-05", accumulated: 260000 },
  { month: "2026-06", accumulated: 310000 },
  { month: "2026-07", accumulated: 375000 },
];

const SAMPLE_LEDGER = [
  { partner_id: "1", partners: { name: "Ifthaker Hossain Radone" }, outstanding_owed_to_partner: 32000 },
  { partner_id: "2", partners: { name: "Rezwan Kobir Zoha" }, outstanding_owed_to_partner: 8000 },
  { partner_id: "3", partners: { name: "Rasel Ahmed" }, outstanding_owed_to_partner: 0 },
];

function ConcernCard({ name, income, expense, net, isMother }) {
  const positive = net >= 0;
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-4 transition-colors ${
        isMother ? "md:col-span-2" : ""
      }`}
      style={{
        background: isMother ? tokens.surfaceRaised : tokens.surface,
        borderColor: tokens.hairline,
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider" style={{ color: tokens.muted }}>
            {isMother ? "Mother company" : "Subsidiary"}
          </p>
          <h3 className="text-lg font-semibold mt-1" style={{ color: tokens.bone }}>
            {name}
          </h3>
        </div>
        <span
          className="flex items-center gap-1 text-sm font-mono px-2 py-1 rounded-md"
          style={{
            color: positive ? tokens.moss : tokens.rust,
            background: positive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          }}
        >
          {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {fmtBDT(net)}
        </span>
      </div>

      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <ArrowUpRight size={16} style={{ color: tokens.moss }} />
          <div>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Income</p>
            <p className="font-mono text-sm" style={{ color: tokens.bone }}>{fmtBDT(income)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ArrowDownRight size={16} style={{ color: tokens.rust }} />
          <div>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Expense</p>
            <p className="font-mono text-sm" style={{ color: tokens.bone }}>{fmtBDT(expense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartnerLedgerStrip({ rows }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ background: tokens.surface, borderColor: tokens.hairline }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Wallet size={16} style={{ color: tokens.gold }} />
        <h3 className="text-sm font-semibold tracking-wide" style={{ color: tokens.bone }}>
          Partner ledger — company owes
        </h3>
      </div>
      <div className="flex flex-col divide-y" style={{ borderColor: tokens.hairline }}>
        {rows.map((r) => (
          <div
            key={r.partner_id}
            className="flex items-center justify-between py-3"
            style={{ borderColor: tokens.hairline }}
          >
            <span className="text-sm" style={{ color: tokens.bone }}>{r.partners?.name}</span>
            <span
              className="font-mono text-sm"
              style={{ color: r.outstanding_owed_to_partner > 0 ? tokens.gold : tokens.muted }}
            >
              {r.outstanding_owed_to_partner > 0 ? fmtBDT(r.outstanding_owed_to_partner) : "Settled"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Overview({ supabase }) {
  const [concerns, setConcerns] = useState(SAMPLE_CONCERNS);
  const [trend, setTrend] = useState(SAMPLE_TREND);
  const [ledger, setLedger] = useState(SAMPLE_LEDGER);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      try {
        const [pl, trendData, ledgerData] = await Promise.all([
          fetchConcernPL(supabase),
          fetchAccumulatedTrend(supabase),
          fetchPartnerLedgerBalance(supabase),
        ]);
        if (cancelled) return;
        setConcerns(pl);
        setTrend(trendData);
        setLedger(ledgerData);
      } catch (err) {
        console.error("Overview fetch failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const totals = useMemo(() => {
    const income = concerns.reduce((a, c) => a + Number(c.total_income || 0), 0);
    const expense = concerns.reduce((a, c) => a + Number(c.total_expense || 0), 0);
    return { income, expense, net: income - expense };
  }, [concerns]);

  const mother = concerns.find((c) => c.concern_name === "Tru Multimedia Limited");
  const subsidiaries = concerns.filter((c) => c.concern_name !== "Tru Multimedia Limited");

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8 pb-28">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>
              Tru Multimedia Limited
            </p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>
              Financial Overview
            </h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[11px]" style={{ color: tokens.muted }}>Net across all concerns</p>
            <p
              className="text-xl font-mono font-semibold"
              style={{ color: totals.net >= 0 ? tokens.moss : tokens.rust }}
            >
              {fmtBDT(totals.net)}
            </p>
          </div>
        </div>

        {loading && (
          <p className="text-sm mb-4" style={{ color: tokens.muted }}>
            Loading live figures…
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {mother && (
            <ConcernCard
              name={mother.concern_name}
              income={mother.total_income}
              expense={mother.total_expense}
              net={mother.net_pl}
              isMother
            />
          )}
          {subsidiaries.map((c) => (
            <ConcernCard
              key={c.concern_id}
              name={c.concern_name}
              income={c.total_income}
              expense={c.total_expense}
              net={c.net_pl}
            />
          ))}
        </div>

        <div
          className="rounded-xl border p-5 mb-8"
          style={{ background: tokens.surface, borderColor: tokens.hairline }}
        >
          <h3 className="text-sm font-semibold tracking-wide mb-4" style={{ color: tokens.bone }}>
            Accumulated profit / loss over time
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={tokens.moss} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={tokens.moss} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={tokens.hairline} vertical={false} />
              <XAxis
                dataKey="month"
                stroke={tokens.muted}
                tick={{ fill: tokens.muted, fontSize: 11 }}
                axisLine={{ stroke: tokens.hairline }}
                tickLine={false}
              />
              <YAxis
                stroke={tokens.muted}
                tick={{ fill: tokens.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: tokens.surfaceRaised, border: `1px solid ${tokens.hairline}`, borderRadius: 8 }}
                labelStyle={{ color: tokens.muted }}
                itemStyle={{ color: tokens.bone }}
                formatter={(v) => fmtBDT(v)}
              />
              <Area type="monotone" dataKey="accumulated" stroke={tokens.moss} strokeWidth={2} fill="url(#netGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <PartnerLedgerStrip rows={ledger} />
      </div>

      <button
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg font-medium text-sm"
        style={{ background: tokens.gold, color: "white" }}
        onClick={() => alert("Open Add Transaction form")}
      >
        <Plus size={18} />
        Add transaction
      </button>
    </div>
  );
}
