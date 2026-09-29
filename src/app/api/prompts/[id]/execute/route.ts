import { z } from "zod";
import { handle } from "@/lib/api/handler";
import { apiOpts, execLimiter } from "@/lib/api/common";
import { PROMPT_SEED } from "@/lib/ai/prompts/seed";
import { validateVariables, renderPrompt } from "@/lib/ai/prompts/variables";
import { runExecution } from "@/lib/ai/service";
import { prismaDeps } from "@/lib/ai/deps";

const schema = z.object({
  executionId: z.string().uuid(), providerId: z.string().max(40), model: z.string().max(80),
  variables: z.record(z.string(), z.unknown()), userConsented: z.boolean().default(false),
}).strict();

export const POST = handle(apiOpts({ schema, limiter: execLimiter, maxBytes: 3_000_000 }), async ({ actor, body, req }) => {
  const id = new URL(req.url).pathname.split("/").at(-2);
  const p = PROMPT_SEED.find((x) => x.id === id);
  if (!p) return Response.json({ error: { code: "NOT_FOUND", message: "Prompt not found" } }, { status: 404 });
  const v = validateVariables(p.variables, body.variables);
  if (!v.ok) return Response.json({ error: { code: "VALIDATION_ERROR", message: "Invalid variables", fields: v.errors } }, { status: 400 });
  const prompt = renderPrompt(p.template, body.variables);
  const r = await runExecution(actor, {
    executionId: body.executionId, providerId: body.providerId, model: body.model, prompt,
    hasPatientData: false, userConsented: body.userConsented, clinical: p.safetyClass === "CLINICAL_DRAFT",
  }, prismaDeps());
  return Response.json(r, { status: r.status === "SUCCEEDED" ? 200 : r.status === "BLOCKED" ? (r.upgrade ? 402 : 403) : 502 });
});
