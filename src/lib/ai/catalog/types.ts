export type IntegrationStatusKey =
  | "IN_APP" | "OAUTH_REQUIRED" | "API_KEY_REQUIRED" | "EXTERNAL" | "BETA" | "UNAVAILABLE" | "DISABLED";

export const STATUS_LABEL: Record<IntegrationStatusKey, string> = {
  IN_APP: "Available for In-App Execution",
  OAUTH_REQUIRED: "OAuth Connection Required",
  API_KEY_REQUIRED: "API Key Configuration Required",
  EXTERNAL: "External Application",
  BETA: "Beta Integration",
  UNAVAILABLE: "Temporarily Unavailable",
  DISABLED: "Disabled by Administrator",
};
