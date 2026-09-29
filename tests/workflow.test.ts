import { describe, it, expect, vi } from "vitest";
import { planWorkflow, runWorkflow, type WorkflowDef } from "@/lib/ai/workflow/engine";

const def: WorkflowDef = {
  name: "Research → Presentation", clinical: false,
  steps: [
    { key: "research", estCredits: 3, input: { q: "$input.topic" } },
    { key: "summary", dependsOn: ["research"], estCredits: 2, input: { text: "$research" } },
    { key: "outline", dependsOn: ["summary"], estCredits: 1, requiresApproval: true, input: { text: "$summary" } },
    { key: "deck", dependsOn: ["outline"], estCredits: 4, input: { text: "$outline" }, condition: { var: "input.makeDeck", equals: true } },
  ],
};

describe("planWorkflow", () => {
  it("orders steps by dependency and totals cost", () => {
    const p = planWorkflow(def, { topic: "t", makeDeck: true });
    expect(p.order).toEqual(["research", "summary", "outline", "deck"]);
    expect(p.totalCredits).toBe(10);
    expect(p.requiresCostConfirmation).toBe(true);
  });
  it("skips conditional branch and its cost", () => {
    const p = planWorkflow(def, { topic: "t", makeDeck: false });
    expect(p.order).not.toContain("deck");
    expect(p.totalCredits).toBe(6);
  });
  it("rejects cycles and unknown deps", () => {
    expect(() => planWorkflow({ ...def, steps: [{ key: "a", dependsOn: ["b"], estCredits: 0 }, { key: "b", dependsOn: ["a"], estCredits: 0 }] }, {})).toThrow(/cycle/i);
    expect(() => planWorkflow({ ...def, steps: [{ key: "a", dependsOn: ["zz"], estCredits: 0 }] }, {})).toThrow(/unknown/i);
  });
});

describe("runWorkflow", () => {
  const runner = () => vi.fn(async (_k: string, input: Record<string, unknown>) => `out(${JSON.stringify(input)})`);
  it("pauses at approval checkpoint and resumes after approval", async () => {
    const run = runner();
    const s1 = await runWorkflow(def, { topic: "t", makeDeck: true }, { run, costConfirmed: true });
    expect(s1.status).toBe("AWAITING_APPROVAL");
    expect(s1.pendingApproval).toBe("outline");
    expect(run).not.toHaveBeenCalledWith("outline", expect.anything());
    const s2 = await runWorkflow(def, { topic: "t", makeDeck: true }, { run, costConfirmed: true, resume: s1, approve: ["outline"] });
    expect(s2.status).toBe("COMPLETED");
    expect(Object.keys(s2.outputs)).toEqual(["research", "summary", "outline", "deck"]);
    expect(run).toHaveBeenCalledTimes(4); // no re-run of completed steps
  });
  it("maps outputs between steps", async () => {
    const run = runner();
    await runWorkflow(def, { topic: "T" }, { run, costConfirmed: true });
    expect(run).toHaveBeenNthCalledWith(2, "summary", { text: 'out({"q":"T"})' });
  });
  it("refuses to start expensive workflow without cost confirmation", async () => {
    const run = runner();
    const s = await runWorkflow(def, { topic: "t" }, { run, costConfirmed: false });
    expect(s.status).toBe("NEEDS_COST_CONFIRMATION");
    expect(run).not.toHaveBeenCalled();
  });
  it("retries transient failures then fails without running dependents", async () => {
    const run = vi.fn(async () => { throw new Error("boom"); });
    const s = await runWorkflow(def, { topic: "t" }, { run, costConfirmed: true, maxRetries: 2 });
    expect(s.status).toBe("FAILED");
    expect(run).toHaveBeenCalledTimes(3);
    expect(s.failedStep).toBe("research");
  });
  it("cancels between steps", async () => {
    const ctrl = new AbortController();
    const run = vi.fn(async () => { ctrl.abort(); return "x"; });
    const s = await runWorkflow(def, { topic: "t" }, { run, costConfirmed: true, signal: ctrl.signal });
    expect(s.status).toBe("CANCELLED");
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("clinical workflows always require human review before completion", async () => {
    const clinical = { ...def, clinical: true, steps: [{ key: "note", estCredits: 1, input: {} }] };
    const s = await runWorkflow(clinical, {}, { run: runner(), costConfirmed: true });
    expect(s.status).toBe("AWAITING_HUMAN_REVIEW");
    const done = await runWorkflow(clinical, {}, { run: runner(), costConfirmed: true, resume: s, humanReviewed: true });
    expect(done.status).toBe("COMPLETED");
  });
});
