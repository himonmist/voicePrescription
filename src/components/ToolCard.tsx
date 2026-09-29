import { StatusBadge } from "./StatusBadge";
import { effectiveStatus } from "@/lib/ai/catalog/candidates";
import type { CatalogEntry } from "@/lib/ai/catalog/seed";

export function ToolCard({ t }: { t: CatalogEntry }) {
  const status = effectiveStatus(t, undefined); // server-rendered: no live health; never shows IN_APP without a health check
  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <div aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-sm font-bold text-white">{t.name[0]}</div>
        <div><h3 className="font-semibold">{t.name}</h3><p className="text-xs text-slate-500">{t.provider}</p></div>
      </div>
      <p className="text-sm text-slate-600">{t.description}</p>
      <div className="flex flex-wrap gap-1">{t.capabilities.map((c) => <span key={c} className="rounded bg-brand-soft px-2 py-0.5 text-xs text-navy-700">{c.replace("_", " ")}</span>)}</div>
      <div className="mt-auto flex items-center justify-between">
        <StatusBadge status={status as never} />
        {t.status === "EXTERNAL"
          ? <a href={t.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand-violet">Open externally ↗</a>
          : <span className="text-xs text-slate-500">Not yet enabled</span>}
      </div>
      {t.status === "EXTERNAL" && <p className="text-xs text-slate-500">Runs outside SmartDoctorAid; results must be viewed or copied back from the external service.</p>}
    </article>
  );
}
