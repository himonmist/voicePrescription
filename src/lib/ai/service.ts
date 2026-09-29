import type { Actor } from "./security/authz";
import { executeAI, type ExecDeps, type ExecResult } from "./execute";
import { detectInjection, wrapUntrusted, UNTRUSTED_POLICY } from "./security/guard";
import { classifyTask } from "./router/router";
import { isModelAllowed, estimateRequestCredits } from "./providers/models";
import { SYSTEM_PREAMBLE } from "./prompts/seed";

export interface ExecutionInput {
  executionId: string; providerId: string; model: string; prompt: string;
  hasPatientData: boolean; userConsented: boolean; clinical: boolean;
  attachments?: { name: string; text: string }[];
  history?: { role: "user" | "assistant"; content: string }[];
}

/** Server-side gate shared by every execution entry point. Never trusts client-declared safety/cost fields. */
export async function runExecution(
  actor: Actor, input: ExecutionInput, deps: ExecDeps, env: Record<string, string | undefined> = process.env,
): Promise<ExecResult> {
  if (!isModelAllowed(input.providerId, input.model, env)) {
    await deps.recordAudit({ type: "EXECUTION_BLOCKED", actorId: actor.userId, orgId: actor.orgId, executionId: input.executionId, detail: { code: "MODEL_NOT_ALLOWED" } });
    return { status: "BLOCKED", code: "MODEL_NOT_ALLOWED", message: "This model is not enabled" };
  }
  const attachments = input.attachments ?? [];
  const hasPatientData = input.hasPatientData || input.clinical ||
    classifyTask([input.prompt, ...attachments.map((a) => a.text)].join("\n")).hasPatientData;

  for (const a of attachments) {
    if (detectInjection(a.text).flagged)
      await deps.recordAudit({ type: "INJECTION_SUSPECTED", actorId: actor.userId, orgId: actor.orgId, executionId: input.executionId, detail: { attachment: a.name } });
  }
  const body = [input.prompt, ...attachments.map((a) => wrapUntrusted(a.name, a.text))].join("\n\n");

  return executeAI({
    executionId: input.executionId, actor, providerId: input.providerId, model: input.model,
    system: `${SYSTEM_PREAMBLE}\n${UNTRUSTED_POLICY}`, prompt: body, history: input.history,
    hasPatientData, userConsented: input.userConsented, clinical: input.clinical,
    estCredits: estimateRequestCredits(body),
  }, deps);
}
