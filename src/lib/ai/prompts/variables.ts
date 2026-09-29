export type VariableType =
  | "short_text" | "long_text" | "dropdown" | "multi_select"
  | "date" | "number" | "structured" | "file";

export interface PromptVariableDef {
  key: string;
  type: VariableType;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
  maxLength?: number;
}

export type VariableValue = string | number | string[] | Record<string, unknown>;
export interface ValidationResult { ok: boolean; errors: Record<string, string> }

const DEFAULT_MAX_TEXT = 100_000;

function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

export function validateVariables(
  defs: PromptVariableDef[],
  input: Record<string, unknown>,
): ValidationResult {
  const errors: Record<string, string> = {};
  const known = new Set(defs.map((d) => d.key));
  for (const k of Object.keys(input)) if (!known.has(k)) errors[k] = "Unknown variable";

  for (const d of defs) {
    const v = input[d.key];
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) {
      if (d.required) errors[d.key] = "This field is required";
      continue;
    }
    switch (d.type) {
      case "short_text":
      case "long_text": {
        if (typeof v !== "string") { errors[d.key] = "Must be text"; break; }
        const max = d.maxLength ?? (d.type === "short_text" ? 500 : DEFAULT_MAX_TEXT);
        if (v.length > max) errors[d.key] = `Must be at most ${max} characters`;
        break;
      }
      case "dropdown":
        if (typeof v !== "string" || !d.options?.includes(v)) errors[d.key] = "Invalid option";
        break;
      case "multi_select":
        if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !d.options?.includes(x)))
          errors[d.key] = "Invalid option in selection";
        break;
      case "number": {
        const n = typeof v === "number" ? v : Number.NaN;
        if (!Number.isFinite(n)) errors[d.key] = "Must be a number";
        else if ((d.min !== undefined && n < d.min) || (d.max !== undefined && n > d.max))
          errors[d.key] = `Must be between ${d.min ?? "-∞"} and ${d.max ?? "∞"}`;
        break;
      }
      case "date":
        if (typeof v !== "string" || !isRealDate(v)) errors[d.key] = "Must be a valid date (YYYY-MM-DD)";
        break;
      case "structured":
        if (typeof v !== "object" || Array.isArray(v)) errors[d.key] = "Must be an object";
        break;
      case "file":
        if (typeof v !== "string") errors[d.key] = "Must reference an uploaded document id";
        break;
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/** Single-pass substitution: values are never re-scanned for placeholders. */
export function renderPrompt(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, key) || values[key] === undefined)
      throw new Error(`Missing value for placeholder: ${key}`);
    const v = values[key];
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "object" && v !== null) return JSON.stringify(v);
    return String(v);
  });
}
