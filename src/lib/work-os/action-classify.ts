// FILE: action-classify.ts
// PURPOSE: Phase 1285-S — deterministic Action Center classification so the
//          cockpit reads like a real approval surface, not a historical junk
//          drawer. Each Action is classified from its SAFE projection only
//          (status / action_type / risk_tier / escalation_id). The primary
//          "Needs decision" view + its count include ONLY truly actionable
//          items; historical / low-risk / non-actionable records are labeled
//          and de-emphasized, never deleted, never fake-cleared.
// CONNECTS TO: src/pages/app/ActionCenter.tsx, src/lib/types/foundation.ts
//          (SafeActionView), tests/unit/action-classify.test.ts.

import type { SafeActionView } from "@/lib/types/foundation";

export type ActionClass =
  | "ACTIONABLE_PENDING" // PROPOSED + a live escalation: a real approve/reject decision
  | "NEEDS_REVIEW" // PROPOSED with no escalation: routing/stuck, no decision available
  | "NEEDS_ATTENTION" // FAILED / TIMED_OUT: a failed action the user may want to see
  | "LOW_RISK_INTERNAL_NOTE" // terminal low-risk internal note: historical, no action
  | "HISTORICAL_EXECUTED" // SUCCEEDED: already handled
  | "NON_ACTIONABLE"; // approved/in-flight or other terminal: no action needed

const TERMINAL: ReadonlySet<string> = new Set([
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
  "REJECTED",
  "EXPIRED",
]);

function isInternalNote(actionType: string): boolean {
  return /SEND_INTERNAL_NOTIFICATION/i.test(actionType);
}

function hasEscalation(a: SafeActionView): boolean {
  return a.escalation_id !== undefined && a.escalation_id.length > 0;
}

// WHAT: classify one Action from its safe projection.
// INPUT: a SafeActionView.
// OUTPUT: an ActionClass.
// WHY: drives what is prominent (actionable) vs labeled-historical, and what
//      the pending count includes. Deterministic; no LLM; no destructive op.
export function classifyAction(a: SafeActionView): ActionClass {
  if (a.status === "PROPOSED") {
    return hasEscalation(a) ? "ACTIONABLE_PENDING" : "NEEDS_REVIEW";
  }
  if (a.status === "FAILED" || a.status === "TIMED_OUT") {
    return "NEEDS_ATTENTION";
  }
  if (TERMINAL.has(a.status) && isInternalNote(a.action_type) && a.risk_tier === "LOW") {
    return "LOW_RISK_INTERNAL_NOTE";
  }
  if (a.status === "SUCCEEDED") {
    return "HISTORICAL_EXECUTED";
  }
  // APPROVED / SCHEDULED / RUNNING (in flight) + REJECTED / CANCELLED / EXPIRED.
  return "NON_ACTIONABLE";
}

// WHAT: is this Action a real pending decision the user must act on?
// WHY: the "Needs decision" list + badge count include ONLY these, so the
//      cockpit never overstates what needs attention.
export function isActionablePending(a: SafeActionView): boolean {
  return classifyAction(a) === "ACTIONABLE_PENDING";
}

const CLASS_LABEL: Record<ActionClass, string | null> = {
  // No badge: an actionable item already shows Approve / Reject controls.
  ACTIONABLE_PENDING: null,
  NEEDS_REVIEW: "No action needed right now",
  NEEDS_ATTENTION: "Needs attention",
  LOW_RISK_INTERNAL_NOTE: "Low-risk internal note",
  HISTORICAL_EXECUTED: "Already handled",
  NON_ACTIONABLE: "Historical",
};

// WHAT: a short, honest, recipient-safe label for a non-actionable class.
// OUTPUT: the label, or null when no badge is warranted (actionable items).
// WHY: tells the user at a glance that an item does not require action, without
//      hiding it or pretending it was done. Em-dash-free copy.
export function actionClassLabel(a: SafeActionView): string | null {
  return CLASS_LABEL[classifyAction(a)];
}
