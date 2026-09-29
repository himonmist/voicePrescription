import { db } from "@/lib/db";
import type { ExecDeps, ExecResult } from "./execute";
import type { Ledger, PlanLimits } from "./billing/quota";
import { buildRegistry } from "./providers/registry";

export const FREE_PLAN: PlanLimits = { code: "FREE", monthlyExecutions: 20, monthlyCredits: 100, spendLimitCents: 200 };
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); };

/** Credit ledger backed by AICreditTransaction; UNIQUE(userId, idempotencyKey, kind) makes retries safe. */
export const prismaLedger: Ledger = {
  async charge(userId, key, credits) {
    await db().aICreditTransaction.upsert({
      where: { userId_idempotencyKey_kind: { userId, idempotencyKey: key, kind: "CHARGE" } },
      create: { userId, idempotencyKey: key, kind: "CHARGE", credits }, update: {},
    });
  },
  async refund(userId, key) {
    const charged = await db().aICreditTransaction.findUnique({ where: { userId_idempotencyKey_kind: { userId, idempotencyKey: key, kind: "CHARGE" } } });
    if (!charged) return;
    await db().aICreditTransaction.upsert({
      where: { userId_idempotencyKey_kind: { userId, idempotencyKey: key, kind: "REFUND" } },
      create: { userId, idempotencyKey: key, kind: "REFUND", credits: charged.credits }, update: {},
    });
  },
};

const results = new Map<string, ExecResult>();
export function prismaDeps(): ExecDeps {
  const registry = buildRegistry();
  return {
    results, ledger: prismaLedger,
    getAdapter: (id) => registry.get(id),
    async getPlan(actor) {
      const sub = await db().subscription.findFirst({
        where: { status: "ACTIVE", OR: [{ userId: actor.userId }, ...(actor.orgId ? [{ orgId: actor.orgId }] : [])] },
        include: { plan: true }, orderBy: { createdAt: "desc" },
      });
      return sub ? { code: sub.plan.code, monthlyExecutions: sub.plan.monthlyExecutions, monthlyCredits: sub.plan.monthlyCredits, spendLimitCents: sub.plan.spendLimitCents } : FREE_PLAN;
    },
    async getUsage(actor) {
      const since = monthStart();
      const agg = await db().aIUsageRecord.aggregate({ where: { userId: actor.userId, createdAt: { gte: since }, status: "SUCCEEDED" },
        _count: true, _sum: { credits: true, estimatedCostUsd: true } });
      return { executions: agg._count, credits: agg._sum.credits ?? 0, spendCents: Math.round(Number(agg._sum.estimatedCostUsd ?? 0) * 100) };
    },
    async orgAllowsExternal(orgId) {
      if (!orgId) return true; // individual account: user-level consent applies
      return (await db().organization.findUnique({ where: { id: orgId }, select: { allowExternalAI: true } }))?.allowExternalAI ?? false;
    },
    async recordAudit(e) {
      await db().aIAuditEvent.create({ data: { type: e.type, actorId: e.actorId, orgId: e.orgId, executionId: e.executionId, detail: (e.detail ?? {}) as object } });
    },
    async recordUsage(u) {
      await db().aIUsageRecord.upsert({
        where: { executionId: u.executionId },
        create: { executionId: u.executionId, userId: u.userId, orgId: u.orgId, providerKey: u.providerId, model: u.model, status: u.status as "SUCCEEDED" | "FAILED",
          inputTokens: u.usage?.inputTokens, outputTokens: u.usage?.outputTokens, credits: u.credits, latencyMs: u.latencyMs, failureCode: u.failureCode },
        update: {},
      });
    },
    async alternatives(providerId) { return [...registry.keys()].filter((k) => k !== providerId && k !== "dev"); },
  };
}
