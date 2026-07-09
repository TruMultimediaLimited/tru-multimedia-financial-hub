import React, { useEffect, useState } from "react";
import { Users, Plus, X, Loader2, Trash2, Edit2, ChevronDown, ChevronUp, Wallet, CheckCircle2 } from "lucide-react";
import { tokens, fmtBDT, inputStyle } from "../lib/theme";
import Field from "../components/Field";

const SAMPLE_CONCERNS = [
  { id: "1", name: "Tru Multimedia Limited" },
  { id: "2", name: "Truphoto Studio" },
  { id: "3", name: "4R Studio" },
  { id: "4", name: "Uthsob Mukhor" },
];

const SAMPLE_STAFF = [
  { id: 1, name: "John Doe", concern_name: "4R Studio", role: "Video Editor", salary: 25000, status: "Active", payment_mode: "fixed" },
  { id: 2, name: "Jane Smith", concern_name: "Truphoto Studio", role: "Photographer", salary: 30000, status: "Active", payment_mode: "fixed" },
  { id: 3, name: "Ahmed Khan", concern_name: "Tru Multimedia Limited", role: "Graphic Designer", salary: 22000, status: "Active", payment_mode: "fixed" },
  { id: 4, name: "Sara Ali", concern_name: "Uthsob Mukhor", role: "Coordinator", salary: 18000, status: "On Leave", payment_mode: "fixed" },
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

function WorkLogForm({ supabase, member, projects, entry, onClose, onSaved }) {
  const [form, setForm] = useState({
    project_id: entry?.project_id || "",
    task_description: entry?.task_description || "",
    amount: entry?.amount || "",
    work_date: entry?.work_date || new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.task_description) return setError("কাজের বিবরণ দাও");
    if (!form.amount || Number(form.amount) <= 0) return setError("সঠিক Amount দাও");

    setSaving(true);
    try {
      if (!supabase) {
        alert("Supabase connected নেই।");
        setSaving(false);
        return;
      }

      const payload = {
        staff_id: member.id,
        project_id: form.project_id || null,
        task_description: form.task_description,
        amount: Number(form.amount),
        work_date: form.work_date,
      };

      if (entry?.id) {
        const { error: updateErr } = await supabase.from("staff_work_log").update(payload).eq("id", entry.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("staff_work_log").insert({ ...payload, paid: false });
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
            {entry ? "Edit work entry" : "Add work entry"} — {member.name}
          </h2>
          <button type="button" onClick={onClose} style={{ color: tokens.muted }}><X size={20} /></button>
        </div>

        <Field label="Project (optional)">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.project_id} onChange={(e) => update("project_id", e.target.value)}>
            <option value="">No specific project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </Field>

        <Field label="কাজের বিবরণ">
          <input type="text" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.task_description} onChange={(e) => update("task_description", e.target.value)} placeholder="e.g. Video editing — 2 reels" />
        </Field>

        <Field label="Amount (৳)">
          <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
            value={form.amount} onChange={(e) => update("amount", e.target.value)} placeholder="0" />
        </Field>

        <Field label="Work date">
          <input type="date" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.work_date} onChange={(e) => update("work_date", e.target.value)} />
        </Field>

        {error && <p className="text-sm" style={{ color: tokens.rust }}>{error}</p>}

        <button type="submit" disabled={saving}
          className="mt-2 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: tokens.moss, color: "white" }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : (entry ? "Update entry" : "Save entry")}
        </button>
      </form>
    </div>
  );
}

export default function Staff({ supabase }) {
  const [staffList, setStaffList] = useState(SAMPLE_STAFF);
  const [concerns, setConcerns] = useState(SAMPLE_CONCERNS);
  const [projects, setProjects] = useState([]);
  const [workLogs, setWorkLogs] = useState({});
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [loading, setLoading] = useState(!!supabase);
  const [liveError, setLiveError] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [showWorkLogForm, setShowWorkLogForm] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState(null);
  const [workLogTarget, setWorkLogTarget] = useState(null);
  const [payrollConcern, setPayrollConcern] = useState("");
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);
  const [payrollError, setPayrollError] = useState("");

  async function loadData() {
    if (!supabase) return;
    try {
      const [
        { data: c, error: cErr },
        { data: s, error: sErr },
        { data: pr, error: prErr },
        { data: wl, error: wlErr },
        { data: pay, error: payErr },
      ] = await Promise.all([
        supabase.from("concerns").select("id, name"),
        supabase.from("staff").select("*,concerns(name)"),
        supabase.from("projects").select("id, title"),
        supabase.from("staff_work_log").select("*").order("work_date", { ascending: false }),
        supabase.from("payroll_runs").select("*, concerns(name)").order("month", { ascending: false }),
      ]);
      if (cErr) throw cErr;
      if (sErr) throw sErr;
      if (prErr) throw prErr;
      if (wlErr) throw wlErr;
      if (payErr) throw payErr;

      if (c && c.length > 0) setConcerns(c);
      if (pr) setProjects(pr);
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
      if (wl) {
        const byStaff = {};
        wl.forEach((row) => {
          if (!byStaff[row.staff_id]) byStaff[row.staff_id] = [];
          byStaff[row.staff_id].push(row);
        });
        setWorkLogs(byStaff);
      }
      if (pay) {
        setPayrollRuns(pay.map((row) => ({ ...row, concern_name: row.concerns?.name || "—" })));
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

  async function handleDeleteWorkLog(id) {
    if (!supabase) return;
    if (!confirm("এই work entry delete করবে?")) return;
    try {
      const { error } = await supabase.from("staff_work_log").delete().eq("id", id);
      if (error) throw error;
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  async function handleGeneratePayroll() {
    if (!supabase) return;
    setPayrollError("");
    if (!payrollConcern) return setPayrollError("Concern select করো");
    if (!payrollMonth) return setPayrollError("Month select করো");

    setGenerating(true);
    try {
      const monthStart = `${payrollMonth}-01`;
      const [y, m] = payrollMonth.split("-").map(Number);
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

      const fixedTotal = staffList
        .filter((s) => s.concern_id === payrollConcern && s.payment_mode === "fixed" && s.status === "Active")
        .reduce((sum, s) => sum + Number(s.salary || 0), 0);

      const concernStaffIds = new Set(staffList.filter((s) => s.concern_id === payrollConcern).map((s) => s.id));
      const unpaidEntries = Object.values(workLogs)
        .flat()
        .filter(
          (w) =>
            concernStaffIds.has(w.staff_id) &&
            !w.paid &&
            w.work_date >= monthStart &&
            w.work_date < nextMonth
        );
      const workLogTotal = unpaidEntries.reduce((sum, w) => sum + Number(w.amount || 0), 0);

      const totalAmount = fixedTotal + workLogTotal;
      if (totalAmount <= 0) {
        setPayrollError("এই concern/month-এ পে করার মতো কিছু নেই।");
        setGenerating(false);
        return;
      }

      const { data: run, error: insertErr } = await supabase
        .from("payroll_runs")
        .insert({
          concern_id: payrollConcern,
          month: monthStart,
          total_amount: totalAmount,
          status: "generated",
          generated_at: new Date().toISOString(),
        })
        .select();
      if (insertErr) throw insertErr;

      const newRunId = run?.[0]?.id;
      if (newRunId && unpaidEntries.length > 0) {
        await Promise.all(
          unpaidEntries.map((w) =>
            supabase.from("staff_work_log").update({ paid: true, payroll_run_id: newRunId }).eq("id", w.id)
          )
        );
      }

      loadData();
    } catch (err) {
      setPayrollError(err.message || "Payroll generate করা যায়নি");
    } finally {
      setGenerating(false);
    }
  }

  const activeSalaryBill = staffList
    .filter((s) => s.payment_mode === "fixed")
    .reduce((sum, s) => sum + Number(s.salary), 0);

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8 pb-16">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>Human Resources</p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>Staff & Payroll</h1>
            <p style={{ color: tokens.muted }}>Team members, work log, and payroll runs</p>
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
            <p className="text-[11px]" style={{ color: tokens.muted }}>Fixed Monthly Salary Bill</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.rust }}>{fmtBDT(activeSalaryBill)}</p>
          </div>
          <div className="rounded-xl border p-5" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <p className="text-[11px]" style={{ color: tokens.muted }}>Average Salary</p>
            <p className="text-2xl font-mono font-semibold mt-2" style={{ color: tokens.gold }}>
              {fmtBDT(staffList.length ? activeSalaryBill / staffList.length : 0)}
            </p>
          </div>
        </div>

        {supabase && (
          <div className="rounded-xl border p-6 mb-8" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} style={{ color: tokens.gold }} />
              <h3 className="text-lg font-semibold" style={{ color: tokens.bone }}>Generate Payroll</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: tokens.muted }}>
              নির্বাচিত concern-এর fixed-salary স্টাফদের মাসিক বেতন + প্রজেক্ট-ভিত্তিক স্টাফদের ওই মাসের unpaid work entries যোগ করে একটা payroll run তৈরি হবে, এবং সেই entries "paid" হিসেবে মার্ক হয়ে যাবে।
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Field label="Concern">
                <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
                  value={payrollConcern} onChange={(e) => setPayrollConcern(e.target.value)}>
                  <option value="">Select concern</option>
                  {concerns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Month">
                <input type="month" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
                  value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)} />
              </Field>
              <div className="flex items-end">
                <button
                  onClick={handleGeneratePayroll}
                  disabled={generating}
                  className="w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: tokens.moss, color: "white" }}
                >
                  {generating && <Loader2 size={16} className="animate-spin" />}
                  {generating ? "Generating…" : "Generate Payroll"}
                </button>
              </div>
            </div>
            {payrollError && <p className="text-sm mb-3" style={{ color: tokens.rust }}>{payrollError}</p>}

            {payrollRuns.length > 0 && (
              <div className="flex flex-col gap-2 border-t pt-4" style={{ borderColor: tokens.hairline }}>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: tokens.muted }}>Past runs</p>
                {payrollRuns.slice(0, 8).map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 rounded text-sm" style={{ background: tokens.surfaceRaised }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} style={{ color: tokens.moss }} />
                      <span style={{ color: tokens.bone }}>{run.concern_name}</span>
                      <span style={{ color: tokens.muted }}>{run.month?.slice(0, 7)}</span>
                    </div>
                    <span className="font-mono" style={{ color: tokens.gold }}>{fmtBDT(run.total_amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border p-6" style={{ background: tokens.surface, borderColor: tokens.hairline }}>
          <h3 className="text-lg font-semibold mb-6" style={{ color: tokens.bone }}>Team Members</h3>

          {loading && <p style={{ color: tokens.muted }}>Loading…</p>}

          <div className="flex flex-col gap-3">
            {staffList.map((member) => {
              const isProjectBased = member.payment_mode === "project_based";
              const entries = workLogs[member.id] || [];
              const unpaidTotal = entries.filter((e) => !e.paid).reduce((s, e) => s + Number(e.amount || 0), 0);
              const isExpanded = expandedStaff === member.id;

              return (
                <div key={member.id} className="rounded-lg overflow-hidden" style={{ background: tokens.surfaceRaised }}>
                  <div
                    className={`flex items-center justify-between p-4 ${isProjectBased ? "cursor-pointer" : ""}`}
                    onClick={() => isProjectBased && setExpandedStaff(isExpanded ? null : member.id)}
                  >
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
                          {isProjectBased
                            ? (unpaidTotal > 0 ? `${fmtBDT(unpaidTotal)} due` : "কাজভিত্তিক")
                            : fmtBDT(member.salary)}
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: member.status === "Active" ? tokens.moss : tokens.muted }}>
                          {member.status}
                        </p>
                      </div>
                      {supabase && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingMember(member); setShowForm(true); }}
                            style={{ color: tokens.gold }}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(member.id); }} style={{ color: tokens.rust }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                      {isProjectBased && (isExpanded ? <ChevronUp size={16} style={{ color: tokens.muted }} /> : <ChevronDown size={16} style={{ color: tokens.muted }} />)}
                    </div>
                  </div>

                  {isProjectBased && isExpanded && (
                    <div className="px-4 pb-4 border-t" style={{ borderColor: tokens.hairline }}>
                      {supabase && (
                        <button
                          onClick={() => { setWorkLogTarget(member); setEditingWorkLog(null); setShowWorkLogForm(true); }}
                          className="text-xs px-3 py-1.5 rounded-lg my-3"
                          style={{ background: tokens.ink, color: tokens.moss }}
                        >
                          + Add work entry
                        </button>
                      )}
                      <div className="flex flex-col gap-2">
                        {entries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-3 rounded text-sm" style={{ background: tokens.ink }}>
                            <div>
                              <p style={{ color: tokens.bone }}>{entry.task_description}</p>
                              <p style={{ color: tokens.muted }} className="text-[10px]">{entry.work_date} • {entry.paid ? "paid" : "unpaid"}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="font-mono" style={{ color: entry.paid ? tokens.muted : tokens.gold }}>{fmtBDT(entry.amount)}</p>
                              {supabase && !entry.paid && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setWorkLogTarget(member); setEditingWorkLog(entry); setShowWorkLogForm(true); }}
                                    style={{ color: tokens.gold }}
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button onClick={() => handleDeleteWorkLog(entry.id)} style={{ color: tokens.rust }}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        {entries.length === 0 && (
                          <p className="text-sm" style={{ color: tokens.muted }}>কোনো work entry নেই।</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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

      {showWorkLogForm && workLogTarget && (
        <WorkLogForm
          supabase={supabase}
          member={workLogTarget}
          projects={projects}
          entry={editingWorkLog}
          onClose={() => { setShowWorkLogForm(false); setEditingWorkLog(null); setWorkLogTarget(null); }}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
