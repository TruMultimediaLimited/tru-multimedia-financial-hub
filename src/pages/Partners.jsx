import React, { useEffect, useState } from "react";
import { Users2, Plus, X, Loader2, Edit2, Trash2, TrendingUp, TrendingDown } from "lucide-react";

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

const SAMPLE_PARTNERS = [
  {
    id: "1",
    name: "Ifthaker Hossain Radone",
    share_percentage: 34,
    investment: 1200000,
  },
  {
    id: "2",
    name: "Rezwan Kobir Zoha",
    share_percentage: 33,
    investment: 1150000,
  },
  {
    id: "3",
    name: "Rasel Ahmed",
    share_percentage: 33,
    investment: 1150000,
  },
];

const TRANSACTION_TYPES = [
  { value: "investment", label: "Investment (টাকা দিয়েছে)", color: "#10B981" },
  { value: "withdrawal", label: "Withdrawal (টাকা নিয়েছে)", color: "#EF4444" },
  { value: "advance", label: "Advance (এডভান্স)", color: "#3B82F6" },
  { value: "dividend", label: "Dividend (লাভ)", color: "#F59E0B" },
];

const inputStyle = {
  background: tokens.surface,
  borderColor: tokens.hairline,
  color: tokens.bone,
  border: "1px solid",
};

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide" style={{ color: tokens.muted }}>{label}</span>
      {children}
    </label>
  );
}

function PartnerForm({ supabase, partner, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: partner?.name || "",
    share_percentage: partner?.share_percentage || "",
    investment: partner?.investment || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name) return setError("Name দাও");
    if (!form.share_percentage || Number(form.share_percentage) <= 0 || Number(form.share_percentage) > 100) {
      return setError("Share % (1-100) দাও");
    }
    if (!form.investment || Number(form.investment) < 0) return setError("Investment amount দাও");

    setSaving(true);
    try {
      if (!supabase) {
        alert("Supabase connected নেই।");
        setSaving(false);
        return;
      }

      if (partner?.id) {
        const { error: updateErr } = await supabase
          .from("partners")
          .update({
            name: form.name,
            share_percentage: Number(form.share_percentage),
            investment: Number(form.investment),
          })
          .eq("id", partner.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("partners").insert({
          name: form.name,
          share_percentage: Number(form.share_percentage),
          investment: Number(form.investment),
          contribution: 0,
        });
        if (insertErr) throw insertErr;
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        style={{ background: tokens.ink, borderColor: tokens.hairline }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: tokens.bone }}>
            {partner ? "Edit partner" : "Add partner"}
          </h2>
          <button type="button" onClick={onClose} style={{ color: tokens.muted }}><X size={20} /></button>
        </div>

        <Field label="Name">
          <input type="text" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Full name" />
        </Field>

        <Field label="Share % (1-100)">
          <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
            value={form.share_percentage} onChange={(e) => update("share_percentage", e.target.value)} placeholder="0" />
        </Field>

        <Field label="Initial Investment (৳)">
          <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
            value={form.investment} onChange={(e) => update("investment", e.target.value)} placeholder="0" />
        </Field>

        {error && <p className="text-sm" style={{ color: tokens.rust }}>{error}</p>}

        <button type="submit" disabled={saving}
          className="mt-2 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: tokens.gold, color: "white" }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : (partner ? "Update partner" : "Save partner")}
        </button>
      </form>
    </div>
  );
}

function TransactionForm({ supabase, partner, onClose, onSaved }) {
  const [form, setForm] = useState({
    type: "investment",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.amount || Number(form.amount) <= 0) return setError("সঠিক amount দাও");

    setSaving(true);
    try {
      if (!supabase) {
        alert("Supabase connected নেই।");
        setSaving(false);
        return;
      }

      const { error: insertErr } = await supabase.from("partner_ledger").insert({
        partner_id: partner.id,
        type: form.type,
        amount: Number(form.amount),
        description: form.note || null,
        recorded_date: form.date,
      });

      if (insertErr) throw insertErr;

      onSaved?.();
      onClose?.();
    } catch (err) {
      setError(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.3)" }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        style={{ background: tokens.ink, borderColor: tokens.hairline }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" style={{ color: tokens.bone }}>
            {partner?.name}
          </h2>
          <button type="button" onClick={onClose} style={{ color: tokens.muted }}><X size={20} /></button>
        </div>

        <Field label="Transaction Type">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.type} onChange={(e) => update("type", e.target.value)}>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Amount (৳)">
          <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
            value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0" />
        </Field>

        <Field label="Date">
          <input type="date" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.date} onChange={(e) => update("date", e.target.value)} />
        </Field>

        <Field label="Note (optional)">
          <textarea className="rounded-lg border px-3 py-2 text-sm resize-none" style={inputStyle}
            rows={2} value={form.note} onChange={(e) => update("note", e.target.value)} placeholder="Short note…" />
        </Field>

        {error && <p className="text-sm" style={{ color: tokens.rust }}>{error}</p>}

        <button type="submit" disabled={saving}
          className="mt-2 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: tokens.moss, color: "white" }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : "Add transaction"}
        </button>
      </form>
    </div>
  );
}

