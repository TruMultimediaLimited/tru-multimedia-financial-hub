import React, { useEffect, useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import { tokens, fmtBDT } from "../lib/theme";

async function fetchConcernPL(supabase) {
  const { data, error } = await supabase.from("concern_pl_view").select("*");
  if (error) throw error;
  return data;
}

async function fetchMonthlyPL(supabase) {
  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, transaction_date")
    .order("transaction_date", { ascending: true });
  if (error) throw error;

  const byMonth = {};
  data.forEach((t) => {
    const month = t.transaction_date.slice(0, 7);
    if (!byMonth[month]) byMonth[month] = { month, income: 0, expense: 0 };
    if (t.type === "income") byMonth[month].income += Number(t.amount);
    else byMonth[month].expense += Number(t.amount);
  });

  return Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({ ...r, net: r.income - r.expense }));
}

async function fetchPartnerContribution(supabase) {
  const [{ data: partners, error: pErr }, { data: ledger, error: lErr }] = await Promise.all([
    supabase.from("partners").select("id, name, share_percentage, investment"),
    supabase.from("partner_ledger_balance_view").select("*, partners(name)"),
  ]);
  if (pErr) throw pErr;
  if (lErr) throw lErr;

  const owedByPartner = {};
  (ledger || []).forEach((r) => {
    owedByPartner[r.partner_id] = r.outstanding_owed_to_partner;
  });

  return (partners || []).map((p) => ({
    name: p.name,
    share_percentage: p.share_percentage || 0,
    investment: p.investment || 0,
    outstanding_owed_to_partner: owedByPartner[p.id] || 0,
  }));
}

function toCSV(rows, columns) {
  const header = columns.map((c) => c.label).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const v = row[c.key];
          const s = v === null || v === undefined ? "" : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    )
    .join("\n");
  return `${header}\n${body}`;
}

function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Reports({ supabase }) {
  const [concernPL, setConcernPL] = useState([]);
  const [monthlyPL, setMonthlyPL] = useState([]);
  const [partnerContribution, setPartnerContribution] = useState([]);
  const [loading, setLoading] = useState(!!supabase);
  const [liveError, setLiveError] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    (async () => {
      try {
        const [pl, monthly, contrib] = await Promise.all([
          fetchConcernPL(supabase),
          fetchMonthlyPL(supabase),
          fetchPartnerContribution(supabase),
        ]);
        if (cancelled) return;
        setConcernPL(pl || []);
        setMonthlyPL(monthly || []);
        setPartnerContribution(contrib || []);
      } catch (err) {
        console.error("Reports fetch failed:", err);
        setLiveError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const totals = concernPL.reduce(
    (acc, c) => ({
      income: acc.income + Number(c.total_income || 0),
      expense: acc.expense + Number(c.total_expense || 0),
    }),
    { income: 0, expense: 0 }
  );
  totals.net = totals.income - totals.expense;

  const REPORT_DEFS = [
    { id: 1, title: "Monthly P&L Report", period: "All months", type: "Financial", dataKey: "monthly" },
    { id: 2, title: "Income vs Expense Analysis", period: "By concern", type: "Analysis", dataKey: "concernIncomeExpense" },
    { id: 3, title: "Partner Contribution Summary", period: "Current", type: "Partnership", dataKey: "partners" },
    { id: 4, title: "Concern-wise Performance", period: "All-time", type: "Performance", dataKey: "concernPerformance" },
  ];

  function handleDownload(report) {
    if (!supabase) return alert("Supabase connected নেই।");

    let rows, columns, filename;
    switch (report.dataKey) {
      case "monthly":
        rows = monthlyPL;
        columns = [
          { key: "month", label: "Month" },
          { key: "income", label: "Income" },
          { key: "expense", label: "Expense" },
          { key: "net", label: "Net" },
        ];
        filename = "monthly-pl-report.csv";
        break;
      case "concernIncomeExpense":
        rows = concernPL;
        columns = [
          { key: "concern_name", label: "Concern" },
          { key: "total_income", label: "Income" },
          { key: "total_expense", label: "Expense" },
        ];
        filename = "income-vs-expense-by-concern.csv";
        break;
      case "partners":
        rows = partnerContribution;
        columns = [
          { key: "name", label: "Partner" },
          { key: "share_percentage", label: "Share %" },
          { key: "investment", label: "Investment" },
          { key: "outstanding_owed_to_partner", label: "Outstanding Owed" },
        ];
        filename = "partner-contribution-summary.csv";
        break;
      case "concernPerformance":
        rows = concernPL;
        columns = [
          { key: "concern_name", label: "Concern" },
          { key: "total_income", label: "Income" },
          { key: "total_expense", label: "Expense" },
          { key: "net_pl", label: "Net P&L" },
        ];
        filename = "concern-wise-performance.csv";
        break;
      default:
        return;
    }

    if (!rows || rows.length === 0) return alert("No data available to export.");
    downloadCSV(filename, toCSV(rows, columns));
  }

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

        {liveError && (
          <p className="text-sm mb-4" style={{ color: tokens.rust }}>
            Live data connect করা যায়নি — sample figures দেখানো হচ্ছে। Supabase project active আছে কিনা check করো।
          </p>
        )}

        {loading && <p style={{ color: tokens.muted }}>Loading…</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Total Income</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.moss }}>{fmtBDT(totals.income)}</p>
          </div>
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Total Expense</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.rust }}>{fmtBDT(totals.expense)}</p>
          </div>
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Net</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: totals.net >= 0 ? tokens.moss : tokens.rust }}>
              {fmtBDT(totals.net)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {REPORT_DEFS.map((report) => (
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
