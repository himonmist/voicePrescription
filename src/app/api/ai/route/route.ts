import { z } from "zod";
import { handle } from "@/lib/api/handler";
import { apiOpts } from "@/lib/api/common";
import { classifyTask, routeTask } from "@/lib/ai/router/router";
import { listCatalog } from "@/lib/ai/catalog/service";
import { toCandidate } from "@/lib/ai/catalog/candidates";
import { buildRegistry } from "@/lib/ai/providers/registry";

const schema = z.object({ task: z.string().min(3).max(5000), preferredToolId: z.string().max(64).optional(), plan: z.string().max(20).default("FREE") }).strict();

export const POST = handle(apiOpts({ schema }), async ({ body }) => {
  const task = classifyTask(body.task);
  const { tools } = await listCatalog();
  const reg = buildRegistry();
  const candidates = await Promise.all(tools.map(async (t) => {
    const a = t.providerKey ? reg.get(t.providerKey) : undefined;
    const h = a ? await a.health() : undefined;
    return toCandidate(t, a && h ? { healthy: h.healthy, approvedForPHI: a.approvedForPHI } : undefined);
  }));
  const result = routeTask({ ...task, plan: body.plan, estTokens: Math.ceil(body.task.length / 4), preferredToolId: body.preferredToolId }, candidates);
  return Response.json({
    task, ...result,
    // Transparency for the confirmation step: what leaves the platform and where it runs.
    disclosure: result.selected ? { execution: "in-app via server-side provider adapter", dataSharedWith: result.selected.name, containsPatientData: task.hasPatientData } : null,
  });
});
