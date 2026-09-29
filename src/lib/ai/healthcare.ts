import type { Actor } from "./security/authz";

export const DRAFT_BANNER =
  "AI-GENERATED DRAFT — for clinician review only. Not a diagnosis, prescription, or final medical record. Verify all facts, doses and references.";

export function markDraft(text: string): string {
  return `${DRAFT_BANNER}\n\n${text}`;
}

export interface Decision { allowed: boolean; reason?: string }
const CLINICAL_ROLES = new Set(["DOCTOR"]);

export function canFinalizeClinicalDocument(
  doc: { aiGenerated: boolean; status: "DRAFT" | "FINAL" },
  actor: Actor, reviewConfirmed: boolean,
): Decision {
  if (!CLINICAL_ROLES.has(actor.role)) return { allowed: false, reason: "Only the treating doctor may finalize clinical documents" };
  if (doc.aiGenerated && !reviewConfirmed) return { allowed: false, reason: "Explicit doctor review confirmation required" };
  return { allowed: true };
}

export function canImportToEncounter(actor: Actor, explicitAuthorization: boolean): Decision {
  if (!CLINICAL_ROLES.has(actor.role)) return { allowed: false, reason: "Only a doctor may import AI output into a patient encounter" };
  if (!explicitAuthorization) return { allowed: false, reason: "Explicit authorization required" };
  return { allowed: true };
}
