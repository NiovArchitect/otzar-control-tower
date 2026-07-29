// FILE: walkthrough.ts
// PURPOSE: Role-aware first-use walkthrough plan (v5).
//          Full 12-step YC Labs journey matching founder acceptance gates.
// CONNECTS TO: FirstUseReveal, correctionMemory API.

export const WALKTHROUGH_VERSION = "v5" as const;

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
  why: string;
  doNext: string;
  ctaLabel: string;
  ctaTo: string;
  testId: string;
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

/** 1  - The communication problem */
const STEP_PROBLEM: WalkthroughStep = {
  id: "problem",
  title: "See the communication problem",
  body: "Reviews fragment across meetings and chat. HelioGrid (fictional) shows why Otzar must turn conversation into coordinated work.",
  why: "The product starts with a real organizational problem.",
  doNext: "Open Today to see the review signal without hunting.",
  ctaLabel: "Open Today",
  ctaTo: "/app",
  testId: "walkthrough-step-problem",
  targetContract: [
    "[data-testid='ambient-work-surface'], [data-testid='employee-shell-main']",
  ],
  facets: ["org_state"],
};

/** 2  - Bring in communication */
const STEP_INGEST: WalkthroughStep = {
  id: "ingest",
  title: "Bring in the review conversation",
  body: "Paste or upload a HelioGrid review transcript so Otzar preserves the source.",
  why: "Ingestion is the start of organizational understanding.",
  doNext: "Open Bring in a transcript.",
  ctaLabel: "Bring in a transcript",
  ctaTo: "/app/observe",
  testId: "walkthrough-step-ingest",
  targetContract: [
    "[data-testid='observe-read'], [data-testid='observe-read-text']",
  ],
  facets: ["org_state"],
};

/** 3  - What Otzar understood */
const STEP_UNDERSTAND: WalkthroughStep = {
  id: "understand",
  title: "See what Otzar understood",
  body: "People, decisions, commitments, risks, and disagreements appear in plain language.",
  why: "Understanding without living in machinery.",
  doNext: "Read decisions and risks on the result card.",
  ctaLabel: "Review understanding",
  ctaTo: "/app/observe",
  testId: "walkthrough-step-understand",
  targetContract: ["[data-testid='observe-read']"],
  facets: ["org_state"],
};

/** 4  - Automatic clarification */
const STEP_CLARIFY: WalkthroughStep = {
  id: "auto_clarify",
  title: "See automatic clarification",
  body: "Vague follow-ups become specific work  - Otzar clarifies routine ambiguity without a human chase.",
  why: "Clarity is product work, not user labor.",
  doNext: "Open My Work and find specific titles, not generic follow-ups.",
  ctaLabel: "Open My Work",
  ctaTo: "/app/my-work",
  testId: "walkthrough-step-clarify",
  targetContract: ["[data-testid='my-work-page'], [data-testid='employee-shell-main']"],
  facets: ["ai_action"],
};

/** 5  - AI collaboration */
const STEP_COLLAB: WalkthroughStep = {
  id: "ai_collab",
  title: "AI Teammates close evidence gaps",
  body: "When one review function needs another’s proof, AI Teammates request only authorized context and leave a readable receipt.",
  why: "Coordination without status meetings.",
  doNext: "Open People → How the team moved.",
  ctaLabel: "Open collaboration",
  ctaTo: "/app/collaboration",
  testId: "walkthrough-step-collab",
  targetContract: [
    "[data-testid='how-the-team-moved'], [data-testid='collaboration-page'], [data-testid='collab-receipt-card']",
  ],
  facets: ["ai_action"],
};

/** 6  - Updated work */
const STEP_WORK: WalkthroughStep = {
  id: "updated_work",
  title: "See work update after collaboration",
  body: "Collaboration results land as concrete work titles  - owners and next actions stay clear.",
  why: "Collaboration without work change is theater.",
  doNext: "Open My Work and confirm collaboration-updated titles.",
  ctaLabel: "Open My Work",
  ctaTo: "/app/my-work",
  testId: "walkthrough-step-work",
  targetContract: ["[data-testid='my-work-page'], [data-testid='employee-shell-main']"],
  facets: ["org_state"],
};

