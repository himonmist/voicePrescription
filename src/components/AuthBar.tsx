"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function AuthBar() {
  const [state, setState] = useState<"loading" | "out" | { role: string }>("loading");

  useEffect(() => {
    fetch("/api/auth/me").then(async (r) => setState(r.ok ? { role: (await r.json()).role } : "out")).catch(() => setState("out"));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    window.location.href = "/login";
  }

  if (state === "loading") return null;
  if (state === "out") return <Link href="/login" className="mt-4 block rounded-lg bg-navy-900 px-3 py-2 text-center text-sm font-medium text-white">Sign in</Link>;
  return (
    <div className="mt-4 rounded-lg bg-brand-soft p-3 text-xs text-navy-700">
      Signed in as <b>{state.role.replace("_", " ").toLowerCase()}</b>
      <button onClick={logout} className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium">Sign out</button>
    </div>
  );
}
