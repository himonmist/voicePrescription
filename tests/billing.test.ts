import { describe, it, expect } from "vitest";
import { checkEntitlement, estimateCredits, InMemoryLedger } from "@/lib/ai/billing/quota";

const plan = { code: "FREE", monthlyExecutions: 3, monthlyCredits: 100, spendLimitCents: 500 };

describe("checkEntitlement", () => {
  it("allows under limits", () => {
    expect(checkEntitlement(plan, { executions: 1, credits: 10, spendCents: 0 }, 5).allowed).toBe(true);
  });
  it("blocks when execution quota reached", () => {
    const r = checkEntitlement(plan, { executions: 3, credits: 10, spendCents: 0 }, 1);
    expect(r.allowed).toBe(false); expect(r.code).toBe("QUOTA_EXCEEDED"); expect(r.upgrade).toBe(true);
  });
  it("blocks when credits would go over", () => {
    expect(checkEntitlement(plan, { executions: 0, credits: 98, spendCents: 0 }, 5).code).toBe("CREDITS_EXHAUSTED");
  });
  it("blocks on spend limit", () => {
    expect(checkEntitlement(plan, { executions: 0, credits: 0, spendCents: 500 }, 1).code).toBe("BUDGET_EXCEEDED");
  });
});

describe("estimateCredits", () => {
  it("applies margin and rounds up, labelled estimate", () => {
    const e = estimateCredits({ inputTokens: 1000, outputTokens: 1000, inPer1k: 0.003, outPer1k: 0.015, marginPct: 20, centsPerCredit: 1 });
    expect(e.providerCostUsd).toBeCloseTo(0.018);
    expect(e.credits).toBe(3); // 1.8 cents *1.2 = 2.16 -> 3
    expect(e.isEstimate).toBe(true);
  });
});

describe("InMemoryLedger idempotency", () => {
  it("charges once per idempotency key", async () => {
    const l = new InMemoryLedger();
    await l.charge("u1", "exec-1", 5);
    await l.charge("u1", "exec-1", 5);
    expect(l.balanceUsed("u1")).toBe(5);
  });
  it("refunds only charged, only once", async () => {
    const l = new InMemoryLedger();
    await l.refund("u1", "exec-2");
    expect(l.balanceUsed("u1")).toBe(0);
    await l.charge("u1", "exec-2", 4);
    await l.refund("u1", "exec-2");
    await l.refund("u1", "exec-2");
    expect(l.balanceUsed("u1")).toBe(0);
  });
});
