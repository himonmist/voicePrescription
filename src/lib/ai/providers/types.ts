export type ProviderErrorCode =
  | "UNAVAILABLE" | "RATE_LIMITED" | "TIMEOUT" | "AUTH" | "BAD_REQUEST" | "NOT_CONFIGURED" | "UNKNOWN";

export class ProviderError extends Error {
  constructor(public code: ProviderErrorCode, message: string, public retryable = false) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface CompletionRequest {
  model: string;
  system?: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxOutputTokens?: number;
  signal?: AbortSignal;
}
export interface Usage { inputTokens: number; outputTokens: number; providerCostUsd?: number }
export interface CompletionResult { text: string; usage: Usage; model: string; providerRequestId?: string }

export interface ProviderAdapter {
  id: string;
  /** True only for the local development stub – outputs must be labelled. */
  devMode: boolean;
  /** Provider contractually/admin approved to receive patient data. */
  approvedForPHI: boolean;
  /** Data leaves the SmartDoctorAid boundary. */
  external: boolean;
  complete(req: CompletionRequest): Promise<CompletionResult>;
  health(): Promise<{ healthy: boolean; detail?: string }>;
}

/** Credentials are resolved server-side from env/secret manager by reference name – never stored in DB rows. */
export function resolveSecret(ref: string, env: Record<string, string | undefined> = process.env): string {
  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(ref)) throw new ProviderError("NOT_CONFIGURED", "Invalid secret reference");
  const v = env[ref];
  if (!v) throw new ProviderError("NOT_CONFIGURED", `Secret ${ref} is not configured`);
  return v;
}
