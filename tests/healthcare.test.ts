import { describe, it, expect } from "vitest";
import { markDraft, canFinalizeClinicalDocument, canImportToEncounter } from "@/lib/ai/healthcare";

const doc = { id: "d1", aiGenerated: true, status: "DRAFT" as const };
describe("healthcare guards", () => {
  it("prefixes AI clinical content with a draft banner", () => {
    expect(markDraft("Plan: rest")).toMatch(/^AI-GENERATED DRAFT/);
  });
  it("blocks finalisation without doctor approval", () => {
    expect(canFinalizeClinicalDocument(doc, { userId: "u", orgId: "o", role: "USER" }, true).allowed).toBe(false);
    expect(canFinalizeClinicalDocument(doc, { userId: "u", orgId: "o", role: "STUDENT" }, true).allowed).toBe(false);
  });
  it("blocks doctor finalising without explicit review confirmation", () => {
    expect(canFinalizeClinicalDocument(doc, { userId: "u", orgId: "o", role: "DOCTOR" }, false).allowed).toBe(false);
  });
  it("allows doctor with explicit review", () => {
    expect(canFinalizeClinicalDocument(doc, { userId: "u", orgId: "o", role: "DOCTOR" }, true).allowed).toBe(true);
  });
  it("import into encounter needs explicit authorisation and doctor", () => {
    const d = { userId: "u", orgId: "o", role: "DOCTOR" as const };
    expect(canImportToEncounter(d, false).allowed).toBe(false);
    expect(canImportToEncounter({ ...d, role: "USER" }, true).allowed).toBe(false);
    expect(canImportToEncounter(d, true).allowed).toBe(true);
  });
});
