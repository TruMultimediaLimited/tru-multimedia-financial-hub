import React, { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";

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

const EXPENSE_CATEGORIES = [
  "office_rent",
  "electricity",
  "salary",
  "equipment",
  "travel",
  "entertainment",
  "marketing",
  "software_subscription",
  "misc",
];

const INCOME_CATEGORIES = ["client_payment", "milestone_payment", "other_income"];

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs uppercase tracking-wide" style={{ color: tokens.muted }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  background: tokens.surface,
  borderColor: tokens.hairline,
  color: tokens.bone,
  border: "1px solid",
};

export default function AddTransactionForm({ supabase, onClose, onSaved }) {
  const [concerns, setConcerns] = useState([
    { id: "1", name: "Tru Multimedia Limited" },
    { id: "2", name: "Truphoto Studio" },
    { id: "3", name: "4R Studio" },
    { id: "4", name: "Uthsob Mukhor" },
  ]);
  const [projects, setProjects] = useState([]);
  const [partners, setPartners] = useState([
    { id: "1", name: "Ifthaker Hossain Radone" },
    { id: "2", name: "Rezwan Kobir Zoha" },
    { id: "3", name: "Rasel Ahmed" },
  ]);

  const [form, setForm] = useState({
    concern_id: "",
    project_id: "",
    type: "expense",
    category: "",
    amount: "",
    tds_vds_amount: "",
    paid_by: "company_account",
    partner_id: "",
    description: "",
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) return;

    (async () => {
      try {
        const [{ data: c }, { data: p }] = await Promise.all([
          supabase.from("concerns").select("id, name"),
          supabase.from("partners").select("id, name"),
        ]);
        if (c && c.length > 0) setConcerns(c);
        if (p && p.length > 0) setPartners(p);
      } catch (err) {
        console.error("Failed to fetch concerns/partners:", err);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !form.concern_id) {
      setProjects([]);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("projects")
          .select("id, title")
          .eq("concern_id", form.concern_id)
          .neq("status", "completed");
        setProjects(data || []);
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    })();
  }, [supabase, form.concern_id]);

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.concern_id) return setError("Concern select করো");
    if (!form.category) return setError("Category select করো");
    if (!form.amount || Number(form.amount) <= 0) return setError("সঠিক Amount দাও");
    if (form.paid_by === "partner_pocket" && !form.partner_id) {
      return setError("Partner select করো");
    }

    setSaving(true);
    try {
      const { error: insertErr } = await supabase.from("transactions").insert({
        concern_id: form.concern_id,
        project_id: form.project_id || null,
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        tds_vds_amount: Number(form.tds_vds_amount || 0),
        paid_by: form.paid_by,
        partner_id: form.paid_by === "partner_pocket" ? form.partner_id : null,
        description: form.description || null,
        transaction_date: form.transaction_date,
      });

      if (insertErr) throw insertErr;

      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error saving transaction");
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
            Add transaction
          </h2>
          <button type="button" onClick={onClose} style={{ color: tokens.muted }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: tokens.hairline }}>
          {["expense", "income"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => update("type", t)}
              className="flex-1 py-2 text-sm font-medium capitalize"
              style={{
                background: form.type === t ? (t === "income" ? tokens.moss : tokens.rust) : tokens.surface,
                color: form.type === t ? "white" : tokens.bone,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <Field label="Concern">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
            value={form.concern_id}
            onChange={(e) => update("concern_id", e.target.value)}
          >
            <option value="">Select concern</option>
            {concerns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>

        {projects.length > 0 && (
          <Field label="Project (optional)">
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              style={inputStyle}
              value={form.project_id}
              onChange={(e) => update("project_id", e.target.value)}
            >
              <option value="">No project (overhead)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Category">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (৳)">
            <input
              type="number"
              className="rounded-lg border px-3 py-2 text-sm font-mono"
              style={inputStyle}
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="TDS/VDS (৳)">
            <input
              type="number"
              className="rounded-lg border px-3 py-2 text-sm font-mono"
              style={inputStyle}
              value={form.tds_vds_amount}
              onChange={(e) => update("tds_vds_amount", e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="Paid by">
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
            value={form.paid_by}
            onChange={(e) => update("paid_by", e.target.value)}
          >
            <option value="company_account">Company account</option>
            <option value="partner_pocket">Partner's pocket</option>
          </select>
        </Field>

        {form.paid_by === "partner_pocket" && (
          <Field label="Which partner">
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              style={inputStyle}
              value={form.partner_id}
              onChange={(e) => update("partner_id", e.target.value)}
            >
              <option value="">Select partner</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Date">
          <input
            type="date"
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
            value={form.transaction_date}
            onChange={(e) => update("transaction_date", e.target.value)}
          />
        </Field>

        <Field label="Note (optional)">
          <textarea
            className="rounded-lg border px-3 py-2 text-sm resize-none"
            style={inputStyle}
            rows={2}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Short note…"
          />
        </Field>

        {error && (
          <p className="text-sm" style={{ color: tokens.rust }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: tokens.gold, color: "white" }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : "Save transaction"}
        </button>
      </form>
    </div>
  );
}
