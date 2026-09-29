import { resolveSecret, type ProviderAdapter } from "./types";
import { postJson } from "./http";

export function anthropicAdapter(secretRef = "ANTHROPIC_API_KEY", opts: { approvedForPHI?: boolean } = {}): ProviderAdapter {
  return {
    id: "anthropic", devMode: false, approvedForPHI: opts.approvedForPHI ?? false, external: true,
    async complete(req) {
      const key = resolveSecret(secretRef);
      const j = await postJson("https://api.anthropic.com/v1/messages",
        { "x-api-key": key, "anthropic-version": "2023-06-01" },
        { model: req.model, system: req.system, max_tokens: req.maxOutputTokens ?? 2048, messages: req.messages }, req.signal);
      return {
        text: (j.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join(""),
        usage: { inputTokens: j.usage?.input_tokens ?? 0, outputTokens: j.usage?.output_tokens ?? 0 },
        model: j.model ?? req.model, providerRequestId: j.id,
      };
    },
    async health() {
      try { resolveSecret(secretRef); return { healthy: true, detail: "configured (not live-probed)" }; }
      catch { return { healthy: false, detail: "not configured" }; }
    },
  };
}
