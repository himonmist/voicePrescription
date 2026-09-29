"use client";
import { useState } from "react";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function post(path: string, body: unknown) {
    const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { ok: r.ok, status: r.status, json: await r.json().catch(() => ({})) };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      if (mode === "register") {
        const reg = await post("/api/auth/register", { email, password, ...(name ? { name } : {}) });
        if (!reg.ok) { setErr(reg.json.error?.message ?? "Could not create account"); return; }
      }
      const res = await post("/api/auth/login", { email, password });
      if (!res.ok) { setErr(res.status === 429 ? "Too many attempts. Try again later." : res.json.error?.message ?? "Sign-in failed"); return; }
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      window.location.href = /^\/(?![/\\])/.test(next) ? next : "/"; // same-site relative paths only: no open redirect
    } catch { setErr("Network error. Try again."); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl bg-white p-6 shadow-card" aria-label={mode === "login" ? "Sign in" : "Create account"}>
      <h1 className="text-2xl font-bold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
      {mode === "register" && (
        <div><label htmlFor="name" className="block text-sm font-medium">Name (optional)</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" className="mt-1 w-full rounded-xl border px-3 py-2" /></div>
      )}
      <div><label htmlFor="email" className="block text-sm font-medium">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" className="mt-1 w-full rounded-xl border px-3 py-2" /></div>
      <div><label htmlFor="password" className="block text-sm font-medium">Password</label>
        <input id="password" type="password" required minLength={mode === "register" ? 12 : 1} maxLength={200} value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1 w-full rounded-xl border px-3 py-2" />
        {mode === "register" && <p className="mt-1 text-xs text-slate-500">At least 12 characters.</p>}</div>
      {err && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-brand-violet px-5 py-2 font-semibold text-white disabled:opacity-50">
        {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(null); }} className="w-full text-sm text-brand-violet">
        {mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}
