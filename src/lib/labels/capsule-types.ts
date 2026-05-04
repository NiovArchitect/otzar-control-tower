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
