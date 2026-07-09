import React, { useEffect, useState } from "react";
import { Briefcase, Plus, X, Loader2, Edit2, Trash2, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { tokens, fmtBDT, inputStyle } from "../lib/theme";
import Field from "../components/Field";

const PROJECT_STATUS = [
  { value: "active", label: "Active" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "completed", label: "Completed" },
  { value: "stalled", label: "Stalled" },
];
const MILESTONE_STATUS = ["pending", "partially_paid", "paid", "overdue"];

const SAMPLE_CONCERNS = [
  { id: "1", name: "Tru Multimedia Limited" },
  { id: "2", name: "Truphoto Studio" },
  { id: "3", name: "4R Studio" },
  { id: "4", name: "Uthsob Mukhor" },
];

function projectStatusLabel(status) {
  return PROJECT_STATUS.find((s) => s.value === status)?.label || status;
}

function statusColor(status) {
  if (status === "active" || status === "paid") return tokens.moss;
  if (status === "completed") return tokens.gold;
  if (status === "stalled" || status === "overdue") return tokens.rust;
  return tokens.muted;
}

function ProjectForm({ supabase, concerns, project, onClose, onSaved }) {
  const [form, setForm] = useState({
    concern_id: project?.concern_id || "",
    client_name: project?.client_name || "",
    title: project?.title || "",
    total_contract_value: project?.total_contract_value || "",
    status: project?.status || "active",
    start_date: project?.start_date || new Date().toISOString().slice(0, 10),
    end_date: project?.end_date || "",
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
    if (!form.title) return setError("Project title দাও");
    if (!form.total_contract_value || Number(form.total_contract_value) <= 0) {
      return setError("সঠিক Contract value দাও");
    }

    setSaving(true);
    try {
      if (!supabase) {
        alert("Supabase connected নেই।");
        setSaving(false);
        return;
      }

      const payload = {
        concern_id: form.concern_id,
        client_name: form.client_name || null,
        title: form.title,
        total_contract_value: Number(form.total_contract_value),
        status: form.status,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      };

      if (project?.id) {
        const { error: updateErr } = await supabase.from("projects").update(payload).eq("id", project.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("projects").insert(payload);
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
            {project ? "Edit project" : "Add project"}
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

        <Field label="Project title">
          <input type="text" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="e.g. Wedding shoot — Rahman family" />
        </Field>

        <Field label="Client name (optional)">
          <input type="text" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.client_name} onChange={(e) => update("client_name", e.target.value)} placeholder="Client name" />
        </Field>

        <Field label="Total contract value (৳)">
          <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
            value={form.total_contract_value} onChange={(e) => update("total_contract_value", e.target.value)} placeholder="0" />
        </Field>

        <Field label="Status">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.status} onChange={(e) => update("status", e.target.value)}>
            {PROJECT_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input type="date" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
              value={form.start_date} onChange={(e) => update("start_date", e.target.value)} />
          </Field>
          <Field label="End date (optional)">
            <input type="date" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
              value={form.end_date} onChange={(e) => update("end_date", e.target.value)} />
          </Field>
        </div>

        {error && <p className="text-sm" style={{ color: tokens.rust }}>{error}</p>}

        <button type="submit" disabled={saving}
          className="mt-2 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: tokens.gold, color: "white" }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : (project ? "Update project" : "Save project")}
        </button>
      </form>
    </div>
  );
}

function MilestoneForm({ supabase, project, milestone, onClose, onSaved }) {
  const [form, setForm] = useState({
    description: milestone?.description || "",
    amount_expected: milestone?.amount_expected || "",
    amount_received: milestone?.amount_received || "0",
    due_date: milestone?.due_date || "",
    status: milestone?.status || "pending",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.description) return setError("Milestone-এর description দাও");
    if (!form.amount_expected || Number(form.amount_expected) <= 0) {
      return setError("সঠিক Expected amount দাও");
    }

    setSaving(true);
    try {
      if (!supabase) {
        alert("Supabase connected নেই।");
        setSaving(false);
        return;
      }

      const payload = {
        project_id: project.id,
        description: form.description,
        amount_expected: Number(form.amount_expected),
        amount_received: Number(form.amount_received || 0),
        due_date: form.due_date || null,
        status: form.status,
      };

      if (milestone?.id) {
        const { error: updateErr } = await supabase.from("project_payments").update(payload).eq("id", milestone.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from("project_payments").insert(payload);
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
            {milestone ? "Edit milestone" : "Add milestone"} — {project.title}
          </h2>
          <button type="button" onClick={onClose} style={{ color: tokens.muted }}><X size={20} /></button>
        </div>

        <Field label="Description">
          <input type="text" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="e.g. Advance payment" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Expected (৳)">
            <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
              value={form.amount_expected} onChange={(e) => update("amount_expected", e.target.value)} placeholder="0" />
          </Field>
          <Field label="Received so far (৳)">
            <input type="number" className="rounded-lg border px-3 py-2 text-sm font-mono" style={inputStyle}
              value={form.amount_received} onChange={(e) => update("amount_received", e.target.value)} placeholder="0" />
          </Field>
        </div>

        <Field label="Due date">
          <input type="date" className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.due_date} onChange={(e) => update("due_date", e.target.value)} />
        </Field>

        <Field label="Status">
          <select className="rounded-lg border px-3 py-2 text-sm" style={inputStyle}
            value={form.status} onChange={(e) => update("status", e.target.value)}>
            {MILESTONE_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </Field>

        {error && <p className="text-sm" style={{ color: tokens.rust }}>{error}</p>}

        <button type="submit" disabled={saving}
          className="mt-2 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: tokens.moss, color: "white" }}>
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Saving…" : (milestone ? "Update milestone" : "Save milestone")}
        </button>
      </form>
    </div>
  );
}

export default function Projects({ supabase }) {
  const [projects, setProjects] = useState([]);
  const [concerns, setConcerns] = useState(SAMPLE_CONCERNS);
  const [milestones, setMilestones] = useState({});
  const [plByProject, setPlByProject] = useState({});
  const [loading, setLoading] = useState(!!supabase);
  const [liveError, setLiveError] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneTargetProject, setMilestoneTargetProject] = useState(null);

  async function loadData() {
    if (!supabase) return;
    try {
      const [
        { data: c, error: cErr },
        { data: p, error: pErr },
        { data: m, error: mErr },
        { data: pl, error: plErr },
      ] = await Promise.all([
        supabase.from("concerns").select("id, name"),
        supabase.from("projects").select("*, concerns(name)").order("created_at", { ascending: false }),
        supabase.from("project_payments").select("*").order("due_date", { ascending: true }),
        supabase.from("project_pl_view").select("*"),
      ]);
      if (cErr) throw cErr;
      if (pErr) throw pErr;
      if (mErr) throw mErr;
      if (plErr) throw plErr;

      if (c && c.length > 0) setConcerns(c);
      if (p) {
        setProjects(
          p.map((row) => ({
            ...row,
            concern_name: row.concerns?.name || "—",
          }))
        );
      }
      if (m) {
        const byProject = {};
        m.forEach((row) => {
          if (!byProject[row.project_id]) byProject[row.project_id] = [];
          byProject[row.project_id].push(row);
        });
        setMilestones(byProject);
      }
      if (pl) {
        const byProject = {};
        pl.forEach((row) => { byProject[row.project_id] = row; });
        setPlByProject(byProject);
      }
    } catch (err) {
      console.error("Projects load failed:", err);
      setLiveError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  async function handleDeleteProject(id) {
    if (!supabase) return;
    if (!confirm("এই project delete করবে? এর সব মাইলস্টোনও মুছে যাবে।")) return;
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  async function handleDeleteMilestone(id) {
    if (!supabase) return;
    if (!confirm("এই milestone delete করবে?")) return;
    try {
      const { error } = await supabase.from("project_payments").delete().eq("id", id);
      if (error) throw error;
      loadData();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  }

  return (
    <div className="min-h-screen w-full" style={{ background: tokens.ink }}>
      <div className="max-w-5xl mx-auto px-5 py-8 pb-16">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: tokens.muted }}>Project Tracking</p>
            <h1 className="text-2xl font-semibold mt-1" style={{ color: tokens.bone }}>Projects</h1>
            <p style={{ color: tokens.muted }}>Milestones, dues, and per-project P&amp;L</p>
          </div>
          <button
            onClick={() => { setEditingProject(null); setShowProjectForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: tokens.gold, color: "white" }}
          >
            <Plus size={16} /> Add project
          </button>
        </div>

        {liveError && (
          <p className="text-sm mb-4" style={{ color: tokens.rust }}>
            Live data connect করা যায়নি — Supabase project active আছে কিনা check করো।
          </p>
        )}

        {loading && <p style={{ color: tokens.muted }}>Loading…</p>}

        <div className="flex flex-col gap-4">
          {projects.map((project) => {
            const pl = plByProject[project.id];
            const projectMilestones = milestones[project.id] || [];
            const totalExpected = projectMilestones.reduce((s, m) => s + Number(m.amount_expected || 0), 0);
            const totalReceived = projectMilestones.reduce((s, m) => s + Number(m.amount_received || 0), 0);
            const due = totalExpected - totalReceived;

            return (
              <div key={project.id} className="border rounded-lg p-5" style={{ borderColor: tokens.hairline }}>
                <div
                  className="flex items-start justify-between mb-4 cursor-pointer"
                  onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
                >
                  <div className="flex items-center gap-3">
                    <Briefcase size={22} style={{ color: tokens.gold }} />
                    <div>
                      <p style={{ color: tokens.bone }} className="font-semibold">{project.title}</p>
                      <p style={{ color: tokens.muted }} className="text-sm">
                        {project.concern_name}{project.client_name ? ` • ${project.client_name}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ color: statusColor(project.status), background: tokens.surfaceRaised }}
                    >
                      {projectStatusLabel(project.status)}
                    </span>
                    {supabase && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingProject(project); setShowProjectForm(true); }}
                          style={{ color: tokens.gold }}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                          style={{ color: tokens.rust }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-[11px]" style={{ color: tokens.muted }}>Contract value</p>
                    <p className="text-sm font-mono mt-1" style={{ color: tokens.bone }}>{fmtBDT(project.total_contract_value)}</p>
                  </div>
                  <div>
                    <p className="text-[11px]" style={{ color: tokens.muted }}>Received</p>
                    <p className="text-sm font-mono mt-1" style={{ color: tokens.moss }}>{fmtBDT(totalReceived)}</p>
                  </div>
                  <div>
                    <p className="text-[11px]" style={{ color: tokens.muted }}>Due</p>
                    <p className="text-sm font-mono mt-1" style={{ color: due > 0 ? tokens.rust : tokens.muted }}>{fmtBDT(due)}</p>
                  </div>
                  <div>
                    <p className="text-[11px]" style={{ color: tokens.muted }}>Net P&amp;L</p>
                    <p className="text-sm font-mono mt-1" style={{ color: (pl?.net_pl ?? 0) >= 0 ? tokens.moss : tokens.rust }}>
                      {pl ? fmtBDT(pl.net_pl) : "—"}
                    </p>
                  </div>
                </div>

                {supabase && (
                  <button
                    onClick={() => { setMilestoneTargetProject(project); setEditingMilestone(null); setShowMilestoneForm(true); }}
                    className="text-xs px-3 py-1.5 rounded-lg mb-4"
                    style={{ background: tokens.surfaceRaised, color: tokens.moss }}
                  >
                    + Add milestone
                  </button>
                )}

                {expandedProject === project.id && (
                  <div className="border-t" style={{ borderColor: tokens.hairline }}>
                    <p className="text-xs uppercase tracking-wide mt-4 mb-3" style={{ color: tokens.muted }}>Milestones</p>
                    <div className="flex flex-col gap-2">
                      {projectMilestones.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 rounded text-sm" style={{ background: tokens.surfaceRaised }}>
                          <div className="flex items-center gap-2">
                            {Number(m.amount_received) >= Number(m.amount_expected) ? (
                              <TrendingUp size={16} style={{ color: tokens.moss }} />
                            ) : (
                              <TrendingDown size={16} style={{ color: tokens.rust }} />
                            )}
                            <div>
                              <p style={{ color: tokens.bone }}>{m.description}</p>
                              <p style={{ color: tokens.muted }} className="text-[10px] flex items-center gap-1">
                                <Calendar size={10} /> {m.due_date || "no due date"} • {m.status.replace(/_/g, " ")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-mono text-right" style={{ color: tokens.bone }}>
                              {fmtBDT(m.amount_received)} <span style={{ color: tokens.muted }}>/ {fmtBDT(m.amount_expected)}</span>
                            </p>
                            {supabase && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setMilestoneTargetProject(project); setEditingMilestone(m); setShowMilestoneForm(true); }}
                                  style={{ color: tokens.gold }}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDeleteMilestone(m.id)} style={{ color: tokens.rust }}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {projectMilestones.length === 0 && (
                        <p className="text-sm" style={{ color: tokens.muted }}>কোনো milestone নেই।</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {projects.length === 0 && !loading && (
            <p style={{ color: tokens.muted }}>কোনো project নেই।</p>
          )}
        </div>
      </div>

      {showProjectForm && (
        <ProjectForm
          supabase={supabase}
          concerns={concerns}
          project={editingProject}
          onClose={() => { setShowProjectForm(false); setEditingProject(null); }}
          onSaved={loadData}
        />
      )}

      {showMilestoneForm && milestoneTargetProject && (
        <MilestoneForm
          supabase={supabase}
          project={milestoneTargetProject}
          milestone={editingMilestone}
          onClose={() => { setShowMilestoneForm(false); setEditingMilestone(null); setMilestoneTargetProject(null); }}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
