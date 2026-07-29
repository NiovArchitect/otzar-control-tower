// FILE: walkthrough.ts
// PURPOSE: Role-aware first-use walkthrough plan (yc-demo-v6).
//          12-step YC Labs journey with distinct routes where possible.
//          Version bump invalidates stale v5 step markers that resumed at 8/11.
// CONNECTS TO: FirstUseReveal, correctionMemory API.

export const WALKTHROUGH_VERSION = "yc-demo-v6" as const;

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

/** 1 - The problem */
const STEP_PROBLEM: WalkthroughStep = {
  id: "problem",
  title: "Important work is scattered",
  body: "Conversations, documents, and tools fragment the HelioGrid review. Otzar turns that communication into coordinated work with one current truth.",
  why: "YC judges must see the problem in five seconds.",
  doNext: "Open Today to see the review signal.",
  ctaLabel: "Open Today",
  ctaTo: "/app",
  testId: "walkthrough-step-problem",
  targetContract: [
    "[data-testid='ambient-work-surface'], [data-testid='employee-shell-main']",
  ],
  facets: ["org_state"],
};

/** 2 - Bring in communication */
const STEP_INGEST: WalkthroughStep = {
  id: "ingest",
  title: "Bring in a real work conversation",
  body: "Paste or open a fictional startup-review transcript. Otzar identifies people, decisions, commitments, risks, and missing context.",
  why: "Show what data Otzar begins with - not a blank dashboard.",
  doNext: "Open Bring in a transcript.",
  ctaLabel: "Bring in a transcript",
  ctaTo: "/app/observe",
  testId: "walkthrough-step-ingest",
  targetContract: [
    "[data-testid='observe-read'], [data-testid='observe-read-text']",
  ],
  facets: ["org_state"],
};

/** 3 - Understanding */
const STEP_UNDERSTAND: WalkthroughStep = {
  id: "understand",
  title: "See what Otzar understood",
  body: "Recommendation, owners, risks, commitments, and uncertainty - plain language, no backend codes. HelioGrid is conditional on security.",
  why: "Intelligence must be legible without founder narration.",
  doNext: "Stay on the transcript surface and read the understanding.",
  ctaLabel: "Review understanding",
  ctaTo: "/app/observe",
  testId: "walkthrough-step-understand",
  targetContract: ["[data-testid='observe-read']"],
  facets: ["org_state"],
};

/** 4 - Autonomous clarification */
const STEP_CLARIFY: WalkthroughStep = {
  id: "auto_clarify",
  title: "Otzar clarified the vague follow-up",
  body: 'Before: "Circle back with Casey." After: Casey must confirm encryption and data-rights controls before Ava sends the interview invitation - without management chase.',
  why: "Autonomy is the product, not another task list.",
  doNext: "Open My Work and find specific titles.",
  ctaLabel: "Open My Work",
  ctaTo: "/app/my-work",
  testId: "walkthrough-step-clarify",
  targetContract: [
    "[data-testid='my-work-page'], [data-testid='employee-shell-main']",
  ],
  facets: ["ai_action"],
};

/** 5 - AI Teammate collaboration */
const STEP_COLLAB: WalkthroughStep = {
  id: "ai_collab",
  title: "AI Teammates closed an evidence gap",
  body: "Ava's AI Teammate requested the minimum authorized security context from Casey's AI Teammate. Private memory and unrelated work stayed excluded.",
  why: "Show multi-agent collaboration under policy - not status-meeting theater.",
  doNext: "Open People - How the team moved.",
  ctaLabel: "Open collaboration",
  ctaTo: "/app/collaboration",
  testId: "walkthrough-step-collab",
  targetContract: [
    "[data-testid='how-the-team-moved'], [data-testid='collaboration-page'], [data-testid='collab-receipt-card']",
  ],
  facets: ["ai_action"],
};

