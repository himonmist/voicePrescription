import { handle } from "@/lib/api/handler";
import { apiOpts } from "@/lib/api/common";
import { prismaDeps } from "@/lib/ai/deps";
import { dbConfigured } from "@/lib/db";

export const GET = handle(apiOpts(), async ({ actor }) => {
  if (!dbConfigured()) return Response.json({ available: false, reason: "Database not configured" });
  const d = prismaDeps();
  const [plan, usage] = await Promise.all([d.getPlan(actor), d.getUsage(actor)]);
  return Response.json({ available: true, plan, usage, isEstimate: true });
});
