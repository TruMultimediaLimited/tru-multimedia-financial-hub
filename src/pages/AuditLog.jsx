import React, { useEffect, useState } from "react";
import { History, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { tokens } from "../lib/theme";

const TABLE_LABELS = {
  transactions: "Income/Expense entry",
  partners: "Partner",
  partner_ledger: "Partner ledger entry",
  staff: "Staff member",
  projects: "Project",
  project_payments: "Project milestone",
  staff_work_log: "Staff work entry",
  payroll_runs: "Payroll run",
};

const ACTION_META = {
  INSERT: { label: "তৈরি করা হয়েছে", icon: Plus, color: tokens.moss },
  UPDATE: { label: "পরিবর্তন করা হয়েছে", icon: Edit2, color: tokens.gold },
  DELETE: { label: "মুছে ফেলা হয়েছে", icon: Trash2, color: tokens.rust },
};

function diffFields(oldData, newData) {
  if (!oldData || !newData) return [];
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
  const changed = [];
  keys.forEach((k) => {
    if (k === "id" || k === "created_at") return;
    const a = oldData[k];
    const b = newData[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) changed.push({ field: k, from: a, to: b });
  });
  return changed;
}

export default function AuditLog({ supabase }) {
  const [logs, setLogs] = useState([]);
  const [partnerByEmail, setPartnerByEmail] = useState({});
  const [loading, setLoading] = useState(!!supabase);
  const [liveError, setLiveError] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [filterTable, setFilterTable] = useState("");

  async function loadData() {
    if (!supabase) return;
    try {
      const [{ data: l, error: lErr }, { data: p, error: pErr }] = await Promise.all([
        supabase.from("audit_log_with_user").select("*").order("changed_at", { ascending: false }).limit(200),
        supabase.from("partners").select("id, name, email"),
      ]);
      if (lErr) throw lErr;
      if (pErr) throw pErr;

      const byEmail = {};
      (p || []).forEach((row) => { if (row.email) byEmail[row.email] = row.name; });
      setPartnerByEmail(byEmail);
      setLogs(l || []);
    } catch (err) {
      console.error("Audit log load failed:", err);
      setLiveError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  const filteredLogs = filterTable ? logs.filter((l) => l.table_name === filterTable) : logs;
  const tableOptions = Array.from(new Set(logs.map((l) => l.table_name)));

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8 pb-16">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>Compliance</p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>Activity Log</h1>
            <p style={{ color: tokens.muted }}>কে, কখন, কী পরিবর্তন করেছে তার সম্পূর্ণ ইতিহাস</p>
          </div>
          {tableOptions.length > 0 && (
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ background: tokens.surfaceRaised, borderColor: tokens.hairline, color: tokens.bone }}
              value={filterTable}
              onChange={(e) => setFilterTable(e.target.value)}
            >
              <option value="">All records</option>
              {tableOptions.map((t) => (
                <option key={t} value={t}>{TABLE_LABELS[t] || t}</option>
              ))}
            </select>
          )}
        </div>

        {liveError && (
          <p className="text-sm mb-4" style={{ color: tokens.rust }}>
            Live data connect করা যায়নি — Supabase project active আছে কিনা check করো। অথবা <code>audit_log_with_user</code> view/trigger এখনো সেটআপ করা হয়নি কিনা দেখো।
          </p>
        )}

        <div className="rounded-xl border p-6" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ color: tokens.bone }}>
            <History size={18} style={{ color: tokens.gold }} /> Recent Activity
          </h3>

          {loading && <p style={{ color: tokens.muted }}>Loading…</p>}

          <div className="flex flex-col gap-2">
            {filteredLogs.map((entry) => {
              const meta = ACTION_META[entry.action] || { label: entry.action, icon: Edit2, color: tokens.muted };
              const Icon = meta.icon;
              const who = entry.changed_by_email
                ? (partnerByEmail[entry.changed_by_email] || entry.changed_by_email)
                : "System";
              const isExpanded = expanded === entry.id;
              const changes = diffFields(entry.old_data, entry.new_data);

              return (
                <div key={entry.id} className="rounded-lg overflow-hidden" style={{ background: tokens.surfaceRaised }}>
                  <button
                    onClick={() => setExpanded(isExpanded ? null : entry.id)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} style={{ color: meta.color }} />
                      <div>
                        <p className="text-sm" style={{ color: tokens.bone }}>
                          <span style={{ color: meta.color }}>{meta.label}</span> — {TABLE_LABELS[entry.table_name] || entry.table_name}
                        </p>
                        <p className="text-[11px]" style={{ color: tokens.muted }}>
                          {who} • {new Date(entry.changed_at).toLocaleString("en-BD")}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} style={{ color: tokens.muted }} /> : <ChevronDown size={16} style={{ color: tokens.muted }} />}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t" style={{ borderColor: tokens.hairline }}>
                      {entry.action === "UPDATE" && changes.length > 0 && (
                        <div className="flex flex-col gap-1 mt-3">
                          {changes.map((c) => (
                            <p key={c.field} className="text-xs font-mono" style={{ color: tokens.muted }}>
                              <span style={{ color: tokens.bone }}>{c.field}</span>: {JSON.stringify(c.from)} → <span style={{ color: tokens.gold }}>{JSON.stringify(c.to)}</span>
                            </p>
                          ))}
                        </div>
                      )}
                      {entry.action === "INSERT" && entry.new_data && (
                        <pre className="text-xs mt-3 overflow-x-auto" style={{ color: tokens.muted }}>{JSON.stringify(entry.new_data, null, 2)}</pre>
                      )}
                      {entry.action === "DELETE" && entry.old_data && (
                        <pre className="text-xs mt-3 overflow-x-auto" style={{ color: tokens.muted }}>{JSON.stringify(entry.old_data, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredLogs.length === 0 && !loading && (
              <p style={{ color: tokens.muted }}>কোনো activity log নেই। SQL migration রান করা হয়েছে কিনা check করো।</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