/** 7  - Human exception */
const STEP_EXCEPTION: WalkthroughStep = {
  id: "exception",
  title: "Only material judgment enters Needs me",
  body: "Security gates and consequential decisions need humans. Routine organization does not fill this queue.",
  why: "Exception-only attention scales.",
  doNext: "Open Needs me.",
  ctaLabel: "Open Needs me",
  ctaTo: "/app/action-center?tab=pending",
  testId: "walkthrough-step-exception",
  targetContract: ["[data-testid='action-center']"],
  facets: ["org_state"],
};

/** 8  - Result propagation */
const STEP_PROPAGATE: WalkthroughStep = {
  id: "propagation",
  title: "See the result propagate",
  body: "When conditions change, the same current truth appears in work, Talk, and reports  - not conflicting screens.",
  why: "One truth, many projections.",
  doNext: "Open Today and confirm the current recommendation signal.",
  ctaLabel: "Open Today",
  ctaTo: "/app",
  testId: "walkthrough-step-propagation",
  targetContract: [
    "[data-testid='ambient-work-surface'], [data-testid='employee-shell-main']",
  ],
  facets: ["org_state"],
};

/** 9  - Management signal */
const STEP_MANAGEMENT: WalkthroughStep = {
  id: "management",
  title: "See the management result",
  body: "One compact HelioGrid board: recommendation, evidence, work, AI collabs, risk, proof.",
  why: "Executives need signal, not activity vanity.",
  doNext: "Open the HelioGrid review board.",
  ctaLabel: "Open HelioGrid report",
  ctaTo: "/app/heliogrid-report",
  testId: "walkthrough-step-management",
  targetContract: ["[data-testid='heliogrid-report']"],
  facets: ["org_state"],
};

/** 10  - Persona difference */
const STEP_PERSONA: WalkthroughStep = {
  id: "persona_difference",
  title: "See how the view changes by role",
  body: "The same review looks different as organization lead, security lead, or contractor  - authority shapes projection.",
  why: "Persona-specific truth is the product.",
  doNext: "Open the demo persona launcher and switch role.",
  ctaLabel: "Switch role",
  ctaTo: "/demo/yc",
  testId: "walkthrough-step-persona",
  targetContract: ["[data-testid='demo-persona-launcher']"],
  facets: ["org_state"],
};

/** 11  - Memory and portability */
const STEP_MEMORY: WalkthroughStep = {
  id: "memory",
  title: "See Memory and personal learning",
  body: "Useful preferences and corrections stay personal. Company data does not silently travel.",
  why: "Portable profile without company leakage.",
  doNext: "Open Memory.",
  ctaLabel: "Open Memory",
  ctaTo: "/app/my-memory",
  testId: "walkthrough-step-memory",
  targetContract: [
    "[data-testid='my-memory-page'], [data-testid='employee-shell-main']",
  ],
  facets: ["org_state"],
};

/** 12  - Final coordinated outcome */
const STEP_OUTCOME: WalkthroughStep = {
  id: "final_outcome",
  title: "See the coordinated outcome",
  body: "Ask Talk what was decided  - conditional interview for fictional HelioGrid with remaining security condition.",
  why: "The loop closes in language and screens together.",
  doNext: "Open Talk and ask what was decided.",
  ctaLabel: "Open Talk",
  ctaTo: "/app/chat",
  testId: "walkthrough-step-outcome",
  targetContract: ["[data-testid='employee-shell-main']"],
  facets: ["provider_honesty"],
};

/**
 * Full 12-step YC application-review journey for all roles.
 */
export function walkthroughStepsFor(_role: WalkthroughRole): WalkthroughStep[] {
  return [
    STEP_PROBLEM,
    STEP_INGEST,
    STEP_UNDERSTAND,
    STEP_CLARIFY,
    STEP_COLLAB,
    STEP_WORK,
    STEP_EXCEPTION,
    STEP_PROPAGATE,
    STEP_MANAGEMENT,
    STEP_PERSONA,
    STEP_MEMORY,
    STEP_OUTCOME,
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
