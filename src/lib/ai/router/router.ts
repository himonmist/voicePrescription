export interface ClassifiedTask {
  taskTypes: string[];
  requiredCapabilities: string[];
  needsWebSearch: boolean;
  hasPatientData: boolean;
}

const RULES: { type: string; re: RegExp; caps: string[] }[] = [
  { type: "research", re: /\b(research|papers?|literature|evidence|pubmed|studies|trial)\b/i, caps: ["document_analysis", "research"] },
  { type: "presentation", re: /\b(presentation|slides?|deck|powerpoint)\b/i, caps: ["presentation"] },
  { type: "coding", re: /\b(code|python|typescript|javascript|bug|function|sql|api)\b/i, caps: ["coding"] },
  { type: "data_analysis", re: /\b(csv|spreadsheet|excel|dataset|chart|statistic)/i, caps: ["data_analysis"] },
  { type: "image", re: /\b(image|illustration|infographic|logo)\b/i, caps: ["image_generation"] },
  { type: "writing", re: /\b(write|draft|email|letter|proposal|summar(y|ize|ise)|rewrite|translate)/i, caps: ["writing"] },
  { type: "clinical", re: /\b(clinical|prescription|diagnos|discharge|referral|soap)\b/i, caps: ["writing", "clinical"] },
];
const WEB = /\b(latest|current|today|news|recent|20(2[4-9]|3\d))\b/i;
const PHI = /\b(patient|patient's|mrn|discharge|his|her)\b.*\b(report|record|note|history|transcript)\b|\bpatient('s)?\b/i;

export function classifyTask(text: string): ClassifiedTask {
  const types: string[] = []; const caps = new Set<string>();
  for (const r of RULES) if (r.re.test(text)) { types.push(r.type); r.caps.forEach((c) => caps.add(c)); }
  if (types.length === 0) { types.push("general"); caps.add("writing"); }
  return { taskTypes: types, requiredCapabilities: [...caps], needsWebSearch: WEB.test(text), hasPatientData: PHI.test(text) };
}

export interface Candidate {
  id: string; name: string;
  status: "IN_APP" | "EXTERNAL" | "DISABLED" | "UNAVAILABLE";
  capabilities: string[]; inputTypes: string[]; outputTypes: string[];
  contextTokens: number; webSearch: boolean; structuredOutput: boolean; healthy: boolean;
  estCostPer1kTokens: number; latencyMs: number; approvedForPHI: boolean; eligiblePlans: string[];
}
export interface RouteInput {
  requiredCapabilities: string[]; needsWebSearch: boolean; hasPatientData: boolean;
  plan: string; estTokens: number; preferredToolId?: string;
}
export interface RouteResult {
  selected: Candidate | null; ambiguous: boolean; shortlist: Candidate[];
  rejected: { id: string; reason: string }[]; externalAlternatives: Candidate[]; explanation: string;
}

/** Transparent rule-based selection: hard filters first, then an explainable score. No "best tool" claims. */
export function routeTask(input: RouteInput, candidates: Candidate[]): RouteResult {
  const rejected: { id: string; reason: string }[] = [];
  const externalAlternatives: Candidate[] = [];
  const eligible: Candidate[] = [];
  for (const c of candidates) {
    if (c.status === "DISABLED") { rejected.push({ id: c.id, reason: "Disabled by administrator" }); continue; }
    if (c.status === "EXTERNAL") {
      rejected.push({ id: c.id, reason: "External application – cannot run in-app" });
      if (input.requiredCapabilities.some((r) => c.capabilities.includes(r))) externalAlternatives.push(c);
      continue;
    }
    if (c.status === "UNAVAILABLE" || !c.healthy) { rejected.push({ id: c.id, reason: "Provider unavailable (health check failing)" }); continue; }
    if (!c.eligiblePlans.includes(input.plan)) { rejected.push({ id: c.id, reason: `Not included in ${input.plan} plan` }); continue; }
    const missing = input.requiredCapabilities.filter((r) => !c.capabilities.includes(r));
    if (missing.length) { rejected.push({ id: c.id, reason: `Missing capabilities: ${missing.join(", ")}` }); continue; }
    if (input.hasPatientData && !c.approvedForPHI) { rejected.push({ id: c.id, reason: "Not approved for patient data" }); continue; }
    if (input.needsWebSearch && !c.webSearch) { rejected.push({ id: c.id, reason: "No web/current-information support" }); continue; }
    if (c.contextTokens < input.estTokens) { rejected.push({ id: c.id, reason: "Context window too small" }); continue; }
    eligible.push(c);
  }
  const overlap = (c: Candidate) => input.requiredCapabilities.filter((r) => c.capabilities.includes(r)).length;
  externalAlternatives.sort((a, b) => overlap(b) - overlap(a) || a.id.localeCompare(b.id));
  eligible.sort((a, b) => a.id.localeCompare(b.id)); // stable, deterministic base order

  if (eligible.length === 0) {
    const why = input.hasPatientData
      ? "No provider is approved to receive patient data for this task. Use a de-identified version or an approved provider."
      : "No in-app integration currently satisfies this task.";
    return { selected: null, ambiguous: false, shortlist: [], rejected, externalAlternatives,
      explanation: why + (externalAlternatives.length ? ` External option(s): ${externalAlternatives.map((c) => c.name).join(", ")}.` : "") };
  }

  const maxCost = Math.max(...eligible.map((c) => c.estCostPer1kTokens), 1e-9);
  const maxLat = Math.max(...eligible.map((c) => c.latencyMs), 1);
  const score = (c: Candidate) =>
    (c.id === input.preferredToolId ? 100 : 0) +
    (c.structuredOutput ? 1 : 0) +
    (1 - c.estCostPer1kTokens / maxCost) * 3 +
    (1 - c.latencyMs / maxLat) * 1;
  const scored = eligible.map((c) => ({ c, s: Math.round(score(c) * 1000) / 1000 })).sort((a, b) => b.s - a.s || a.c.id.localeCompare(b.c.id));
  const top = scored[0]!;
  const tied = scored.filter((x) => x.s === top.s);
  if (tied.length > 1) {
    return { selected: null, ambiguous: true, shortlist: tied.map((t) => t.c), rejected, externalAlternatives,
      explanation: `${tied.length} tools are equally suitable on capability, cost and latency. Choose one or save a preference.` };
  }
  const pref = top.c.id === input.preferredToolId ? " (your saved preference)" : "";
  return { selected: top.c, ambiguous: false, shortlist: scored.slice(0, 3).map((x) => x.c), rejected, externalAlternatives,
    explanation: `${top.c.name} selected${pref}: supports ${input.requiredCapabilities.join(", ")}; healthy; included in your plan; ranked by rule-based score (preference, structured output, estimated cost, latency).` };
}
