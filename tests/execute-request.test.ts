import { describe, it, expect } from "vitest";
import { allowedModels, isModelAllowed, estimateRequestCredits } from "@/lib/ai/providers/models";

describe("model allowlist", () => {
  it("is empty (deny) when not configured", () => {
    expect(allowedModels("anthropic", {})).toEqual([]);
    expect(isModelAllowed("anthropic", "anything", {})).toBe(false);
  });
  it("only allows configured models", () => {
    const env = { AI_MODELS_ANTHROPIC: "claude-a, claude-b" };
    expect(isModelAllowed("anthropic", "claude-b", env)).toBe(true);
    expect(isModelAllowed("anthropic", "claude-c", env)).toBe(false);
  });
});
describe("estimateRequestCredits", () => {
  it("server-side, at least 1, grows with prompt size", () => {
    expect(estimateRequestCredits("hi")).toBe(1);
    expect(estimateRequestCredits("x".repeat(40_000))).toBeGreaterThan(estimateRequestCredits("x".repeat(4_000)));
  });
});
