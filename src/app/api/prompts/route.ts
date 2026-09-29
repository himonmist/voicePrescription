import { handle } from "@/lib/api/handler";
import { apiOpts } from "@/lib/api/common";
import { PROMPT_SEED } from "@/lib/ai/prompts/seed";

export const GET = handle(apiOpts(), async ({ actor, req }) => {
  const q = new URL(req.url).searchParams.get("q")?.toLowerCase().slice(0, 100) ?? "";
  const list = PROMPT_SEED.filter((p) => (p.audience.includes(actor.role) || p.audience.includes("USER") || actor.role === "PLATFORM_ADMIN") &&
    (!q || (p.title + p.description + p.tags.join(" ")).toLowerCase().includes(q)))
    .map(({ template: _t, ...meta }) => meta);
  return Response.json({ prompts: list });
});
