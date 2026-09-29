import { describe, it, expect } from "vitest";
import { CATALOG_SEED, validateCatalogEntry } from "@/lib/ai/catalog/seed";

describe("catalog seed", () => {
  it("every entry passes validation", () => {
    for (const t of CATALOG_SEED) expect(validateCatalogEntry(t), t.slug).toEqual([]);
  });
  it("slugs are unique", () => {
    expect(new Set(CATALOG_SEED.map((t) => t.slug)).size).toBe(CATALOG_SEED.length);
  });
  it("no tool is seeded as IN_APP: in-app requires admin configuration + verification", () => {
    expect(CATALOG_SEED.filter((t) => t.status === "IN_APP")).toEqual([]);
  });
  it("tools without a documented API are EXTERNAL", () => {
    for (const s of ["notebooklm", "gamma", "canva", "glass-health"]) {
      expect(CATALOG_SEED.find((t) => t.slug === s)?.status, s).toBe("EXTERNAL");
    }
  });
  it("covers required catalog names", () => {
    const names = CATALOG_SEED.map((t) => t.name);
    for (const n of ["ChatGPT", "Claude", "Google Gemini", "Microsoft Copilot", "Perplexity", "NotebookLM", "Elicit", "Consensus", "Gamma", "Canva", "Glass Health"])
      expect(names).toContain(n);
  });
  it("rejects invalid entries", () => {
    expect(validateCatalogEntry({ ...CATALOG_SEED[0]!, websiteUrl: "javascript:alert(1)" }).length).toBeGreaterThan(0);
    expect(validateCatalogEntry({ ...CATALOG_SEED[0]!, status: "IN_APP", providerKey: undefined }).length).toBeGreaterThan(0);
  });
});
