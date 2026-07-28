import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { inputClass } from '../components/Field.jsx';

// Gates the entire app (see App.jsx) — nothing renders until a valid
// Supabase Auth session exists. Only the 3 partner accounts, created
// directly in the Supabase Dashboard, can ever sign in here.
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surfaceRaised border border-slate-200 rounded-2xl shadow-card p-6">
        <h1 className="text-lg font-semibold text-slate-900 mb-1">Tru ERP</h1>
        <p className="text-sm text-slate-500 mb-5">Tru Multimedia Limited — sign in to continue</p>

        <form onSubmit={handleSubmit}>
          <label className="block mb-3">
            <span className="block text-xs text-slate-500 mb-1">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block mb-4">
            <span className="block text-xs text-slate-500 mb-1">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-expense mb-3">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 flex items-center justify-center rounded-xl text-sm font-medium bg-primary text-white hover:bg-primaryHover active:bg-primaryHover disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
