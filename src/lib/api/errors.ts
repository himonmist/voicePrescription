/** Operator-facing configuration problem with an authored, non-sensitive message. Safe to show to the client. */
export class ConfigError extends Error {
  constructor(message: string) { super(message); this.name = "ConfigError"; }
}
