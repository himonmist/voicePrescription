import type { IntegrationStatusKey } from "./types";

export interface CatalogEntry {
  slug: string; name: string; provider: string; category: string; tags: string[]; description: string;
  status: IntegrationStatusKey; providerKey?: string; websiteUrl: string; apiDocsUrl?: string;
  capabilities: string[]; inputTypes: string[]; outputTypes: string[]; languages: string[]; eligiblePlans: string[];
  fileUpload: boolean; streaming: boolean; lastVerifiedAt: string | null;
}

const ALL_PLANS = ["FREE", "PRO", "PREMIUM", "CLINIC", "ENTERPRISE"];

/** Seeded conservatively: nothing is IN_APP until an admin configures credentials and verifies the integration.
 *  EXTERNAL = no documented public execution API was relied on; launch-only. lastVerifiedAt=null = not yet verified. */

export const CATALOG_SEED: CatalogEntry[] = [
  { slug: "chatgpt", name: "ChatGPT", provider: "OpenAI", category: "general", tags: ["general"], description: "ChatGPT by OpenAI. Integration status is set by an administrator.", status: "API_KEY_REQUIRED", providerKey: "openai", websiteUrl: "https://chatgpt.com", apiDocsUrl: "https://platform.openai.com/docs", capabilities: ["writing", "coding", "document_analysis", "data_analysis"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: true, streaming: true, lastVerifiedAt: null },
  { slug: "claude", name: "Claude", provider: "Anthropic", category: "general", tags: ["general"], description: "Claude by Anthropic. Integration status is set by an administrator.", status: "API_KEY_REQUIRED", providerKey: "anthropic", websiteUrl: "https://claude.ai", apiDocsUrl: "https://docs.anthropic.com", capabilities: ["writing", "coding", "document_analysis", "research"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: true, streaming: true, lastVerifiedAt: null },
  { slug: "gemini", name: "Google Gemini", provider: "Google", category: "general", tags: ["general"], description: "Google Gemini by Google. Integration status is set by an administrator.", status: "API_KEY_REQUIRED", providerKey: "google", websiteUrl: "https://gemini.google.com", apiDocsUrl: "https://ai.google.dev/gemini-api/docs", capabilities: ["writing", "coding", "document_analysis", "image_generation"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: true, streaming: true, lastVerifiedAt: null },
  { slug: "copilot", name: "Microsoft Copilot", provider: "Microsoft", category: "general", tags: ["general"], description: "Microsoft Copilot by Microsoft. Integration status is set by an administrator.", status: "EXTERNAL", websiteUrl: "https://copilot.microsoft.com", apiDocsUrl: "https://learn.microsoft.com/copilot", capabilities: ["writing", "coding"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: false, streaming: false, lastVerifiedAt: null },
  { slug: "perplexity", name: "Perplexity", provider: "Perplexity", category: "general", tags: ["general"], description: "Perplexity by Perplexity. Integration status is set by an administrator.", status: "EXTERNAL", websiteUrl: "https://www.perplexity.ai", apiDocsUrl: "https://docs.perplexity.ai", capabilities: ["research", "web_search"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: false, streaming: false, lastVerifiedAt: null },
  { slug: "notebooklm", name: "NotebookLM", provider: "Google", category: "research", tags: ["research"], description: "NotebookLM by Google. Integration status is set by an administrator.", status: "EXTERNAL", websiteUrl: "https://notebooklm.google.com", capabilities: ["document_analysis", "research"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: false, streaming: false, lastVerifiedAt: null },
  { slug: "elicit", name: "Elicit", provider: "Elicit", category: "research", tags: ["research"], description: "Elicit by Elicit. Integration status is set by an administrator.", status: "EXTERNAL", websiteUrl: "https://elicit.com", capabilities: ["research", "literature_search"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: false, streaming: false, lastVerifiedAt: null },
  { slug: "consensus", name: "Consensus", provider: "Consensus", category: "research", tags: ["research"], description: "Consensus by Consensus. Integration status is set by an administrator.", status: "EXTERNAL", websiteUrl: "https://consensus.app", capabilities: ["research", "literature_search"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: false, streaming: false, lastVerifiedAt: null },
  { slug: "gamma", name: "Gamma", provider: "Gamma", category: "presentation", tags: ["presentation"], description: "Gamma by Gamma. Integration status is set by an administrator.", status: "EXTERNAL", websiteUrl: "https://gamma.app", capabilities: ["presentation"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: false, streaming: false, lastVerifiedAt: null },
  { slug: "canva", name: "Canva", provider: "Canva", category: "presentation", tags: ["presentation"], description: "Canva by Canva. Integration status is set by an administrator.", status: "EXTERNAL", websiteUrl: "https://www.canva.com", capabilities: ["presentation", "image_generation"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: false, streaming: false, lastVerifiedAt: null },
  { slug: "glass-health", name: "Glass Health", provider: "Glass Health", category: "healthcare", tags: ["healthcare"], description: "Glass Health by Glass Health. Integration status is set by an administrator.", status: "EXTERNAL", websiteUrl: "https://glass.health", capabilities: ["clinical", "research"], inputTypes: ["text"], outputTypes: ["text"], languages: ["en", "bn"], eligiblePlans: ALL_PLANS, fileUpload: false, streaming: false, lastVerifiedAt: null },
];

const SAFE_URL = /^https:\/\/[^\s]+$/;
export function validateCatalogEntry(e: CatalogEntry): string[] {
  const errs: string[] = [];
  if (!/^[a-z0-9-]+$/.test(e.slug)) errs.push("invalid slug");
  if (!e.name.trim()) errs.push("name required");
  if (!SAFE_URL.test(e.websiteUrl)) errs.push("websiteUrl must be https");
  if (e.apiDocsUrl && !SAFE_URL.test(e.apiDocsUrl)) errs.push("apiDocsUrl must be https");
  if (e.status === "IN_APP" && !e.providerKey) errs.push("IN_APP requires a providerKey adapter");
  if (e.status === "IN_APP" && !e.lastVerifiedAt) errs.push("IN_APP requires a verification date");
  if (e.capabilities.length === 0) errs.push("capabilities required");
  return errs;
}
