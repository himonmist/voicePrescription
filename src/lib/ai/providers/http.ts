import { ProviderError } from "./types";

export async function postJson(url: string, headers: Record<string, string>, body: unknown, signal?: AbortSignal, timeoutMs = 60_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  signal?.addEventListener("abort", () => ctrl.abort());
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) {
      const code = res.status === 429 ? "RATE_LIMITED" : res.status === 401 || res.status === 403 ? "AUTH"
        : res.status >= 500 ? "UNAVAILABLE" : "BAD_REQUEST";
      // Never echo provider response body (may contain echoed prompt data).
      throw new ProviderError(code, `Provider HTTP ${res.status}`, code === "RATE_LIMITED" || code === "UNAVAILABLE");
    }
    return (await res.json()) as any;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if ((e as Error).name === "AbortError") throw new ProviderError("TIMEOUT", "Provider timed out", true);
    throw new ProviderError("UNAVAILABLE", "Provider unreachable", true);
  } finally { clearTimeout(t); }
}
