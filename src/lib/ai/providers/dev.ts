import type { ProviderAdapter } from "./types";

/** Deterministic local stub. Only registered when AI_DEV_MODE=true; output is explicitly labelled. */
export const devAdapter: ProviderAdapter = {
  id: "dev", devMode: true, approvedForPHI: false, external: false,
  async complete(req) {
    const last = req.messages[req.messages.length - 1]?.content ?? "";
    return {
      text: `[DEVELOPMENT MODE – not a real AI response]\nEcho: ${last.slice(0, 200)}`,
      usage: { inputTokens: Math.ceil(last.length / 4), outputTokens: 20 },
      model: "dev-echo",
    };
  },
  async health() { return { healthy: true, detail: "dev stub" }; },
};
