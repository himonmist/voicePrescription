import { resolveSecret, type ProviderAdapter } from "./types";
import { postJson } from "./http";

export function googleAdapter(secretRef = "GOOGLE_AI_API_KEY", opts: { approvedForPHI?: boolean } = {}): ProviderAdapter {
  return {
    id: "google", devMode: false, approvedForPHI: opts.approvedForPHI ?? false, external: true,
    async complete(req) {
      const key = resolveSecret(secretRef);
      const j = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent`,
        { "x-goog-api-key": key },
        {
          systemInstruction: req.system ? { parts: [{ text: req.system }] } : undefined,
          contents: req.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: req.maxOutputTokens ?? 2048 },
        }, req.signal);
      return {
        text: (j.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join(""),
        usage: { inputTokens: j.usageMetadata?.promptTokenCount ?? 0, outputTokens: j.usageMetadata?.candidatesTokenCount ?? 0 },
        model: req.model,
      };
    },
    async health() {
      try { resolveSecret(secretRef); return { healthy: true, detail: "configured (not live-probed)" }; }
      catch { return { healthy: false, detail: "not configured" }; }
    },
  };
}
