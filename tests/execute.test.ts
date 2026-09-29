import { describe, it, expect, vi } from "vitest";
import { executeAI, type ExecDeps } from "@/lib/ai/execute";
import { InMemoryLedger } from "@/lib/ai/billing/quota";
import type { ProviderAdapter } from "@/lib/ai/providers/types";
import { ProviderError } from "@/lib/ai/providers/types";

const plan = { code: "FREE", monthlyExecutions: 10, monthlyCredits: 100, spendLimitCents: 1000 };
const okAdapter = (over: Partial<ProviderAdapter> = {}): ProviderAdapter => ({
  id: "p1", devMode: false, approvedForPHI: false, external: true,
  complete: vi.fn(async () => ({ text: "hello", usage: { inputTokens: 10, outputTokens: 5 }, model: "m" })),
  health: async () => ({ healthy: true }),
  ...over,
});
function deps(adapters: ProviderAdapter[], extra: Partial<ExecDeps> = {}): ExecDeps & { audit: any[]; usage: any[] } {
  const audit: any[] = []; const usage: any[] = [];
  return {
    getAdapter: (id: string) => adapters.find((a) => a.id === id),
    ledger: new InMemoryLedger(),
    getPlan: async () => plan,
    getUsage: async () => ({ executions: 0, credits: 0, spendCents: 0 }),
    audit: audit, usage: usage,
    recordAudit: async (e: any) => { audit.push(e); },
    recordUsage: async (u: any) => { usage.push(u); },
    orgAllowsExternal: async () => true,
    results: new Map(),
    ...extra,
  } as any;
}
const req = (o: any = {}) => ({
  executionId: "e1", actor: { userId: "u1", orgId: "o1", role: "DOCTOR" as const }, providerId: "p1", model: "m",
  prompt: "Summarise", hasPatientData: false, userConsented: false, estCredits: 2, ...o,
});

describe("executeAI", () => {
  it("runs, charges once, records usage without prompt content", async () => {
    const d = deps([okAdapter()]);
    const r = await executeAI(req(), d);
    expect(r.status).toBe("SUCCEEDED"); expect(r.text).toBe("hello");
    expect((d.ledger as InMemoryLedger).balanceUsed("u1")).toBe(2);
    expect(JSON.stringify(d.usage)).not.toContain("Summarise");
    expect(d.audit.length).toBeGreaterThan(0);
  });
  it("blocks over quota before calling provider", async () => {
    const a = okAdapter();
    const d = deps([a], { getUsage: async () => ({ executions: 10, credits: 0, spendCents: 0 }) });
    const r = await executeAI(req(), d);
    expect(r.status).toBe("BLOCKED"); expect(r.code).toBe("QUOTA_EXCEEDED");
    expect(a.complete).not.toHaveBeenCalled();
  });
  it("blocks patient data to non-PHI provider without calling it", async () => {
    const a = okAdapter();
    const r = await executeAI(req({ hasPatientData: true, userConsented: true }), deps([a]));
    expect(r.status).toBe("BLOCKED"); expect(a.complete).not.toHaveBeenCalled();
  });
  it("requires consent for PHI even on approved provider", async () => {
    const a = okAdapter({ approvedForPHI: true });
    const r = await executeAI(req({ hasPatientData: true }), deps([a]));
    expect(r.code).toBe("CONSENT_REQUIRED");
  });
  it("labels clinical output as draft requiring doctor review", async () => {
    const a = okAdapter({ approvedForPHI: true });
    const r = await executeAI(req({ hasPatientData: true, userConsented: true, clinical: true }), deps([a]));
    expect(r.status).toBe("SUCCEEDED");
    expect(r.draftNotice).toMatch(/draft/i);
    expect(r.requiresDoctorReview).toBe(true);
  });
  it("provider failure: no charge, FAILED, alternatives offered, never SUCCEEDED", async () => {
    const bad = okAdapter({ complete: vi.fn(async () => { throw new ProviderError("UNAVAILABLE", "503", true); }) });
    const d = deps([bad], { alternatives: async () => ["p2"] });
    const r = await executeAI(req(), d);
    expect(r.status).toBe("FAILED"); expect(r.code).toBe("UNAVAILABLE");
    expect(r.alternatives).toEqual(["p2"]);
    expect((d.ledger as InMemoryLedger).balanceUsed("u1")).toBe(0);
  });
  it("retry of same executionId never double-charges", async () => {
    const d = deps([okAdapter()]);
    await executeAI(req(), d); await executeAI(req(), d);
    expect((d.ledger as InMemoryLedger).balanceUsed("u1")).toBe(2);
  });
  it("dev-mode adapter output is labelled", async () => {
    const r = await executeAI(req(), deps([okAdapter({ devMode: true })]));
    expect(r.devMode).toBe(true);
  });
  it("unknown provider is a clean failure", async () => {
    const r = await executeAI(req({ providerId: "nope" }), deps([]));
    expect(r.status).toBe("FAILED");
  });
});

describe("idempotency isolation", () => {
  it("another user reusing an executionId does not receive the first user's result", async () => {
    const d = deps([okAdapter()]);
    await executeAI(req(), d);
    const other = await executeAI(req({ actor: { userId: "u2", orgId: "o2", role: "DOCTOR" } }), d);
    expect(other.status).toBe("SUCCEEDED");
    expect((d.ledger as InMemoryLedger).balanceUsed("u2")).toBe(0 + 2);
  });
});