/** 6 - Role-specific work (security gate owners) */
const STEP_WORK: WalkthroughStep = {
  id: "updated_work",
  title: "Work updated after collaboration",
  body: "Owners, next actions, and dependencies are concrete. Collaboration without work change is theater - this step proves the update landed.",
  why: "Employees must see exact work, not generic follow-ups.",
  doNext: "Open My Work and confirm collaboration-updated titles.",
  ctaLabel: "Open My Work",
  ctaTo: "/app/my-work",
  testId: "walkthrough-step-work",
  targetContract: [
    "[data-testid='my-work-page'], [data-testid='employee-shell-main']",
  ],
  facets: ["org_state"],
};

/** 7 - Human exception only */
const STEP_EXCEPTION: WalkthroughStep = {
  id: "exception",
  title: "Only consequential judgment enters Needs me",
  body: "Otzar handled routine coordination. A person is needed only for high-stakes decisions - or Needs me stays honestly empty.",
  why: "Exception-only attention scales; approval fatigue does not.",
  doNext: "Open Needs me.",
  ctaLabel: "Open Needs me",
  ctaTo: "/app/action-center",
  testId: "walkthrough-step-exception",
  targetContract: ["[data-testid='action-center']"],
  facets: ["org_state"],
};

/** 8 - Result propagation */
const STEP_PROPAGATE: WalkthroughStep = {
  id: "propagation",
  title: "One change updates the organization",
  body: "When security status moves, work, recommendation, and management views share the same current truth - people do not re-broadcast the update.",
  why: "One event, many honest projections.",
  doNext: "Return to Today and confirm the current recommendation signal.",
  ctaLabel: "Open Today",
  ctaTo: "/app",
  testId: "walkthrough-step-propagation",
  targetContract: [
    "[data-testid='ambient-work-surface'], [data-testid='employee-shell-main']",
  ],
  facets: ["org_state"],
};

/** 9 - Management signal */
const STEP_MANAGEMENT: WalkthroughStep = {
  id: "management",
  title: "Management sees the signal, not vanity",
  body: "One HelioGrid board: recommendation, evidence, work, AI collabs, risk, and proof - not activity theater.",
  why: "Executives need decision-ready signal.",
  doNext: "Open the HelioGrid review board.",
  ctaLabel: "Open HelioGrid report",
  ctaTo: "/app/heliogrid-report",
  testId: "walkthrough-step-management",
  targetContract: ["[data-testid='heliogrid-report']"],
  facets: ["org_state"],
};

/** 10 - Persona difference */
const STEP_PERSONA: WalkthroughStep = {
  id: "persona_difference",
  title: "Same event, different responsibility",
  body: "Switch roles on the demo launcher. Each persona sees different work, authority, AI support, and exceptions - one connected organization story.",
  why: "Permissions alone are not value; role-specific outcomes are.",
  doNext: "Open the demo persona launcher and switch role.",
  ctaLabel: "Switch role",
  ctaTo: "/demo/yc",
  testId: "walkthrough-step-persona",
  targetContract: ["[data-testid='demo-persona-launcher']"],
  facets: ["org_state"],
};

/** 11 - Memory boundary */
const STEP_MEMORY: WalkthroughStep = {
  id: "memory",
  title: "Personal learning stays personal",
  body: "Useful preferences and corrections stay with the person. Company review data does not silently travel into personal memory.",
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

/** 12 - Coordinated outcome in Talk */
const STEP_OUTCOME: WalkthroughStep = {
  id: "final_outcome",
  title: "Ask Talk what was decided",
  body: "Conditional interview for fictional HelioGrid with remaining security condition - language and screens agree.",
  why: "The loop closes without founder narration.",
  doNext: "Open Talk and ask what was decided.",
  ctaLabel: "Open Talk",
  ctaTo: "/app",
  testId: "walkthrough-step-outcome",
  targetContract: [
    "[data-testid='ambient-otzar-bar'], [data-testid='employee-shell-main']",
  ],
  facets: ["provider_honesty"],
};

/**
 * Full 12-step YC application-review journey for all roles.
 * Route list intentionally reuses some screens with different copy -
 * step index is NEVER derived from route alone (see FirstUseReveal).
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

/** Pure path for navigation (strip query for pathname compares). */
export function walkthroughPathname(ctaTo: string): string {
  const q = ctaTo.indexOf("?");
  return q >= 0 ? ctaTo.slice(0, q) : ctaTo;
}
