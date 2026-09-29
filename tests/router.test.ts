import { describe, it, expect } from "vitest";
import { classifyTask, routeTask, type Candidate } from "@/lib/ai/router/router";

const mk = (o: Partial<Candidate> & { id: string }): Candidate => ({
  name: o.id, status: "IN_APP", capabilities: ["writing"], inputTypes: ["text"], outputTypes: ["text"],
  contextTokens: 100_000, webSearch: false, structuredOutput: true, healthy: true,
  estCostPer1kTokens: 0.01, latencyMs: 1500, approvedForPHI: false, eligiblePlans: ["FREE","PRO"], ...o,
});

describe("classifyTask", () => {
  it("detects research + presentation deliverable", () => {
    const t = classifyTask("Summarize these research papers, compare the evidence, and prepare a presentation.");
    expect(t.taskTypes).toEqual(expect.arrayContaining(["research", "presentation"]));
    expect(t.requiredCapabilities).toEqual(expect.arrayContaining(["document_analysis", "presentation"]));
  });
  it("detects web search need and coding", () => {
    expect(classifyTask("latest 2026 guidelines for hypertension").needsWebSearch).toBe(true);
    expect(classifyTask("review this python code").taskTypes).toContain("coding");
  });
  it("detects patient-data hint", () => {
    expect(classifyTask("summarize this patient's discharge report").hasPatientData).toBe(true);
  });
});

describe("routeTask", () => {
  const base = { requiredCapabilities: ["writing"], needsWebSearch: false, hasPatientData: false, plan: "FREE", estTokens: 2000 };
  it("excludes incompatible, unhealthy, external-only, plan-ineligible", () => {
    const r = routeTask(base, [
      mk({ id: "nocap", capabilities: ["coding"] }),
      mk({ id: "down", healthy: false }),
      mk({ id: "ext", status: "EXTERNAL" }),
      mk({ id: "pro", eligiblePlans: ["PRO"] }),
      mk({ id: "ok" }),
    ]);
    expect(r.selected?.id).toBe("ok");
    const reasons = Object.fromEntries(r.rejected.map((x) => [x.id, x.reason]));
    expect(reasons.nocap).toMatch(/capabilit/i);
    expect(reasons.down).toMatch(/unavailable|health/i);
    expect(reasons.ext).toMatch(/external/i);
    expect(reasons.pro).toMatch(/plan/i);
  });
  it("never routes patient data to non-PHI-approved providers", () => {
    const r = routeTask({ ...base, hasPatientData: true }, [mk({ id: "a" }), mk({ id: "b", approvedForPHI: true })]);
    expect(r.selected?.id).toBe("b");
    const none = routeTask({ ...base, hasPatientData: true }, [mk({ id: "a" })]);
    expect(none.selected).toBeNull();
    expect(none.explanation).toMatch(/patient/i);
  });
  it("requires web search when needed", () => {
    const r = routeTask({ ...base, needsWebSearch: true }, [mk({ id: "a" }), mk({ id: "b", webSearch: true })]);
    expect(r.selected?.id).toBe("b");
  });
  it("respects user preference among equally suitable tools", () => {
    const r = routeTask({ ...base, preferredToolId: "b" }, [mk({ id: "a" }), mk({ id: "b" })]);
    expect(r.selected?.id).toBe("b");
  });
  it("returns shortlist when top scores are tied and no preference", () => {
    const r = routeTask(base, [mk({ id: "a" }), mk({ id: "b" })]);
    expect(r.ambiguous).toBe(true);
    expect(r.shortlist.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });
  it("prefers cheaper when otherwise equal", () => {
    const r = routeTask(base, [mk({ id: "a", estCostPer1kTokens: 0.05 }), mk({ id: "b", estCostPer1kTokens: 0.001 })]);
    expect(r.selected?.id).toBe("b");
  });
  it("explains and offers external alternative when nothing is executable", () => {
    const r = routeTask(base, [mk({ id: "ext", status: "EXTERNAL" })]);
    expect(r.selected).toBeNull();
    expect(r.externalAlternatives.map((c) => c.id)).toEqual(["ext"]);
  });
  it("is deterministic", () => {
    const c = [mk({ id: "a" }), mk({ id: "b", estCostPer1kTokens: 0.02 })];
    expect(routeTask(base, c)).toEqual(routeTask(base, c));
  });
});

describe("external alternatives for multi-part tasks", () => {
  it("suggests externals covering part of the task, best overlap first", () => {
    const need = { requiredCapabilities: ["document_analysis", "research", "presentation"], needsWebSearch: false, hasPatientData: false, plan: "FREE", estTokens: 100 };
    const r = routeTask(need, [
      mk({ id: "gamma", status: "EXTERNAL", capabilities: ["presentation"] }),
      mk({ id: "nlm", status: "EXTERNAL", capabilities: ["document_analysis", "research"] }),
      mk({ id: "irrelevant", status: "EXTERNAL", capabilities: ["coding"] }),
    ]);
    expect(r.externalAlternatives.map((c) => c.id)).toEqual(["nlm", "gamma"]);
  });
});
