import { PROMPT_SEED } from "@/lib/ai/prompts/seed";
export default function Prompts() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">Prompt Library</h1>
      {PROMPT_SEED.map((p) => (
        <article key={p.id} className="rounded-2xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between"><h2 className="font-semibold">{p.title}</h2><span className="text-xs text-slate-500">v{p.version}</span></div>
          <p className="text-sm text-slate-600">{p.description}</p>
          <p className="mt-2 text-xs text-slate-500">Requires: {p.variables.filter((v) => v.required).map((v) => v.label).join(", ")}</p>
          {p.safetyClass === "CLINICAL_DRAFT" && <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800">Clinical draft: output must be reviewed and approved by the treating doctor. Patient data is only sent to providers approved for it, with your consent.</p>}
        </article>
      ))}
    </div>
  );
}
