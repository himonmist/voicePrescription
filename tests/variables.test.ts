import { describe, it, expect } from "vitest";
import { validateVariables, renderPrompt, type PromptVariableDef } from "@/lib/ai/prompts/variables";

const defs: PromptVariableDef[] = [
  { key: "transcript", type: "long_text", required: true, maxLength: 50 },
  { key: "format", type: "dropdown", required: true, options: ["SOAP", "Narrative"] },
  { key: "langs", type: "multi_select", required: false, options: ["en", "bn"] },
  { key: "age", type: "number", required: false, min: 0, max: 130 },
  { key: "visit", type: "date", required: false },
];

describe("validateVariables", () => {
  it("rejects missing required variables", () => {
    const r = validateVariables(defs, { format: "SOAP" });
    expect(r.ok).toBe(false);
    expect(r.errors.transcript).toMatch(/required/i);
  });
  it("rejects dropdown values outside options", () => {
    const r = validateVariables(defs, { transcript: "x", format: "Evil" });
    expect(r.errors.format).toBeDefined();
  });
  it("rejects multi_select with invalid member", () => {
    const r = validateVariables(defs, { transcript: "x", format: "SOAP", langs: ["en", "xx"] });
    expect(r.errors.langs).toBeDefined();
  });
  it("enforces number range and max length", () => {
    expect(validateVariables(defs, { transcript: "x", format: "SOAP", age: 200 }).errors.age).toBeDefined();
    expect(validateVariables(defs, { transcript: "x".repeat(51), format: "SOAP" }).errors.transcript).toBeDefined();
  });
  it("rejects invalid dates and unknown keys", () => {
    expect(validateVariables(defs, { transcript: "x", format: "SOAP", visit: "2026-13-45" }).errors.visit).toBeDefined();
    expect(validateVariables(defs, { transcript: "x", format: "SOAP", rogue: "1" }).errors.rogue).toBeDefined();
  });
  it("accepts valid input", () => {
    const r = validateVariables(defs, { transcript: "hi", format: "SOAP", langs: ["bn"], age: 30, visit: "2026-01-31" });
    expect(r.ok).toBe(true);
  });
});

describe("renderPrompt", () => {
  it("substitutes variables", () => {
    expect(renderPrompt("Note in {{format}}: {{transcript}}", { format: "SOAP", transcript: "abc" })).toBe("Note in SOAP: abc");
  });
  it("does not re-expand placeholders inside values (template injection)", () => {
    const out = renderPrompt("A={{a}} B={{b}}", { a: "{{b}}", b: "secret" });
    expect(out).toBe("A={{b}} B=secret");
  });
  it("throws on placeholder without a value", () => {
    expect(() => renderPrompt("{{missing}}", {})).toThrow(/missing/);
  });
  it("joins multi-select arrays", () => {
    expect(renderPrompt("{{l}}", { l: ["en", "bn"] })).toBe("en, bn");
  });
});
