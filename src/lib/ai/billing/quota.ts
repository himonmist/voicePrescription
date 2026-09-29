export interface PlanLimits { code: string; monthlyExecutions: number; monthlyCredits: number; spendLimitCents: number }
export interface UsageTotals { executions: number; credits: number; spendCents: number }
export type EntitlementCode = "QUOTA_EXCEEDED" | "CREDITS_EXHAUSTED" | "BUDGET_EXCEEDED";
export interface Entitlement { allowed: boolean; code?: EntitlementCode; upgrade?: boolean }

export function checkEntitlement(plan: PlanLimits, used: UsageTotals, requestCredits: number): Entitlement {
  if (used.executions + 1 > plan.monthlyExecutions) return { allowed: false, code: "QUOTA_EXCEEDED", upgrade: true };
  if (used.credits + requestCredits > plan.monthlyCredits) return { allowed: false, code: "CREDITS_EXHAUSTED", upgrade: true };
  if (used.spendCents >= plan.spendLimitCents) return { allowed: false, code: "BUDGET_EXCEEDED", upgrade: true };
  return { allowed: true };
}

export function estimateCredits(p: { inputTokens: number; outputTokens: number; inPer1k: number; outPer1k: number; marginPct: number; centsPerCredit: number }) {
  const providerCostUsd = (p.inputTokens / 1000) * p.inPer1k + (p.outputTokens / 1000) * p.outPer1k;
  const chargedCents = providerCostUsd * 100 * (1 + p.marginPct / 100);
  return { providerCostUsd, credits: Math.ceil(chargedCents / p.centsPerCredit), isEstimate: true as const };
}

export interface Ledger {
  charge(userId: string, idempotencyKey: string, credits: number): Promise<void>;
  refund(userId: string, idempotencyKey: string): Promise<void>;
}

/** Test/dev ledger. Production ledger is backed by AICreditTransaction with UNIQUE(idempotencyKey, kind). */
export class InMemoryLedger implements Ledger {
  private charges = new Map<string, { userId: string; credits: number; refunded: boolean }>();
  private k(userId: string, key: string) { return `${userId}:${key}`; }
  async charge(userId: string, key: string, credits: number) {
    const id = this.k(userId, key);
    if (!this.charges.has(id)) this.charges.set(id, { userId, credits, refunded: false });
  }
  async refund(userId: string, key: string) {
    const c = this.charges.get(this.k(userId, key));
    if (c) c.refunded = true;
  }
  balanceUsed(userId: string) {
    let n = 0;
    for (const c of this.charges.values()) if (c.userId === userId && !c.refunded) n += c.credits;
    return n;
  }
}
