/** Model allowlists come from server config (later: AIProviderModel rows). Unset = deny. */
export function allowedModels(providerKey: string, env: Record<string, string | undefined> = process.env): string[] {
  const raw = env[`AI_MODELS_${providerKey.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`];
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
}
export const isModelAllowed = (p: string, m: string, env: Record<string, string | undefined> = process.env) => allowedModels(p, env).includes(m);

/** Credits are decided server-side (never client-supplied). Labelled an estimate; reconciled with provider usage after the call. */
export function estimateRequestCredits(prompt: string): number {
  return Math.max(1, Math.ceil(prompt.length / 4 / 1000));
}
