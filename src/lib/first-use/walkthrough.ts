// FILE: walkthrough.ts
// PURPOSE: Role-aware first-use walkthrough plan (v4).
//          Full YC Labs journey: ingest → understanding → destinations →
//          AI collab → disagreement → human exception → final agreement →
//          management result. Plain language only.
// CONNECTS TO: FirstUseReveal, correctionMemory API.

export const WALKTHROUGH_VERSION = "v4" as const;

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
  if (/\b(ceo|founder|executive|vp|chief|cfo|coo|cto|partner)\b/.test(t)) {
    return "executive";
  }
  if (/\b(manager|lead|director|head|owner)\b/.test(t)) return "manager";
  if (/\b(contractor|consultant|vendor|external|freelance)\b/.test(t)) {
    return "contractor";
  }
  return "employee";
}

const STEP_INGEST: WalkthroughStep = {
  id: "ingest",
  title: "Bring in a real review conversation",
  body: "Application reviews fragment across meetings and chat. Paste or upload a HelioGrid transcript so Otzar preserves the source.",
  why: "Ingestion is the start of organizational understanding.",
  doNext: "Open Bring in a transcript and paste or upload a review discussion.",
  ctaLabel: "Bring in a transcript",
  ctaTo: "/app/observe",
  testId: "walkthrough-step-ingest",
  targetContract: ["[data-testid='observe-read'], [data-testid='observe-read-text']"],
  facets: ["org_state"],
};

const STEP_UNDERSTAND: WalkthroughStep = {
  id: "understand",
  title: "See what Otzar understood",
  body: "People, decisions, commitments, risks, and disagreements appear in plain language — not as pipeline events.",
  why: "Understanding without living in machinery.",
  doNext: "Read decisions, commitments, and risks on the result card.",
  ctaLabel: "Review understanding",
  ctaTo: "/app/observe",
  testId: "walkthrough-step-understand",
  targetContract: ["[data-testid='observe-read']"],
  facets: ["org_state"],
};

const STEP_DESTINATIONS: WalkthroughStep = {
  id: "destinations",
  title: "See where the information went",
  body: "The same truth projects to Today, projects, people, Talk, and Memory — role-appropriate, not duplicated noise.",
  why: "You should always know where work landed.",
  doNext: "Use Where this went links after a successful read.",
  ctaLabel: "Open Today",
  ctaTo: "/app",
  testId: "walkthrough-step-destinations",
  targetContract: ["[data-testid='ambient-work-surface'], [data-testid='employee-shell-main']"],
  facets: ["org_state"],
};

const STEP_COLLAB: WalkthroughStep = {
  id: "ai_collab",
  title: "AI Teammates close evidence gaps",
  body: "When one review function needs another’s proof, AI Teammates request only authorized context and leave a readable receipt — not agent chat.",
  why: "Coordination without status meetings.",
  doNext: "Open People and open a completed collaboration receipt.",
  ctaLabel: "Open collaboration",
  ctaTo: "/app/collaboration",
  testId: "walkthrough-step-collab",
  targetContract: ["[data-testid='collaboration-page'], [data-testid='collab-receipt-card']"],
  facets: ["ai_action"],
};

const STEP_EXCEPTION: WalkthroughStep = {
  id: "exception",
  title: "Only material judgment enters Needs me",
  body: "HelioGrid advance-or-hold and security gates need humans. Routine organization does not fill this queue.",
  why: "Exception-only attention scales.",
  doNext: "Open Needs me and confirm the disagreement or authority item.",
  ctaLabel: "Open Needs me",
  ctaTo: "/app/action-center?tab=pending",
  testId: "walkthrough-step-exception",
  targetContract: ["[data-testid='action-center']"],
  facets: ["org_state"],
};

const STEP_AGREEMENT: WalkthroughStep = {
  id: "final_agreement",
  title: "Resolve disagreement into a current decision",
  body: "When security evidence is enough, the final governed recommendation becomes current. Older positions stay historical.",
  why: "Detection without closure is not the product.",
  doNext: "Open completed work and the HelioGrid report for the current decision.",
  ctaLabel: "Open completed work",
  ctaTo: "/app/action-center?tab=completed",
  testId: "walkthrough-step-agreement",
  targetContract: ["[data-testid='action-center']"],
  facets: ["ai_action"],
};

const STEP_MANAGEMENT: WalkthroughStep = {
  id: "management",
  title: "See the management result",
  body: "One compact HelioGrid review board: recommendation, evidence, work completed, AI collabs, human decisions, open risk, proof.",
  why: "Executives need signal, not activity vanity.",
  doNext: "Open the HelioGrid review board.",
  ctaLabel: "Open HelioGrid report",
  ctaTo: "/app/heliogrid-report",
  testId: "walkthrough-step-management",
  targetContract: ["[data-testid='heliogrid-report']"],
  facets: ["org_state"],
};

const STEP_TALK: WalkthroughStep = {
  id: "talk",
  title: "Ask Otzar anything about the review",
  body: "Talk answers from grounded work — even with typos. Ask what changed, who owes work, or what was decided.",
  why: "Exploration without rebuilding context.",
  doNext: "Open Talk and ask about HelioGrid.",
  ctaLabel: "Open Talk",
  ctaTo: "/app/chat",
  testId: "walkthrough-step-talk",
  targetContract: ["[data-testid='employee-shell-main']"],
  facets: ["provider_honesty"],
};

/**
 * Full YC application-review journey for all roles.
 * Compact enough for first-use; complete enough for product story.
 */
export function walkthroughStepsFor(_role: WalkthroughRole): WalkthroughStep[] {
  return [
    STEP_INGEST,
    STEP_UNDERSTAND,
    STEP_DESTINATIONS,
    STEP_COLLAB,
    STEP_EXCEPTION,
    STEP_AGREEMENT,
    STEP_MANAGEMENT,
    STEP_TALK,
  ];
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
