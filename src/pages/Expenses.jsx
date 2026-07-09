import React, { useEffect, useState } from "react";
import { ArrowDownRight, Plus, X, Loader2, Trash2, Edit2 } from "lucide-react";
import { tokens, fmtBDT, inputStyle } from "../lib/theme";
import Field from "../components/Field";

const EXPENSE_CATEGORIES = [
  "office_rent", "electricity", "salary", "equipment", "travel",
  "entertainment", "marketing", "software_subscription", "misc",
];

const SAMPLE_CONCERNS = [
  { id: "1", name: "Tru Multimedia Limited" },
  { id: "2", name: "Truphoto Studio" },
  { id: "3", name: "4R Studio" },
  { id: "4", name: "Uthsob Mukhor" },
];

function ExpenseForm({ supabase, concerns, partners, entry, onClose, onSaved }) {
  const [form, setForm] = useState({
    concern_id: entry?.concern_id || "",
    category: entry?.category || "",
    amount: entry?.amount || "",
    tds_vds_amount: entry?.tds_vds_amount || "",
    paid_by: entry?.partner_id || entry?.paid_by || "company_account",
    description: entry?.description || "",
    transaction_date: entry?.transaction_date || new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.concern_id) return setError("Concern select করো");
    if (!form.category) return setError("Category select করো");
    if (!form.amount || Number(form.amount) <= 0) return setError("সঠিক Amount দাও");

    setSaving(true);
    try {
      if (!supabase) {
        alert("Supabase connected নেই।");
        setSaving(false);
        return;
      }

      const partner_id = form.paid_by === "company_account" ? null : form.paid_by;
      const paid_by_value = form.paid_by === "company_account" ? "company_account" : "partner_pocket";

      if (entry?.id) {
        const { error: updateErr } = await supabase
          .from("transactions")
          .update({
            concern_id: form.concern_id,
            type: "expense",
            category: form.category,
            amount: Number(form.amount),
            tds_vds_amount: Number(form.tds_vds_amount || 0),
            paid_by: paid_by_value,
            partner_id: partner_id,
            description: form.description || null,
            transaction_date: form.transaction_date,
          })
          .eq("id", entry.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("transactions").insert({
          concern_id: form.concern_id,
          type: "expense",
          category: form.category,
          amount: Number(form.amount),
          tds_vds_amount: Number(form.tds_vds_amount || 0),
          paid_by: paid_by_value,
          partner_id: partner_id,
          description: form.description || null,
          transaction_date: form.transaction_date,
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
            {entry ? "Edit expense" : "Add expense"}
          </h2>
          <button type="button" onClick={onClose} style={{ color: tokens.muted }}><X size={20} /></button>
        </div>

        <Field label="Concern">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.concern_id} onChange={(e) => update("concern_id", e.target.value)}>
            <option value="">Select concern</option>
            {concerns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Category">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.category} onChange={(e) => update("category", e.target.value)}>
            <option value="">Select category</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (৳)">
            <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
              value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0" />
          </Field>
          <Field label="TDS/VDS (৳)">
            <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
              value={form.tds_vds_amount} onChange={(e) => update("tds_vds_amount", e.target.value)} placeholder="0" />
          </Field>
        </div>

        <Field label="Paid by">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.paid_by} onChange={(e) => update("paid_by", e.target.value)}>
            <option value="company_account">Company account</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Date">
          <input type="date" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.transaction_date} onChange={(e) => update("transaction_date", e.target.value)} />
        </Field>

        <Field label="Note (optional)">
          <textarea className="rounded-lg border px-3 py-2 text-sm resize-none" style={inputStyle}
            rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Short note…" />
        </Field>

        {error && <p className="text-sm" style={{ color: tokens.rust }}>{error}</p>}

        <button type="submit" disabled={saving}
          className="mt-2 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: tokens.rust, color: "white" }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : (entry ? "Update expense" : "Save expense")}
        </button>
      </form>
    </div>
  );
}

export default function Expenses({ supabase, onChanged }) {
  const [entries, setEntries] = useState([]);
  const [concerns, setConcerns] = useState(SAMPLE_CONCERNS);
  const [partners, setPartners] = useState([]);
  const [filterConcern, setFilterConcern] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [loading, setLoading] = useState(!!supabase);
  const [liveError, setLiveError] = useState(false);

  async function loadData() {
    if (!supabase) return;
    try {
      const [{ data: c, error: cErr }, { data: t, error: tErr }, { data: pt, error: ptErr }] = await Promise.all([
        supabase.from("concerns").select("id, name"),
        supabase
          .from("transactions")
          .select("id, transaction_date, category, amount, description, concern_id, partner_id, paid_by, tds_vds_amount, concerns(name)")
          .eq("type", "expense")
          .order("transaction_date", { ascending: false }),
        supabase.from("partners").select("id, name"),
      ]);
      if (cErr) throw cErr;
      if (tErr) throw tErr;
      if (ptErr) throw ptErr;
      if (c && c.length > 0) setConcerns(c);
      if (pt) setPartners(pt);
      if (t) {
        setEntries(
          t.map((row) => ({
            id: row.id,
            transaction_date: row.transaction_date,
            category: row.category,
            amount: row.amount,
            description: row.description,
            concern_id: row.concern_id,
            partner_id: row.partner_id,
            paid_by: row.paid_by,
            tds_vds_amount: row.tds_vds_amount,
            concern_name: row.concerns?.name || "—",
          }))
        );
      }
    } catch (err) {
      console.error("Expenses load failed:", err);
      setLiveError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  async function handleDelete(id) {
    if (!supabase) return;
    if (!confirm("এই expense entry delete করবে?")) return;
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      loadData();
      onChanged?.();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  const filteredEntries = filterConcern
    ? entries.filter((e) => e.concern_name === filterConcern)
    : entries;

  const totalExpense = filteredEntries.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8 pb-16">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>Cost Tracking</p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>Expenses</h1>
            <p style={{ color: tokens.muted }}>All business expenses across concerns</p>
          </div>
          <button
            onClick={() => {
              setEditingEntry(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: tokens.rust, color: "white" }}
          >
            <Plus size={16} /> Add expense
          </button>
        </div>

        {liveError && (
          <p className="text-sm mb-4" style={{ color: tokens.rust }}>
            Live data connect করা যায়নি — sample figures দেখানো হচ্ছে। Supabase project active আছে কিনা check করো।
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Total Expenses</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.rust }}>{fmtBDT(totalExpense)}</p>
          </div>
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Entries</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.gold }}>{filteredEntries.length}</p>
          </div>
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Average</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.bone }}>
              {fmtBDT(filteredEntries.length ? totalExpense / filteredEntries.length : 0)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border p-6" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold" style={{ color: tokens.bone }}>Recent Expenses</h3>
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ background: tokens.surfaceRaised, borderColor: tokens.hairline, color: tokens.bone }}
              value={filterConcern}
              onChange={(e) => setFilterConcern(e.target.value)}
            >
              <option value="">All Concerns</option>
              {concerns.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {loading && <p style={{ color: tokens.muted }}>Loading…</p>}

          <div className="flex flex-col gap-3">
            {filteredEntries.map((entry) => (
              <div key={String(entry.id)} className="flex items-center justify-between p-4 rounded-lg" style={{ background: tokens.surfaceRaised }}>
                <div className="flex items-center gap-3">
                  <ArrowDownRight size={20} style={{ color: tokens.rust }} />
                  <div>
                    <p style={{ color: tokens.bone }}>{entry.description || entry.category}</p>
                    <p className="text-sm" style={{ color: tokens.muted }}>{entry.concern_name} • {entry.transaction_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-mono" style={{ color: tokens.rust }}>-{fmtBDT(entry.amount)}</p>
                  {supabase && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingEntry(entry);
                          setShowForm(true);
                        }}
                        style={{ color: tokens.gold }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(entry.id)} style={{ color: tokens.rust }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filteredEntries.length === 0 && !loading && (
              <p style={{ color: tokens.muted }}>কোনো expense entry নেই।</p>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <ExpenseForm
          supabase={supabase}
          concerns={concerns}
          partners={partners}
          entry={editingEntry}
          onClose={() => {
            setShowForm(false);
            setEditingEntry(null);
          }}
          onSaved={() => {
            loadData();
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
