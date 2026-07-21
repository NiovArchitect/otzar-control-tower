// FILE: walkthrough.ts
// PURPOSE: A-04/A-08 — versioned, role-aware first-use walkthrough plan.
//          A-08 v2: every role includes org-state pointer, provider honesty,
//          and one real AI action (≤3 steps). Dual completion local+server.
// CONNECTS TO: FirstUseReveal, correctionMemory API, FOUNDER A-04/A-08.

export const WALKTHROUGH_VERSION = "v2" as const;

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
  /** Real product path — never a dead route. */
  ctaLabel: string;
  ctaTo: string;
  testId: string;
  /** A-08 facet tags for proof inventory. */
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

const AI_ACTION: WalkthroughStep = {
  id: "ai_action",
  title: "One real AI action",
  body: "Open Talk and ask what needs you or draft a follow-up. You approve what leaves — Otzar does not freestyle outbound.",
  ctaLabel: "Open Talk",
  ctaTo: "/app/voice",
  testId: "walkthrough-step-talk",
  facets: ["ai_action"],
};

const PROVIDER_HONESTY: WalkthroughStep = {
  id: "provider_honesty",
  title: "Provider honesty",
  body: "Tools shows Google Meet, Calendar, and Docs connection state. Stale scopes are honest — reconnect when needed.",
  ctaLabel: "Open Tools",
  ctaTo: "/app/connector-health",
  testId: "walkthrough-step-tools",
  facets: ["provider_honesty"],
};

/**
 * A-08 cinematic plan: ≤3 steps, every role has org_state + provider + AI.
 * ADHD one-shot, not a tour maze.
 */
export function walkthroughStepsFor(role: WalkthroughRole): WalkthroughStep[] {
  switch (role) {
    case "administrator":
      return [
        {
          id: "org",
          title: "See how work reports",
          body: "People shows your real reporting structure — who reports to whom — so Otzar routes work correctly.",
          ctaLabel: "Open People",
          ctaTo: "/app/collaboration",
          testId: "walkthrough-step-org",
          facets: ["org_state"],
        },
        PROVIDER_HONESTY,
        AI_ACTION,
      ];
    case "executive":
      return [
        {
          id: "today",
          title: "Today is your command surface",
          body: "Focus holds at most a few decisions from live org state. Glance chips open projects, AI work, and Needs me.",
          ctaLabel: "Stay on Today",
          ctaTo: "/app",
          testId: "walkthrough-step-today",
          facets: ["org_state"],
        },
        PROVIDER_HONESTY,
        AI_ACTION,
      ];
    case "manager":
      return [
        {
          id: "team",
          title: "Your people and open work",
          body: "People shows reporting lines from live org state. Needs me holds approvals and stuck work for your team.",
          ctaLabel: "Open People",
          ctaTo: "/app/collaboration",
          testId: "walkthrough-step-people",
          facets: ["org_state"],
        },
        PROVIDER_HONESTY,
        AI_ACTION,
      ];
    case "contractor":
      return [
        {
          id: "needs",
          title: "Your scoped work",
          body: "Needs me shows only what you’re allowed to act on from live org state. Otzar stays inside your boundaries.",
          ctaLabel: "Open Needs me",
          ctaTo: "/app/action-center",
          testId: "walkthrough-step-needs",
          facets: ["org_state"],
        },
        PROVIDER_HONESTY,
        AI_ACTION,
      ];
    case "employee":
    default:
      return [
        {
          id: "needs",
          title: "What needs you",
          body: "Approvals, replies, and stuck items from live org state land in Needs me — start here when in doubt.",
          ctaLabel: "Open Needs me",
          ctaTo: "/app/action-center",
          testId: "walkthrough-step-needs",
          facets: ["org_state"],
        },
        PROVIDER_HONESTY,
        AI_ACTION,
      ];
  }
}

export function walkthroughMarker(version: string = WALKTHROUGH_VERSION): string {
  return `otzar_first_use_walkthrough:${version}:done`;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
