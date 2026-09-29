"use client";
import { useState } from "react";

type Res = { explanation: string; selected: { name: string } | null; shortlist: { id: string; name: string }[]; externalAlternatives: { name: string }[]; rejected: { id: string; reason: string }[]; ambiguous: boolean; disclosure: { execution: string; dataSharedWith: string; containsPatientData: boolean } | null };

export function RouterForm({ initialTask }: { initialTask: string }) {
  const [task, setTask] = useState(initialTask);
  const [res, setRes] = useState<Res | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/ai/route", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task }) });
      const j = await r.json();
      if (!r.ok) setErr(r.status === 401 ? "Please sign in to use the router." : j.error?.message ?? "Request failed");
      else setRes(j);
    } catch { setErr("Network error. Try again."); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <form onSubmit={go} className="space-y-3">
        <label htmlFor="t" className="block text-sm font-medium">Describe what you want to accomplish</label>
        <textarea id="t" value={task} onChange={(e) => setTask(e.target.value)} rows={4} maxLength={5000} required className="w-full rounded-xl border p-3" />
        <button disabled={busy || task.trim().length < 3} className="rounded-xl bg-brand-violet px-5 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Analysing…" : "Find the Best AI Tool"}</button>
      </form>
      {err && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-700">{err}</p>}
      {res && (
        <section aria-live="polite" className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="font-semibold">Recommendation</h2>
          <p>{res.explanation}</p>
          {res.disclosure && <p className="rounded bg-brand-soft p-3 text-sm">Runs: {res.disclosure.execution}. Data shared with: {res.disclosure.dataSharedWith}.{res.disclosure.containsPatientData && " Patient data detected: explicit consent and a PHI-approved provider are required."}</p>}
          {res.ambiguous && <ul className="list-disc pl-5">{res.shortlist.map((s) => <li key={s.id}>{s.name}</li>)}</ul>}
          {res.externalAlternatives.length > 0 && <p className="text-sm">External options: {res.externalAlternatives.map((a) => a.name).join(", ")} (these run outside SmartDoctorAid).</p>}
          <details><summary className="cursor-pointer text-sm text-slate-600">Why other tools were not chosen</summary>
            <ul className="mt-2 text-sm text-slate-600">{res.rejected.map((r) => <li key={r.id}><b>{r.id}</b>: {r.reason}</li>)}</ul></details>
        </section>
      )}
    </div>
  );
}
