// FILE: ai-collab-envelope.ts
// PURPOSE: L-01 — governed AI↔AI collaboration envelope: fail closed,
//          policy-gated, audited. Twin-to-twin never silently bypasses
//          human/org authority.
// CONNECTS TO: Collaboration page, CollaborationPolicy, FOUNDER L-01.

export type CollabTargetKind = "human" | "ai_teammate" | "team" | "project" | "unknown";

export type EnvelopeOutcome =
  | "allow"
  | "needs_approval"
  | "blocked"
  | "fail_closed";

export interface EnvelopeClassification {
  outcome: EnvelopeOutcome;
  reason_label: string;
  audited: true;
  fail_closed: boolean;
}

export const AI_COLLAB_ENVELOPE_DOCTRINE =
  "AI Teammate ↔ AI Teammate collaboration is a governed envelope: " +
  "org policy decides allow, needs approval, or block. " +
  "Unknown or cross-org paths fail closed. Every request is audited. " +
  "No silent twin-to-twin work outside policy.";

export const AI_COLLAB_FAIL_CLOSED =
  "If policy, membership, authority, or target is missing or unclear, " +
  "Otzar blocks the request — it never invents a path.";

export const AI_COLLAB_NEVER = [
  "Silent twin-to-twin actions without a request envelope",
  "Cross-organization AI collaboration",
  "Bypassing human approval when policy requires it",
  "Expanding tools or memory scope via collaboration",
] as const;

/** Map Foundation blocked_reason codes to human labels (fail-closed honesty). */
export function labelEnvelopeBlockedReason(
  code: string | null | undefined,
): string {
  switch ((code ?? "").toUpperCase()) {
    case "CROSS_ORG_DENIED":
      return "Outside your organization — blocked";
    case "MISSING_PROJECT_MEMBERSHIP":
      return "Project membership required — blocked until you are a member";
    case "MISSING_TEAM_MEMBERSHIP":
      return "Team membership required — blocked";
    case "MISSING_DMW_SCOPE":
      return "Memory scope missing — blocked";
    case "MISSING_AUTHORITY_GRANT":
      return "Authority grant missing — blocked";
    case "POLICY_REQUIRES_APPROVAL":
      return "Org policy requires approval first";
    case "CONNECTOR_WRITE_NOT_AUTHORIZED":
      return "Connector write not authorized — blocked";
    case "SENSITIVE_CONTEXT_BLOCKED":
      return "Sensitive context blocked";
    case "TARGET_NOT_FOUND":
      return "Target not found — fail closed";
    case "":
    case null:
    case undefined:
      return "Not blocked";
    default:
      return "Blocked by policy (fail closed)";
  }
}

export function classifyEnvelopeState(input: {
  state?: string | null;
  blocked_reason?: string | null;
  requires_approval?: boolean;
  requested_by_ai?: boolean;
  has_target_twin?: boolean;
}): EnvelopeClassification {
  const state = (input.state ?? "").toUpperCase();
  if (state === "BLOCKED" || input.blocked_reason) {
    return {
      outcome: "blocked",
      reason_label: labelEnvelopeBlockedReason(input.blocked_reason),
      audited: true,
      fail_closed: true,
    };
  }
  if (state === "NEEDS_APPROVAL" || input.requires_approval) {
    return {
      outcome: "needs_approval",
      reason_label: "Needs approval under org policy",
      audited: true,
      fail_closed: false,
    };
  }
  if (
    state === "REQUESTED" ||
    state === "ACCEPTED" ||
    state === "IN_PROGRESS" ||
    state === "COMPLETED"
  ) {
    return {
      outcome: "allow",
      reason_label: input.requested_by_ai
        ? "AI-initiated envelope under policy"
        : "Routed under org policy",
      audited: true,
      fail_closed: false,
    };
  }
  // Unknown state — fail closed for AI↔AI safety
  return {
    outcome: "fail_closed",
    reason_label: "Unknown envelope state — fail closed",
    audited: true,
    fail_closed: true,
  };
}

/** Resolve form target kind to Foundation target_type + field. */
export function resolveCollabTarget(input: {
  kind: CollabTargetKind;
  entityId?: string;
}): {
  target_type: "EMPLOYEE" | "EMPLOYEE_TWIN" | "TEAM" | "PROJECT";
  target_entity_id?: string;
  target_twin_entity_id?: string;
} {
  if (input.kind === "ai_teammate") {
    const out: {
      target_type: "EMPLOYEE_TWIN";
      target_twin_entity_id?: string;
    } = { target_type: "EMPLOYEE_TWIN" };
    if (input.entityId) out.target_twin_entity_id = input.entityId;
    return out;
  }
  if (input.kind === "team") {
    return { target_type: "TEAM" };
  }
  if (input.kind === "project") {
    return { target_type: "PROJECT" };
  }
  // human / unknown → employee person path
  const out: {
    target_type: "EMPLOYEE";
    target_entity_id?: string;
  } = { target_type: "EMPLOYEE" };
  if (input.entityId) out.target_entity_id = input.entityId;
  return out;
}

export function isAiToAiTarget(
  targetType: string | null | undefined,
  hasTargetTwin?: boolean,
): boolean {
  return (
    (targetType ?? "").toUpperCase() === "EMPLOYEE_TWIN" || hasTargetTwin === true
  );
}

/**
 * Product: flag false-complete claims of silent AI-AI success.
 * Doctrine that *prohibits* silent twin work must not match.
 */
export function claimsSilentAiCollab(text: string): boolean {
  const t = text.toLowerCase();
  // Explicit prohibitions are OK
  if (
    /never silent|no silent|not silent|without a request envelope|blocks the request/.test(
      t,
    )
  ) {
    return false;
  }
  return (
    /silent twin-to-twin actions without|silent twin actions|ai-to-ai without (approval|policy)|bypass approval.*twin|no audit for collaboration/i.test(
      t,
    )
  );
}
