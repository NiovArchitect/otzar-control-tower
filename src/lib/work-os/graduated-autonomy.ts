// FILE: graduated-autonomy.ts
// PURPOSE: M-01 — graduated autonomy ladder: observe → draft → confirm →
//          execute. Maps Foundation TwinAutonomyLevel to honest product
//          stages. Preference proposes behavior; authority is granted.
// CONNECTS TO: GraduatedAutonomyLadderCard, MyTwin, AuthorityGrants,
//          Action Center (confirm), FOUNDER M-01.

export type AutonomyStageId = "observe" | "draft" | "confirm" | "execute";

export type StageAvailability =
  | "active_ceiling"
  | "allowed"
  | "gated"
  | "blocked";

export interface AutonomyStage {
  id: AutonomyStageId;
  label: string;
  plain: string;
  availability: StageAvailability;
}

export interface GraduatedAutonomyView {
  policy_label: string;
  policy_token: string | null;
  stages: AutonomyStage[];
  preference_note: string;
  authority_note: string;
  current_stage_id: AutonomyStageId;
  /** Highest stage this policy may reach under Foundation enforcement. */
  ceiling_stage_id: AutonomyStageId;
}

export const LADDER_STAGE_ORDER: AutonomyStageId[] = [
  "observe",
  "draft",
  "confirm",
  "execute",
];

export const PREFERENCE_NEQ_AUTHORITY_COPY =
  "Preferences and Teach Otzar learning shape how work is phrased and ordered. " +
  "They never move the ladder, add tools, or skip confirm.";

export const AUTHORITY_LADDER_DOCTRINE =
  "Autonomy is graduated: observe → draft → confirm → execute. " +
  "Org policy and your grants set the ceiling. Nothing auto-executes past what Foundation allows.";

const STAGE_COPY: Record<
  AutonomyStageId,
  { label: string; plain: string }
> = {
  observe: {
    label: "Observe",
    plain: "See work and context. No side effects.",
  },
  draft: {
    label: "Draft",
    plain: "Prepare proposals and drafts you can review.",
  },
  confirm: {
    label: "Confirm",
    plain: "You (or an approver) explicitly approve before it runs.",
  },
  execute: {
    label: "Execute",
    plain: "Perform the action under policy, grants, and audit.",
  },
};

function normalizePolicyToken(mode: string | null | undefined): string | null {
  if (typeof mode !== "string" || mode.trim().length === 0) return null;
  return mode.trim().toUpperCase().replace(/\s+/g, "_");
}

export function policyLabelFromMode(mode: string | null | undefined): string {
  const t = normalizePolicyToken(mode);
  switch (t) {
    case "OBSERVE_ONLY":
      return "Observe only";
    case "APPROVAL_REQUIRED":
      return "Approval required";
    case "EXECUTIVE_OVERRIDE":
      return "Executive override";
    default:
      return t
        ? t
            .toLowerCase()
            .split("_")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "Not set yet";
  }
}

/**
 * Ceiling stage this Foundation autonomy mode may reach.
 * OBSERVE_ONLY stops at observe (drafts may still be internal UI but execute is blocked).
 * APPROVAL_REQUIRED reaches execute only after confirm.
 * EXECUTIVE_OVERRIDE may execute under org tier gates (still audited).
 */
export function ceilingStageForPolicy(
  mode: string | null | undefined,
): AutonomyStageId {
  const t = normalizePolicyToken(mode);
  switch (t) {
    case "OBSERVE_ONLY":
      return "observe";
    case "EXECUTIVE_OVERRIDE":
      return "execute";
    case "APPROVAL_REQUIRED":
    default:
      return "execute"; // but confirm is gated
  }
}

export function stageIndex(id: AutonomyStageId): number {
  return LADDER_STAGE_ORDER.indexOf(id);
}

function availabilityFor(
  stage: AutonomyStageId,
  policy: string | null,
): StageAvailability {
  const t = normalizePolicyToken(policy);
  const idx = stageIndex(stage);

  if (t === "OBSERVE_ONLY") {
    if (stage === "observe") return "active_ceiling";
    if (stage === "draft") return "gated"; // may draft for review only; no execute path
    return "blocked";
  }

  if (t === "EXECUTIVE_OVERRIDE") {
    if (stage === "execute") return "active_ceiling";
    if (stage === "confirm") return "allowed"; // still available; not always required
    return "allowed";
  }

  // APPROVAL_REQUIRED (default honest path)
  if (stage === "confirm") return "active_ceiling";
  if (stage === "execute") return "gated"; // only after confirm
  if (idx <= stageIndex("draft")) return "allowed";
  return "gated";
}

export function buildGraduatedAutonomyView(
  mode: string | null | undefined,
): GraduatedAutonomyView {
  const token = normalizePolicyToken(mode);
  const ceiling = ceilingStageForPolicy(mode);
  // "Current" product focus: where the human should look next
  let current: AutonomyStageId = "confirm";
  if (token === "OBSERVE_ONLY") current = "observe";
  else if (token === "EXECUTIVE_OVERRIDE") current = "execute";
  else current = "confirm";

  const stages: AutonomyStage[] = LADDER_STAGE_ORDER.map((id) => ({
    id,
    label: STAGE_COPY[id].label,
    plain: STAGE_COPY[id].plain,
    availability: availabilityFor(id, token),
  }));

  return {
    policy_label: policyLabelFromMode(mode),
    policy_token: token,
    stages,
    preference_note: PREFERENCE_NEQ_AUTHORITY_COPY,
    authority_note: AUTHORITY_LADDER_DOCTRINE,
    current_stage_id: current,
    ceiling_stage_id: ceiling,
  };
}

/** Preference learning must never be treated as an autonomy raise. */
export function preferenceRaisesAutonomy(): false {
  return false;
}

export function stageAvailabilityLabel(a: StageAvailability): string {
  switch (a) {
    case "active_ceiling":
      return "Current focus";
    case "allowed":
      return "Allowed";
    case "gated":
      return "Needs confirm / grant";
    case "blocked":
      return "Blocked by policy";
  }
}
