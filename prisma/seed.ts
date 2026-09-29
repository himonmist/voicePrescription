import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { CATALOG_SEED } from "../src/lib/ai/catalog/seed";

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
  const providers: Record<string, string> = { anthropic: "Anthropic", openai: "OpenAI", google: "Google AI" };
  for (const [key, name] of Object.entries(providers)) await prisma.aIProvider.upsert({ where: { key }, create: { key, name }, update: {} });
  // Placeholder quotas – proposed tiers, not prices. Configure real values in admin.
  for (const p of [["FREE", 20, 100, 200], ["PRO", 300, 1500, 3000], ["PREMIUM", 1500, 8000, 15000]] as const)
    await prisma.plan.upsert({ where: { code: p[0] }, create: { code: p[0], monthlyExecutions: p[1], monthlyCredits: p[2], spendLimitCents: p[3], features: {} }, update: {} });
  for (const t of CATALOG_SEED) {
    const provider = t.providerKey ? await prisma.aIProvider.findUnique({ where: { key: t.providerKey } }) : null;
    const tool = await prisma.aITool.upsert({
      where: { slug: t.slug },
      create: { slug: t.slug, name: t.name, category: t.category, tags: t.tags, description: t.description, websiteUrl: t.websiteUrl, apiDocsUrl: t.apiDocsUrl, status: t.status,
        inputTypes: t.inputTypes, outputTypes: t.outputTypes, languages: t.languages, eligiblePlans: t.eligiblePlans, fileUpload: t.fileUpload, streaming: t.streaming, providerId: provider?.id },
      update: {}, // never overwrite admin edits
    });
    for (const capability of t.capabilities)
      await prisma.aIToolCapability.upsert({ where: { toolId_capability: { toolId: tool.id, capability } }, create: { toolId: tool.id, capability }, update: {} });
  }
  console.log("seeded");
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
