// FILE: exception-reason.ts
// PURPOSE: Plain-language exception reason tags for Path E/F items only.
//          Autonomy doctrine: high-confidence routine work does not belong
//          in the exception queue; humans are interrupted only when judgment
//          or consequence requires them. Tags are closed-vocab, not scores.
// CONNECTS TO: ActionCenter.tsx, action-classify.ts, OTZAR autonomy model A–G.

import type { SafeActionView } from "@/lib/types/foundation";
import { classifyAction } from "@/lib/work-os/action-classify";

/** Closed-vocab reason tags shown to users (no confidence %). */
export type ExceptionReasonTag =
  | "Owner unclear"
  | "Sources conflict"
  | "Material correction"
  | "Approval required"
  | "New recurring pattern"
  | "Low confidence"
  | "External consequence"
  | "Sensitive access"
  | "Dual control required";

export interface ExceptionExplanation {
  /** True only when the human must act (Path E/F). */
  is_exception: boolean;
  /** Primary reason tag. */
  reason_tag: ExceptionReasonTag | null;
  /** One sentence: why the user is uniquely needed. */
  why_you_are_needed: string | null;
  /** Autonomy path hint for receipts (not shown by default). */
  autonomy_path: "E" | "F" | "G" | "B" | "A" | null;
}

const HIGH_RISK = new Set(["HIGH", "CRITICAL"]);

/**
 * WHAT: Derive a user-facing exception explanation from a safe Action view.
 * INPUT: SafeActionView (status, risk_tier, action_type, escalation_id).
 * OUTPUT: ExceptionExplanation — is_exception false for routine/auto work.
 * WHY: Exception-only review must never fill the queue with auto SUCCEEDED
 *      RECORD_CAPSULE or low-risk historical items.
 */
export function explainActionException(a: SafeActionView): ExceptionExplanation {
  const cls = classifyAction(a);

  // Path B / historical auto work — not an exception.
  if (cls === "HISTORICAL_EXECUTED" || cls === "LOW_RISK_INTERNAL_NOTE") {
    return {
      is_exception: false,
      reason_tag: null,
      why_you_are_needed: null,
      autonomy_path: a.status === "SUCCEEDED" ? "B" : "A",
    };
  }

  // Policy denials / hard blocks — Path G (inform, do not approve-as-job).
  if (a.status === "REJECTED" || a.status === "EXPIRED") {
    return {
      is_exception: false,
      reason_tag: null,
      why_you_are_needed: null,
      autonomy_path: "G",
    };
  }

  // Failed / timed out — surface as attention but not dual-control approval.
  if (cls === "NEEDS_ATTENTION") {
    return {
      is_exception: true,
      reason_tag: "Material correction",
      why_you_are_needed:
        "This action did not complete. Decide whether to retry, cancel, or correct the approach.",
      autonomy_path: "E",
    };
  }

  // Stuck routing without escalation — Path E ambiguity.
  if (cls === "NEEDS_REVIEW") {
    return {
      is_exception: true,
      reason_tag: "Owner unclear",
      why_you_are_needed:
        "Otzar cannot safely assign an owner or route this item. Choose who should own it, or reject the draft.",
      autonomy_path: "E",
    };
  }

  // Real approve/reject pending.
  if (cls === "ACTIONABLE_PENDING") {
    if (HIGH_RISK.has(a.risk_tier) || /DUAL_CONTROL|second approval/i.test(a.action_type)) {
      return {
        is_exception: true,
        reason_tag: "Dual control required",
        why_you_are_needed:
          "This is high-stakes work. A second legitimate approver must confirm before Otzar can proceed.",
        autonomy_path: "F",
      };
    }
    if (a.risk_tier === "MEDIUM") {
      return {
        is_exception: true,
        reason_tag: "Approval required",
        why_you_are_needed:
          "Your organization requires a human decision for this action type before execution.",
        autonomy_path: "F",
      };
    }
    return {
      is_exception: true,
      reason_tag: "Approval required",
      why_you_are_needed:
        "Policy requires your decision on this item. Routine low-risk work with an explicit auto-approve policy does not appear here.",
      autonomy_path: "E",
    };
  }

  return {
    is_exception: false,
    reason_tag: null,
    why_you_are_needed: null,
    autonomy_path: null,
  };
}

/**
 * WHAT: Whether an Action belongs in the exception-only Needs-decision surface.
 * INPUT: SafeActionView.
 * OUTPUT: boolean — true only for Path E/F exception items.
 * WHY: High-confidence routine commitments must never occupy the exception queue.
 */
export function isExceptionOnlyItem(a: SafeActionView): boolean {
  return explainActionException(a).is_exception;
}
