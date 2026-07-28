// FILE: walkthrough.ts
// PURPOSE: Role-aware first-use walkthrough plan (v3).
//          Persistent, route-aware steps. Plain language only.
//          No long dashes. No internal engineering terms.
// CONNECTS TO: FirstUseReveal, correctionMemory API.

export const WALKTHROUGH_VERSION = "v3" as const;

export type WalkthroughRole =
  | "administrator"
  | "executive"
  | "manager"
  | "employee"
  | "contractor";

export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
  /** Why this matters (one short line). */
  why: string;
  /** What to do next. */
  doNext: string;
  /** Real product path. */
  ctaLabel: string;
  ctaTo: string;
  testId: string;
  /** data-walkthrough-target selectors that should exist on the destination. */
  targetContract: string[];
  facets?: Array<"org_state" | "ai_action" | "provider_honesty">;
}

export function resolveWalkthroughRole(input: {
  isOrgAdmin: boolean;
  title: string | null;
  orgRole: string | null;
}): WalkthroughRole {
  if (input.isOrgAdmin) return "administrator";
  const t = `${input.title ?? ""} ${input.orgRole ?? ""}`.toLowerCase();
  if (/\b(ceo|founder|executive|vp|chief|cfo|coo|cto)\b/.test(t)) {
    return "executive";
  }
  if (/\b(manager|lead|director|head|owner)\b/.test(t)) return "manager";
  if (/\b(contractor|consultant|vendor|external|freelance)\b/.test(t)) {
    return "contractor";
  }
  return "employee";
}

/** Product-demo path: ingest → understanding → collab/decision → exception-only. */
const PROBLEM_VALUE: WalkthroughStep = {
  id: "problem_value",
  title: "Application review fragments across conversations",
  body: "Partner notes, diligence calls, and chat scatter decisions. Paste a real transcript so Otzar keeps people, commitments, risks, and disagreements connected.",
  why: "You should not reconstruct context by hand for every application.",
  doNext: "Open Bring in a transcript and paste or upload a review discussion.",
  ctaLabel: "Bring in a transcript",
  ctaTo: "/app/observe",
  testId: "walkthrough-step-ingest",
  targetContract: ["[data-testid='observe-read'], [data-testid='observe-read-text']"],
  facets: ["org_state"],
};

const HANDLED_PROOF: WalkthroughStep = {
  id: "handled_proof",
  title: "See what Otzar understood and where it went",
  body: "Otzar shows decisions, commitments, risks, and destinations — Today, projects, people, and Talk — without raw pipeline noise. AI Teammates can close routine dependencies under policy.",
  why: "Results and proof matter more than inspecting Otzar's machinery.",
  doNext: "Review completed work or a collaboration receipt for this application.",
  ctaLabel: "Open completed work",
  ctaTo: "/app/action-center?tab=completed",
  testId: "walkthrough-step-completed",
  targetContract: ["[data-testid='action-center'], [data-testid='collaboration-page']"],
  facets: ["ai_action"],
};

const EXCEPTION_ONLY: WalkthroughStep = {
  id: "exception_only",
  title: "You only join when judgment is required",
  body: "Disagreements and high-stakes calls land in Needs me with a clear why. Routine organization stays out of that queue.",
  why: "At scale, raw review counts fail. Exceptions must be rare and clear.",
  doNext: "Open Needs me and resolve only the material disagreement or authority question.",
  ctaLabel: "Open exceptions",
  ctaTo: "/app/action-center?tab=pending",
  testId: "walkthrough-step-exceptions",
  targetContract: ["[data-testid='action-center']"],
  facets: ["org_state"],
};

/**
 * Role-specific paths. ≤3 steps. Product demonstration, not feature tour.
 */
export function walkthroughStepsFor(role: WalkthroughRole): WalkthroughStep[] {
  // All roles: product demonstration sequence, not a feature tour.
  // Max 3 steps. Connections only when role is administrator (setup hygiene).
  switch (role) {
    case "administrator":
      return [PROBLEM_VALUE, HANDLED_PROOF, EXCEPTION_ONLY];
    case "executive":
      return [PROBLEM_VALUE, HANDLED_PROOF, EXCEPTION_ONLY];
    case "manager":
      return [PROBLEM_VALUE, HANDLED_PROOF, EXCEPTION_ONLY];
    case "contractor":
    case "employee":
    default:
      return [PROBLEM_VALUE, HANDLED_PROOF, EXCEPTION_ONLY];
  }
}

export function walkthroughMarker(version: string = WALKTHROUGH_VERSION): string {
  return `otzar_first_use_walkthrough:${version}:done`;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Pure: clamp step index to plan length. */
export function clampWalkthroughStep(
  index: number,
  stepCount: number,
): number {
  if (stepCount <= 0) return 0;
  if (index < 0) return 0;
  if (index >= stepCount) return stepCount - 1;
  return index;
}
