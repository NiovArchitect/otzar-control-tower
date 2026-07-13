// FILE: org-truth.ts
// PURPOSE: Customer-facing copy + severity for the organizational-truth review
//          surface. Non-accusatory, calm enterprise vocabulary; the Foundation
//          literal unions stay in the type contract, this map wraps them.
// CONNECTS TO: OrgTruthReviewLane (ActionCenter) + OrgTruthReviewDrawer,
//              src/lib/types/foundation.ts (ConflictSetState, OrgTruthState,
//              CurrentSourceStatus-style classifications).
//
// TONE DISCIPLINE (founder §6/§13 — MANDATORY):
//   - Higher truth weight INFORMS review; it never auto-authorizes promotion.
//   - An authorized reviewer must select the organizational answer.
//   - A conflict does not mean anyone was wrong; the current answer is not
//     silently erased.

import type { ConflictSetState, OrgTruthState } from "@/lib/types/foundation";

export type OrgTruthSeverity = "neutral" | "amber" | "red";

// ── Mandated copy (exact) ───────────────────────────────────────────────────
export const ORG_TRUTH_COPY = {
  weightInforms:
    "Higher truth weight informs review but does not automatically authorize promotion.",
  reviewerSelects: "An authorized reviewer must select the organizational answer.",
  listEmpty: "No organizational truth conflicts need your review.",
  currentNone: "No current organizational answer has been established.",
  stale:
    "The conflict changed while you were reviewing it. Review the updated candidates.",
  loading: "Checking organizational truth conflicts…",
  sourceUnavailable: "A source used in this conflict is no longer available.",
  currentLabel: "Current promoted organizational truth",
  competingLabel: "Competing candidate",
  historicalLabel: "Historical superseded truth",
} as const;

// ── Conflict-set state ──────────────────────────────────────────────────────
export const CONFLICT_STATE_LABELS: Record<ConflictSetState, string> = {
  OPEN: "Review required",
  UNDER_REVIEW: "Under review",
  RESOLVED: "Resolved",
  SUPERSEDED: "Superseded",
  CANCELLED: "Closed",
} as const;

export const CONFLICT_STATE_SEVERITY: Record<ConflictSetState, OrgTruthSeverity> = {
  OPEN: "amber",
  UNDER_REVIEW: "amber",
  RESOLVED: "neutral",
  SUPERSEDED: "neutral",
  CANCELLED: "neutral",
} as const;

export function getConflictStateLabel(state: ConflictSetState): string {
  return CONFLICT_STATE_LABELS[state] ?? state;
}
export function getConflictStateSeverity(state: ConflictSetState): OrgTruthSeverity {
  return CONFLICT_STATE_SEVERITY[state] ?? "neutral";
}

// ── Promoted-truth state ────────────────────────────────────────────────────
export const ORG_TRUTH_STATE_LABELS: Record<OrgTruthState, string> = {
  CANDIDATE: "Candidate",
  PROMOTED: "Current answer",
  DISPUTED: "Disputed",
  SUPERSEDED: "Superseded",
  RETRACTED: "Retracted",
} as const;

export function getOrgTruthStateLabel(state: OrgTruthState): string {
  return ORG_TRUTH_STATE_LABELS[state] ?? state;
}

// ── Source-integrity severity (per candidate) ───────────────────────────────
// Demoted integrity states are the stronger-review signals; available/absent
// stay neutral. Never color-alone — always paired with a text label.
const DEMOTED_INTEGRITY = new Set([
  "CHANGED_UPSTREAM",
  "ACCESS_REVOKED",
  "SOURCE_DELETED",
  "CORRUPT_OR_INVALID",
  "UNREADABLE",
]);

export function getIntegritySeverity(state: string | null): OrgTruthSeverity {
  if (state === null) return "neutral";
  return DEMOTED_INTEGRITY.has(state) ? "red" : "neutral";
}

// ── Safe humanizer for classification tokens ────────────────────────────────
// SAFE classification strings only (communication_act, truth_class,
// authority_status, currentness, source_integrity_state) → Title Case.
export function humanizeOrgTruthClass(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim().length === 0) {
    return "Not recorded";
  }
  return value
    .split(/[_\s]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
