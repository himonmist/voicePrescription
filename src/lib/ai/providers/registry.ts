import type { ProviderAdapter } from "./types";
import { anthropicAdapter } from "./anthropic";
import { openaiAdapter } from "./openai";
import { googleAdapter } from "./google";
import { devAdapter } from "./dev";

export function buildRegistry(env: Record<string, string | undefined> = process.env): Map<string, ProviderAdapter> {
  const phi = (n: string) => env[`${n}_APPROVED_FOR_PHI`] === "true"; // set only after a signed DPA/BAA
  const m = new Map<string, ProviderAdapter>();
  for (const a of [anthropicAdapter("ANTHROPIC_API_KEY", { approvedForPHI: phi("ANTHROPIC") }),
                   openaiAdapter("OPENAI_API_KEY", { approvedForPHI: phi("OPENAI") }),
                   googleAdapter("GOOGLE_AI_API_KEY", { approvedForPHI: phi("GOOGLE") })]) m.set(a.id, a);
  if (env.AI_DEV_MODE === "true" && env.NODE_ENV !== "production") m.set(devAdapter.id, devAdapter);
  return m;
}
