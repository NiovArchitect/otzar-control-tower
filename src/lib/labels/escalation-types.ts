// FILE: escalation-types.ts
// PURPOSE: Customer-safe labels for EscalationType + EscalationStatus.
//          Record<T, string> enforces compile-time exhaustiveness per the
//          vocabulary discipline -- adding a Foundation enum value breaks
//          the build here until a product label is supplied. Customer
//          copy NEVER exposes substrate primitives; the product framing
//          is "approval request".
// CONNECTS TO: src/pages/app/Approvals.tsx,
//              src/components/employee/ApprovalDetailDrawer.tsx.

import type {
  EscalationStatus,
  EscalationType,
} from "@/lib/types/foundation";

// WHAT: Product-safe label per escalation type.
export const ESCALATION_TYPE_LABELS: Record<EscalationType, string> = {
  // [CE-2] the AI-uncertainty type's only production writer is the
  // clarification request — labeled as what it is (NOT an approval).
  HUMAN_REVIEW_REQUIRED: "Clarification request",
  SOVEREIGNTY_VIOLATION: "Access boundary review",
  THRESHOLD_BREACH: "Threshold review",
  POLICY_CONFLICT: "Policy review",
  AUTHORIZATION_FAILURE: "Authorization review",
  COMPLIANCE_GATE: "Access gate review",
  DUAL_CONTROL_REQUIRED: "Second-approver gate",
};

export function getEscalationTypeLabel(type: EscalationType): string {
  return ESCALATION_TYPE_LABELS[type];
}

// WHAT: Product-safe label per escalation status.
export const ESCALATION_STATUS_LABELS: Record<EscalationStatus, string> = {
  PENDING: "Waiting on you",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export function getEscalationStatusLabel(status: EscalationStatus): string {
  return ESCALATION_STATUS_LABELS[status];
}
