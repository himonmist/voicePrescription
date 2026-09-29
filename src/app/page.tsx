import Link from "next/link";
import { listCatalog } from "@/lib/ai/catalog/service";
import { ToolCard } from "@/components/ToolCard";
import { PROMPT_SEED } from "@/lib/ai/prompts/seed";

export const dynamic = "force-dynamic";

const MODES = [
  ["/tools", "Choose Your AI", "Select your preferred AI provider and run a task using its supported integration."],
  ["/prompts", "Prompt Library", "Discover ready-to-use prompts for clinical documentation, medical education, research, presentations, data analysis, and productivity."],
  ["/router", "Auto AI Router", "Describe your objective and receive a tool recommendation based on task requirements, integrations, permissions, cost, and availability."],
] as const;

export default async function Hub() {
  const { source, tools } = await listCatalog();
  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="rounded-3xl bg-gradient-to-br from-navy-900 to-navy-700 p-8 text-white md:p-12">
        <h1 className="text-3xl font-bold md:text-4xl">Your AI Workspace</h1>
        <p className="mt-2 max-w-2xl text-slate-200">Choose the right AI tool, discover expert prompts, or let AI find the right workflow for your task.</p>
        <form action="/router" className="mt-6 flex flex-col gap-3 md:flex-row">
          <label htmlFor="task" className="sr-only">What do you want to accomplish today?</label>
          <input id="task" name="task" placeholder="What do you want to accomplish today?" className="flex-1 rounded-xl px-4 py-3 text-navy-900" />
          <button className="rounded-xl bg-brand-violet px-6 py-3 font-semibold">Find the Best AI Tool</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-200">
          <Link href="/tools" className="underline">Choose a Tool</Link><Link href="/prompts" className="underline">Browse Prompt Library</Link>
        </div>
      </header>
      <section aria-label="Modes" className="grid gap-4 md:grid-cols-3">
        {MODES.map(([href, title, desc]) => (
          <Link key={href} href={href} className="rounded-2xl bg-white p-6 shadow-card hover:ring-2 hover:ring-brand-violet">
            <h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-600">{desc}</p>
          </Link>
        ))}
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Recommended tools</h2>
        {source === "seed" && <p className="mb-3 text-xs text-slate-500">Showing the default catalog. No administrator-managed catalog is configured yet.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tools.slice(0, 6).map((t) => <ToolCard key={t.slug} t={t} />)}</div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Popular prompt templates</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {PROMPT_SEED.map((p) => <li key={p.id} className="rounded-xl bg-white p-4 shadow-card"><h3 className="font-medium">{p.title}</h3><p className="text-sm text-slate-600">{p.description}</p></li>)}
        </ul>
      </section>
      <section aria-label="Recent sessions and usage" className="rounded-2xl bg-white p-6 shadow-card text-sm text-slate-600">
        Recent sessions and usage appear here once you run a task. <Link href="/usage" className="font-medium text-brand-violet">View usage and credits</Link>
      </section>
    </div>
  );
}
