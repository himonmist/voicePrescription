export interface StepDef {
  key: string; dependsOn?: string[]; estCredits: number; requiresApproval?: boolean;
  /** Values: literal, "$input.x" (workflow input) or "$stepKey" (a previous step's output). */
  input?: Record<string, unknown>;
  condition?: { var: string; equals: unknown };
}
export interface WorkflowDef { name: string; clinical: boolean; steps: StepDef[] }
export interface Plan { order: string[]; totalCredits: number; requiresCostConfirmation: boolean }

export const COST_CONFIRMATION_THRESHOLD_CREDITS = 5;

function lookup(path: string, input: Record<string, unknown>): unknown {
  const parts = path.replace(/^input\./, "").split(".");
  return parts.reduce<any>((o, k) => (o == null ? undefined : o[k]), input);
}
const active = (s: StepDef, input: Record<string, unknown>) => !s.condition || lookup(s.condition.var, input) === s.condition.equals;

export function planWorkflow(def: WorkflowDef, input: Record<string, unknown>): Plan {
  const keys = new Set(def.steps.map((s) => s.key));
  for (const s of def.steps) for (const d of s.dependsOn ?? []) if (!keys.has(d)) throw new Error(`Unknown dependency "${d}" in step "${s.key}"`);
  const skipped = new Set(def.steps.filter((s) => !active(s, input)).map((s) => s.key));
  // a step depending on a skipped step is skipped too
  let changed = true;
  while (changed) { changed = false; for (const s of def.steps) if (!skipped.has(s.key) && (s.dependsOn ?? []).some((d) => skipped.has(d))) { skipped.add(s.key); changed = true; } }

  const order: string[] = []; const state = new Map<string, 1 | 2>();
  const byKey = new Map(def.steps.map((s) => [s.key, s]));
  const visit = (k: string) => {
    if (state.get(k) === 2) return;
    if (state.get(k) === 1) throw new Error(`Dependency cycle at "${k}"`);
    state.set(k, 1);
    for (const d of byKey.get(k)!.dependsOn ?? []) visit(d);
    state.set(k, 2);
    if (!skipped.has(k)) order.push(k);
  };
  def.steps.forEach((s) => visit(s.key));
  const totalCredits = order.reduce((n, k) => n + byKey.get(k)!.estCredits, 0);
  return { order, totalCredits, requiresCostConfirmation: totalCredits >= COST_CONFIRMATION_THRESHOLD_CREDITS };
}

export interface RunState {
  status: "COMPLETED" | "AWAITING_APPROVAL" | "AWAITING_HUMAN_REVIEW" | "NEEDS_COST_CONFIRMATION" | "FAILED" | "CANCELLED";
  outputs: Record<string, unknown>; pendingApproval?: string; failedStep?: string; error?: string;
}
export interface RunOpts {
  run(stepKey: string, input: Record<string, unknown>): Promise<unknown>;
  costConfirmed: boolean; resume?: RunState; approve?: string[]; humanReviewed?: boolean;
  maxRetries?: number; signal?: AbortSignal;
}

function resolve(v: unknown, input: Record<string, unknown>, outputs: Record<string, unknown>): unknown {
  if (typeof v !== "string" || !v.startsWith("$")) return v;
  const ref = v.slice(1);
  return ref.startsWith("input.") ? lookup(ref, input) : outputs[ref];
}

export async function runWorkflow(def: WorkflowDef, input: Record<string, unknown>, o: RunOpts): Promise<RunState> {
  const plan = planWorkflow(def, input);
  if (plan.requiresCostConfirmation && !o.costConfirmed) return { status: "NEEDS_COST_CONFIRMATION", outputs: {} };
  const outputs: Record<string, unknown> = { ...(o.resume?.outputs ?? {}) };
  const approved = new Set(o.approve ?? []);
  const byKey = new Map(def.steps.map((s) => [s.key, s]));

  for (const key of plan.order) {
    if (key in outputs) continue; // completed earlier – never re-run (no double charge)
    if (o.signal?.aborted) return { status: "CANCELLED", outputs };
    const step = byKey.get(key)!;
    if (step.requiresApproval && !approved.has(key)) return { status: "AWAITING_APPROVAL", outputs, pendingApproval: key };
    const stepInput = Object.fromEntries(Object.entries(step.input ?? {}).map(([k, v]) => [k, resolve(v, input, outputs)]));
    let attempt = 0;
    for (;;) {
      try { outputs[key] = await o.run(key, stepInput); break; }
      catch (e) {
        if (attempt++ >= (o.maxRetries ?? 0)) return { status: "FAILED", outputs, failedStep: key, error: (e as Error).message };
      }
    }
  }
  if (o.signal?.aborted) return { status: "CANCELLED", outputs };
  if (def.clinical && !o.humanReviewed) return { status: "AWAITING_HUMAN_REVIEW", outputs };
  return { status: "COMPLETED", outputs };
}
