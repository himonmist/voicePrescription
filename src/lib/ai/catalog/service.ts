import { CATALOG_SEED, type CatalogEntry } from "./seed";
import { dbConfigured, db } from "@/lib/db";

/** Reads admin-managed catalog from Neon; falls back to the conservative seed (labelled) when no DB is configured. */
export async function listCatalog(): Promise<{ source: "database" | "seed"; tools: CatalogEntry[] }> {
  if (!dbConfigured()) return { source: "seed", tools: CATALOG_SEED };
  const rows = await db().aITool.findMany({ include: { capabilities: true, provider: true }, orderBy: { name: "asc" } });
  if (rows.length === 0) return { source: "seed", tools: CATALOG_SEED };
  return {
    source: "database",
    tools: rows.map((r) => ({
      slug: r.slug, name: r.name, provider: r.provider?.name ?? "", category: r.category, tags: r.tags, description: r.description,
      status: r.status, providerKey: r.provider?.key, websiteUrl: r.websiteUrl, apiDocsUrl: r.apiDocsUrl ?? undefined,
      capabilities: r.capabilities.map((c) => c.capability), inputTypes: r.inputTypes, outputTypes: r.outputTypes, languages: r.languages,
      eligiblePlans: r.eligiblePlans, fileUpload: r.fileUpload, streaming: r.streaming, lastVerifiedAt: r.lastVerifiedAt?.toISOString() ?? null,
    })),
  };
}
