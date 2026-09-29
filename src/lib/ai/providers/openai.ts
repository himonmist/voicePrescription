import { resolveSecret, type ProviderAdapter } from "./types";
import { postJson } from "./http";

export function openaiAdapter(secretRef = "OPENAI_API_KEY", opts: { approvedForPHI?: boolean } = {}): ProviderAdapter {
  return {
    id: "openai", devMode: false, approvedForPHI: opts.approvedForPHI ?? false, external: true,
    async complete(req) {
      const key = resolveSecret(secretRef);
      const messages = [...(req.system ? [{ role: "system", content: req.system }] : []), ...req.messages];
      const j = await postJson("https://api.openai.com/v1/chat/completions",
        { authorization: `Bearer ${key}` },
        { model: req.model, messages, max_completion_tokens: req.maxOutputTokens ?? 2048 }, req.signal);
      return {
        text: j.choices?.[0]?.message?.content ?? "",
        usage: { inputTokens: j.usage?.prompt_tokens ?? 0, outputTokens: j.usage?.completion_tokens ?? 0 },
        model: j.model ?? req.model, providerRequestId: j.id,
      };
    },
    async health() {
      try { resolveSecret(secretRef); return { healthy: true, detail: "configured (not live-probed)" }; }
      catch { return { healthy: false, detail: "not configured" }; }
    },
  };
}
