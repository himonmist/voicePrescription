import { handle } from "@/lib/api/handler";
import { apiOpts } from "@/lib/api/common";
import { listCatalog } from "@/lib/ai/catalog/service";
import { buildRegistry } from "@/lib/ai/providers/registry";
import { effectiveStatus } from "@/lib/ai/catalog/candidates";

export const GET = handle(apiOpts(), async () => {
  const { source, tools } = await listCatalog();
  const reg = buildRegistry();
  const out = await Promise.all(tools.map(async (t) => {
    const a = t.providerKey ? reg.get(t.providerKey) : undefined;
    const h = a ? await a.health() : undefined;
    return { ...t, effectiveStatus: effectiveStatus(t, h ? { healthy: h.healthy } : undefined) };
  }));
  return Response.json({ source, tools: out });
});
