import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(d: string, out: string[] = []): string[] {
  for (const f of readdirSync(d)) {
    if (["node_modules", ".next", "generated", ".git"].includes(f)) continue;
    const p = join(d, f); statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
describe("repository hygiene", () => {
  const files = [...walk("src"), ...walk("prisma"), ".env.example"].filter((f) => !f.endsWith(".sql"));
  it("contains no hard-coded provider keys or DB URLs with passwords", () => {
    const bad = /(sk-[A-Za-z0-9_-]{20,}|sk-ant-[A-Za-z0-9_-]{10,}|AIza[0-9A-Za-z_-]{30,}|postgres(ql)?:\/\/[^:\s]+:[^@\s]{3,}@)/;
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(bad);
  });
  it("never exposes secrets via NEXT_PUBLIC_ variables", () => {
    for (const f of files) expect(readFileSync(f, "utf8"), f).not.toMatch(/NEXT_PUBLIC_[A-Z_]*(KEY|SECRET|TOKEN)/);
  });
  it("client components never import server-only modules", () => {
    for (const f of files.filter((x) => x.endsWith(".tsx"))) {
      const s = readFileSync(f, "utf8");
      if (s.includes('"use client"')) expect(s, f).not.toMatch(/lib\/(db|ai\/deps|ai\/providers)/);
    }
  });
});
