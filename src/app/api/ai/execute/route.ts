import { z } from "zod";
import { handle } from "@/lib/api/handler";
import { apiOpts, execLimiter } from "@/lib/api/common";
import { runExecution } from "@/lib/ai/service";
import { prismaDeps } from "@/lib/ai/deps";

const schema = z.object({
  executionId: z.string().uuid(), providerId: z.string().max(40), model: z.string().max(80),
  prompt: z.string().min(1).max(100_000),
  hasPatientData: z.boolean().default(false), userConsented: z.boolean().default(false), clinical: z.boolean().default(false),
  attachments: z.array(z.object({ name: z.string().max(200), text: z.string().max(500_000) })).max(10).optional(),
}).strict();

export const POST = handle(apiOpts({ schema, limiter: execLimiter, maxBytes: 3_000_000 }), async ({ actor, body }) => {
  const r = await runExecution(actor, body, prismaDeps());
  const status = r.status === "SUCCEEDED" ? 200 : r.status === "BLOCKED" ? (r.upgrade ? 402 : 403) : 502;
  return Response.json(r, { status });
});
