import { listCatalog } from "@/lib/ai/catalog/service";
import { ToolCard } from "@/components/ToolCard";
export const dynamic = "force-dynamic";
export default async function Tools({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q = "", category = "" } = await searchParams;
  const { tools } = await listCatalog();
  const cats = [...new Set(tools.map((t) => t.category))];
  const shown = tools.filter((t) => (!category || t.category === category) && (!q || `${t.name} ${t.description} ${t.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Discover AI Tools</h1>
      <form className="flex flex-wrap gap-3"><input name="q" defaultValue={q} aria-label="Search tools" placeholder="Search tools" className="rounded-xl border px-4 py-2" />
        <select name="category" defaultValue={category} aria-label="Category" className="rounded-xl border px-3 py-2"><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <button className="rounded-xl bg-navy-900 px-4 py-2 text-white">Search</button></form>
      {shown.length === 0 ? <p className="text-slate-600">No tools match your search.</p> :
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((t) => <ToolCard key={t.slug} t={t} />)}</div>}
    </div>
  );
}