export default function Partners({ supabase }) {
  const [partners, setPartners] = useState(SAMPLE_PARTNERS);
  const [ledger, setLedger] = useState({});
  const [loading, setLoading] = useState(!!supabase);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [expandedPartner, setExpandedPartner] = useState(null);

  async function loadData() {
    if (!supabase) return;
    try {
      const { data: p } = await supabase.from("partners").select("*");
      if (p && p.length > 0) {
        setPartners(
          p.map((x) => ({
            id: x.id,
            name: x.name,
            share_percentage: x.share_percentage || 0,
            investment: x.investment || 0,
          }))
        );
      }

      const { data: l } = await supabase.from("partner_ledger").select("*").order("recorded_date", { ascending: false });
      if (l) {
        const byPartner = {};
        l.forEach((item) => {
          if (!byPartner[item.partner_id]) byPartner[item.partner_id] = [];
          byPartner[item.partner_id].push(item);
        });
        setLedger(byPartner);
      }
    } catch (err) {
      console.error("Partners load failed:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  async function handleDelete(id) {
    if (!supabase) return;
    if (!confirm("এই partner delete করবে?")) return;
    try {
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  async function handleDeleteTransaction(ledgerId) {
    if (!supabase) return;
    if (!confirm("এই transaction delete করবে?")) return;
    try {
      const { error } = await supabase.from("partner_ledger").delete().eq("id", ledgerId);
      if (error) throw error;
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  const getTypeColor = (type) => {
    const t = TRANSACTION_TYPES.find(x => x.value === type);
    return t?.color || tokens.muted;
  };

  const getTypeLabel = (type) => {
    const t = TRANSACTION_TYPES.find(x => x.value === type);
    return t?.label.split("(")[0].trim() || type;
  };

  const totalInvestment = partners.reduce((sum, p) => sum + Number(p.investment || 0), 0);

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8 pb-16">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>Partnership</p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>Partners</h1>
            <p style={{ color: tokens.muted }}>Investment & transaction tracking</p>
          </div>
          <button
            onClick={() => {
              setEditingPartner(null);
              setShowPartnerForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: tokens.gold, color: "white" }}
          >
            <Plus size={16} /> Add partner
          </button>
        </div>

        <div className="rounded-xl border p-5 mb-8" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
          <p className="text-[11px]" style={{ color: tokens.muted }}>Total Investment</p>
          <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.gold }}>{fmtBDT(totalInvestment)}</p>
        </div>

        <div className="rounded-xl border p-6" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
          <h3 className="text-lg font-semibold mb-6" style={{ color: tokens.bone }}>Partners</h3>

          {loading && <p style={{ color: tokens.muted }}>Loading…</p>}

          <div className="flex flex-col gap-4">
            {partners.map((partner) => (
              <div key={String(partner.id)} className="border rounded-lg p-5" style={{ borderColor: tokens.hairline }}>
                <div className="flex items-start justify-between mb-4 cursor-pointer" onClick={() => setExpandedPartner(expandedPartner === partner.id ? null : partner.id)}>
                  <div className="flex items-center gap-3">
                    <Users2 size={24} style={{ color: tokens.gold }} />
                    <div>
                      <p style={{ color: tokens.bone }} className="font-semibold">{partner.name}</p>
                      <p style={{ color: tokens.muted }} className="text-sm">{partner.share_percentage}% ownership</p>
                    </div>
                  </div>
                  {supabase && (
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPartner(partner);
                          setShowPartnerForm(true);
                        }}
                        style={{ color: tokens.gold }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(partner.id);
                        }}
                        style={{ color: tokens.rust }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-[11px]" style={{ color: tokens.muted }}>Initial Investment</p>
                    <p className="text-sm font-mono mt-1" style={{ color: tokens.bone }}>{fmtBDT(partner.investment)}</p>
                  </div>
                  <div>
                    <p className="text-[11px]" style={{ color: tokens.muted }}>Share %</p>
                    <p className="text-sm font-mono mt-1" style={{ color: tokens.bone }}>{partner.share_percentage}%</p>
                  </div>
                </div>

                {supabase && (
                  <button
                    onClick={() => {
                      setSelectedPartner(partner);
                      setShowTransactionForm(true);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg mb-4"
                    style={{ background: tokens.surfaceRaised, color: tokens.moss }}
                  >
                    + Add transaction
                  </button>
                )}

                {expandedPartner === partner.id && ledger[partner.id] && (
                  <div className="border-t" style={{ borderColor: tokens.hairline }}>
                    <p className="text-xs uppercase tracking-wide mt-4 mb-3" style={{ color: tokens.muted }}>Transaction history</p>
                    <div className="flex flex-col gap-2">
                      {ledger[partner.id].map((txn) => (
                        <div key={txn.id} className="flex items-center justify-between p-3 rounded text-sm" style={{ background: tokens.surfaceRaised }}>
                          <div className="flex items-center gap-2">
                            {txn.type === "investment" || txn.type === "dividend" ? (
                              <TrendingUp size={16} style={{ color: getTypeColor(txn.type) }} />
                            ) : (
                              <TrendingDown size={16} style={{ color: getTypeColor(txn.type) }} />
                            )}
                            <div>
                              <p style={{ color: tokens.bone }}>{getTypeLabel(txn.type)}</p>
                              <p style={{ color: tokens.muted }} className="text-[10px]">{txn.recorded_date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono" style={{ color: getTypeColor(txn.type) }}>{fmtBDT(txn.amount)}</p>
                            {supabase && (
                              <button
                                onClick={() => handleDeleteTransaction(txn.id)}
                                style={{ color: tokens.rust }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {partners.length === 0 && !loading && (
              <p style={{ color: tokens.muted }}>কোনো partner নেই।</p>
            )}
          </div>
        </div>
      </div>

      {showPartnerForm && (
        <PartnerForm
          supabase={supabase}
          partner={editingPartner}
          onClose={() => {
            setShowPartnerForm(false);
            setEditingPartner(null);
          }}
          onSaved={loadData}
        />
      )}

      {showTransactionForm && selectedPartner && (
        <TransactionForm
          supabase={supabase}
          partner={selectedPartner}
          onClose={() => {
            setShowTransactionForm(false);
            setSelectedPartner(null);
          }}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
