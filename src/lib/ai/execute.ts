import type { Actor } from "./security/authz";
import { evaluateDataSharing } from "./security/guard";
import { checkEntitlement, type Ledger, type PlanLimits, type UsageTotals } from "./billing/quota";
import { ProviderError, type ProviderAdapter, type Usage } from "./providers/types";
import { markDraft, DRAFT_BANNER } from "./healthcare";

export interface ExecRequest {
  executionId: string; actor: Actor; providerId: string; model: string;
  system?: string; prompt: string; history?: { role: "user" | "assistant"; content: string }[];
  hasPatientData: boolean; userConsented: boolean; clinical?: boolean; estCredits: number;
  signal?: AbortSignal;
}
export interface ExecDeps {
  getAdapter(id: string): ProviderAdapter | undefined;
  ledger: Ledger;
  getPlan(actor: Actor): Promise<PlanLimits>;
  getUsage(actor: Actor): Promise<UsageTotals>;
  orgAllowsExternal(orgId: string | null): Promise<boolean>;
  recordAudit(e: { type: string; actorId: string; orgId: string | null; executionId: string; detail?: Record<string, unknown> }): Promise<void>;
  recordUsage(u: { executionId: string; userId: string; orgId: string | null; providerId: string; model: string; status: string; usage?: Usage; latencyMs: number; credits: number; failureCode?: string }): Promise<void>;
  alternatives?(providerId: string): Promise<string[]>;
  /** Idempotency store; production backs this with a UNIQUE(userId, executionId) DB row. */
  results: Map<string, ExecResult>;
}
export interface ExecResult {
  status: "SUCCEEDED" | "FAILED" | "BLOCKED"; code?: string; message?: string; text?: string;
  usage?: Usage; devMode?: boolean; draftNotice?: string; requiresDoctorReview?: boolean;
  alternatives?: string[]; upgrade?: boolean; isEstimateCost?: boolean;
}

export async function executeAI(req: ExecRequest, d: ExecDeps): Promise<ExecResult> {
  const idemKey = `${req.actor.userId}:${req.executionId}`; // scoped per user: no cross-user result leakage
  const cached = d.results.get(idemKey);
  if (cached?.status === "SUCCEEDED") return cached; // retry returns same result, no second provider call / charge

  const a = req.actor;
  const audit = (type: string, detail?: Record<string, unknown>) =>
    d.recordAudit({ type, actorId: a.userId, orgId: a.orgId, executionId: req.executionId, detail });
  const block = async (code: string, message: string, extra: Partial<ExecResult> = {}): Promise<ExecResult> => {
    await audit("EXECUTION_BLOCKED", { code });
    return { status: "BLOCKED", code, message, ...extra };
  };

  const adapter = d.getAdapter(req.providerId);
  if (!adapter) return { status: "FAILED", code: "PROVIDER_NOT_FOUND", message: "Provider not available", alternatives: await d.alternatives?.(req.providerId) };

  const share = evaluateDataSharing({
    hasPatientData: req.hasPatientData, providerApprovedForPHI: adapter.approvedForPHI,
    userConsented: req.userConsented, orgAllowsExternal: await d.orgAllowsExternal(a.orgId), external: adapter.external,
  });
  if (!share.allowed) return block(share.requiresConsent ? "CONSENT_REQUIRED" : "DATA_SHARING_BLOCKED", share.reason ?? "Blocked");

  const ent = checkEntitlement(await d.getPlan(a), await d.getUsage(a), req.estCredits);
  if (!ent.allowed) return block(ent.code!, "Usage limit reached", { upgrade: ent.upgrade });

  const t0 = Date.now();
  try {
    const out = await adapter.complete({
      model: req.model, system: req.system,
      messages: [...(req.history ?? []), { role: "user", content: req.prompt }], signal: req.signal,
    });
    await d.ledger.charge(a.userId, req.executionId, req.estCredits); // charged only after success; idempotent by key
    await d.recordUsage({ executionId: req.executionId, userId: a.userId, orgId: a.orgId, providerId: adapter.id, model: out.model,
      status: "SUCCEEDED", usage: out.usage, latencyMs: Date.now() - t0, credits: req.estCredits }); // no prompt/response content
    await audit("EXECUTION_SUCCEEDED", { provider: adapter.id, devMode: adapter.devMode });
    const res: ExecResult = {
      status: "SUCCEEDED", text: req.clinical ? markDraft(out.text) : out.text, usage: out.usage, devMode: adapter.devMode,
      isEstimateCost: true, ...(req.clinical ? { draftNotice: DRAFT_BANNER, requiresDoctorReview: true } : {}),
    };
    d.results.set(idemKey, res);
    return res;
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : "UNKNOWN";
    await d.recordUsage({ executionId: req.executionId, userId: a.userId, orgId: a.orgId, providerId: adapter.id, model: req.model,
      status: "FAILED", latencyMs: Date.now() - t0, credits: 0, failureCode: code });
    await audit("EXECUTION_FAILED", { provider: adapter.id, code });
    return { status: "FAILED", code, message: "The AI provider could not complete the request. You have not been charged.",
      alternatives: await d.alternatives?.(adapter.id) };
  }
}
