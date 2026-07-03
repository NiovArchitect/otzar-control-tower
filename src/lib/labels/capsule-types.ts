// FILE: capsule-types.ts
// PURPOSE: Single source of truth mapping CapsuleType literal values
//          to customer-facing display labels. Foundation primitives
//          (the literal values) stay in the type contract; this map
//          wraps them in enterprise-admin vocabulary.
// CONNECTS TO: Permissions matrix columns (12B.4), every capsule
//              display that shows the type to a customer.
//
// VOCABULARY DISCIPLINE:
// Foundation calls these "capsule_type" because that's the
// patent-claim language. Customers see "Decisions, Commitments,
// Conversation Learnings" -- the enterprise vocabulary. Never
// hardcode a CapsuleType literal in UI -- always go through
// getCapsuleTypeLabel.
//
// EXHAUSTIVENESS: Record<CapsuleType, string> requires every literal
// to have an entry. Adding a new CapsuleType to Foundation's enum
// breaks the build here until the label is supplied. That's the
// intended safety net.

import type { CapsuleType } from "@/lib/types/foundation";

export const CAPSULE_TYPE_LABELS: Record<CapsuleType, string> = {
  FOUNDATIONAL: "Foundational Knowledge",
  PREFERENCE: "Preferences",
  RELATIONSHIP: "Relationships",
  DOMAIN_KNOWLEDGE: "Domain Expertise",
  BEHAVIORAL_PATTERN: "Behavioral Patterns",
  IDENTITY: "Identity",
  DEVICE_DATA: "Device Data",
  SESSION_LEARNING: "Session Learnings",
  COMPLIANCE_RECORD: "Compliance Records",
  CONVERSATION_LEARNING: "Conversation Learnings",
  TASK_LEARNING: "Task Learnings",
  WORK_PATTERN: "Work Patterns",
  COMMUNICATION_PREF: "Communication Preferences",
  DECISION_STYLE: "Decision Style",
  COMMITMENT: "Commitments",
  BLOCKER: "Blockers",
  RISK: "Risks",
  HANDOFF: "Handoffs",
  DECISION: "Decisions",
  CORRECTION: "Corrections",
} as const;

// WHAT: Look up the customer-facing label for a CapsuleType literal.
// INPUT: A CapsuleType literal value.
// OUTPUT: The display label, or the literal itself if no map entry
//          exists (shouldn't happen given the Record<> constraint
//          above, but defensive in case of contract drift).
// WHY: Centralized lookup so call sites don't hardcode either the
//      literal or the label. Same pattern as
//      getEntityTypeLabel and getAuditEventLabel.
export function getCapsuleTypeLabel(type: CapsuleType): string {
  return CAPSULE_TYPE_LABELS[type] ?? type;
}

// ── [GAP-S S-1] Ownership boundary per capsule type ─────────────────────────
// The doctrine boundary (OTZAR_ORG_READY_AND_PORTABLE_TWIN_DOCTRINE.md):
// "the employee can take the SHAPE of how they work; they cannot take the
// company's WORK." This map renders the EXISTING write-time routing truth
// (FND observation.service.ts wallet routing: DECISION → org wallet;
// WORK_PATTERN / CORRECTION / COMMITMENT / CONVERSATION_LEARNING → employee
// wallet) — it moves no data and claims no export feature.
// "mixed" = stored in the employee's wallet by routing, but the content
// references company work, so it can become personal memory only after
// company details are stripped (doctrine Category C — derivation rail is
// future, so mixed is treated as company-bound until then).

export type CapsuleBoundary = "personal" | "company" | "device" | "mixed";

export const CAPSULE_TYPE_BOUNDARY: Record<CapsuleType, CapsuleBoundary> = {
  FOUNDATIONAL: "personal",
  PREFERENCE: "personal",
  RELATIONSHIP: "company",
  DOMAIN_KNOWLEDGE: "personal",
  BEHAVIORAL_PATTERN: "personal",
  IDENTITY: "personal",
  DEVICE_DATA: "device",
  SESSION_LEARNING: "personal",
  COMPLIANCE_RECORD: "company",
  CONVERSATION_LEARNING: "mixed",
  TASK_LEARNING: "personal",
  WORK_PATTERN: "personal",
  COMMUNICATION_PREF: "personal",
  DECISION_STYLE: "personal",
  COMMITMENT: "mixed",
  BLOCKER: "company",
  RISK: "company",
  HANDOFF: "company",
  DECISION: "company",
  CORRECTION: "personal",
} as const;

const BOUNDARY_LABELS: Record<CapsuleBoundary, string> = {
  personal: "Personal work memory",
  company: "Company-owned work data",
  device: "Device-bound",
  mixed: "Personal only after company details are stripped",
};

// Short form for tight surfaces (matrix column sub-labels).
const BOUNDARY_SHORT_LABELS: Record<CapsuleBoundary, string> = {
  personal: "Personal",
  company: "Company-owned",
  device: "Device-bound",
  mixed: "Mixed",
};

export function getCapsuleBoundary(type: CapsuleType): CapsuleBoundary {
  return CAPSULE_TYPE_BOUNDARY[type] ?? "company";
}

export function getCapsuleBoundaryLabel(type: CapsuleType): string {
  return BOUNDARY_LABELS[getCapsuleBoundary(type)];
}

export function getCapsuleBoundaryShortLabel(type: CapsuleType): string {
  return BOUNDARY_SHORT_LABELS[getCapsuleBoundary(type)];
}
