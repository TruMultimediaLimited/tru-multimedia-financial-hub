import React, { useEffect, useState } from "react";
import { Users, Plus, X, Loader2, Trash2, Edit2 } from "lucide-react";
import { tokens, fmtBDT, inputStyle } from "../lib/theme";
import Field from "../components/Field";

const SAMPLE_CONCERNS = [
  { id: "1", name: "Tru Multimedia Limited" },
  { id: "2", name: "Truphoto Studio" },
  { id: "3", name: "4R Studio" },
  { id: "4", name: "Uthsob Mukhor" },
];

const SAMPLE_STAFF = [
  { id: 1, name: "John Doe", concern_name: "4R Studio", role: "Video Editor", salary: 25000, status: "Active" },
  { id: 2, name: "Jane Smith", concern_name: "Truphoto Studio", role: "Photographer", salary: 30000, status: "Active" },
  { id: 3, name: "Ahmed Khan", concern_name: "Tru Multimedia Limited", role: "Graphic Designer", salary: 22000, status: "Active" },
  { id: 4, name: "Sara Ali", concern_name: "Uthsob Mukhor", role: "Coordinator", salary: 18000, status: "On Leave" },
];

function StaffForm({ supabase, concerns, member, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: member?.name || "",
    concern_id: member?.concern_id || "",
    role: member?.role || "",
    salary: member?.salary || "",
    payment_mode: member?.payment_mode || "fixed",
    status: member?.status || "Active",
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
    if (!form.concern_id) return setError("Concern select করো");
    if (!form.role) return setError("Role দাও");
    if (form.payment_mode === "fixed" && (!form.salary || Number(form.salary) <= 0)) {
      return setError("সঠিক Salary দাও");
    }
    if (form.salary && Number(form.salary) < 0) return setError("সঠিক Salary দাও");

    setSaving(true);
    try {
      if (!supabase) {
        alert("Supabase connected নেই। Demo mode.");
        setSaving(false);
        return;
      }

      if (member?.id) {
        const { error: updateErr } = await supabase
          .from("staff")
          .update({
            name: form.name,
            concern_id: form.concern_id,
            role: form.role,
            salary: Number(form.salary),
            payment_mode: form.payment_mode,
            status: form.status,
          })
          .eq("id", member.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("staff").insert({
          name: form.name,
          concern_id: form.concern_id,
          role: form.role,
          salary: Number(form.salary),
          payment_mode: form.payment_mode,
          status: form.status,
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
            {member ? "Edit staff member" : "Add staff member"}
          </h2>
          <button type="button" onClick={onClose} style={{ color: tokens.muted }}><X size={20} /></button>
        </div>

        <Field label="Name">
          <input type="text" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Full name" />
        </Field>

        <Field label="Concern">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.concern_id} onChange={(e) => update("concern_id", e.target.value)}>
            <option value="">Select concern</option>
            {concerns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="Role">
          <input type="text" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="e.g. Video Editor" />
        </Field>

        <Field label="Payment mode">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.payment_mode} onChange={(e) => update("payment_mode", e.target.value)}>
            <option value="fixed">Fixed monthly</option>
            <option value="project_based">Project based</option>
          </select>
        </Field>

        <Field label={form.payment_mode === "project_based" ? "Average/Reference Salary (৳, optional)" : "Monthly Salary (৳)"}>
          <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
            value={form.salary} onChange={(e) => update("salary", e.target.value)}
            placeholder={form.payment_mode === "project_based" ? "কাজের উপর নির্ভরশীল — ঐচ্ছিক" : "0"} />
        </Field>

        <Field label="Status">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.status} onChange={(e) => update("status", e.target.value)}>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </Field>

        {error && <p className="text-sm" style={{ color: tokens.rust }}>{error}</p>}

        <button type="submit" disabled={saving}
          className="mt-2 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: tokens.gold, color: "white" }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : (member ? "Update staff member" : "Save staff member")}
        </button>
      </form>
    </div>
  );
}

export default function Staff({ supabase }) {
  const [staffList, setStaffList] = useState(SAMPLE_STAFF);
  const [concerns, setConcerns] = useState(SAMPLE_CONCERNS);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(!!supabase);
  const [liveError, setLiveError] = useState(false);

  async function loadData() {
    if (!supabase) return;
    try {
      const [{ data: c, error: cErr }, { data: s, error: sErr }] = await Promise.all([
        supabase.from("concerns").select("id, name"),
        supabase.from("staff").select("*,concerns(name)"),
      ]);
      if (cErr) throw cErr;
      if (sErr) throw sErr;
      if (c && c.length > 0) setConcerns(c);
      if (s) {
        setStaffList(
          s.map((row) => ({
            id: row.id,
            name: row.name,
            role: row.role || "Staff",
            salary: row.salary || 0,
            status: row.status || "Active",
            payment_mode: row.payment_mode || "fixed",
            concern_id: row.concern_id,
            concern_name: row.concerns?.name || "—",
          }))
        );
      }
    } catch (err) {
      console.error("Staff load failed:", err);
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
    if (!confirm("এই staff member delete করবে?")) return;
    try {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  const activeSalaryBill = staffList.reduce((sum, s) => sum + Number(s.salary), 0);

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8 pb-16">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>Human Resources</p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>Staff & Payroll</h1>
            <p style={{ color: tokens.muted }}>Team members and salary management</p>
          </div>
          <button
            onClick={() => {
              setEditingMember(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: tokens.gold, color: "white" }}
          >
            <Plus size={16} /> Add staff
          </button>
        </div>

        {liveError && (
          <p className="text-sm mb-4" style={{ color: tokens.rust }}>
            Live data connect করা যায়নি — sample figures দেখানো হচ্ছে। Supabase project active আছে কিনা check করো।
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Total Staff</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.moss }}>{staffList.length}</p>
          </div>
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Monthly Salary Bill</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.rust }}>{fmtBDT(activeSalaryBill)}</p>
          </div>
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Average Salary</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.gold }}>
              {fmtBDT(staffList.length ? activeSalaryBill / staffList.length : 0)}
            </p>
          </div>
        </div>

        <div className="rounded-xl border p-6" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
          <h3 className="text-lg font-semibold mb-6" style={{ color: tokens.bone }}>Team Members</h3>

          {loading && <p style={{ color: tokens.muted }}>Loading…</p>}

          <div className="flex flex-col gap-3">
            {staffList.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: tokens.surfaceRaised }}>
                <div className="flex items-center gap-3">
                  <Users size={20} style={{ color: tokens.gold }} />
                  <div>
                    <p style={{ color: tokens.bone }}>{member.name}</p>
                    <p className="text-sm" style={{ color: tokens.muted }}>{member.role} • {member.concern_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-mono" style={{ color: tokens.bone }}>
                      {member.payment_mode === "project_based" && !member.salary ? "কাজভিত্তিক" : fmtBDT(member.salary)}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: member.status === "Active" ? tokens.moss : tokens.muted }}>
                      {member.status}
                    </p>
                  </div>
                  {supabase && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setShowForm(true);
                        }}
                        style={{ color: tokens.gold }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(member.id)} style={{ color: tokens.rust }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {staffList.length === 0 && !loading && (
              <p style={{ color: tokens.muted }}>কোনো staff member নেই।</p>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <StaffForm
          supabase={supabase}
          concerns={concerns}
          member={editingMember}
          onClose={() => {
            setShowForm(false);
            setEditingMember(null);
          }}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
