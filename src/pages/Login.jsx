import React, { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { tokens, inputStyle } from "../lib/theme";
import Field from "../components/Field";

export default function Login({ supabase }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) return setError("Email ও Password দাও");

    setSaving(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) throw signInErr;
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: tokens.ink }}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border p-8 flex flex-col gap-4"
        style={{ background: tokens.surface, borderColor: tokens.hairline }}
      >
        <div className="flex flex-col items-center gap-2 mb-2">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: tokens.surfaceRaised }}>
            <Lock size={22} style={{ color: tokens.gold }} />
          </div>
          <h1 className="text-lg font-semibold" style={{ color: tokens.bone }}>Tru Multimedia</h1>
          <p className="text-xs uppercase tracking-widest" style={{ color: tokens.muted }}>Financial Engine</p>
        </div>

        <Field label="Email">
          <input
            type="email"
            autoComplete="username"
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            autoComplete="current-password"
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error && <p className="text-sm" style={{ color: tokens.rust }}>{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: tokens.gold, color: "white" }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
