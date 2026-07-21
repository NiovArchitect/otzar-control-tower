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

const CONNECTIONS: WalkthroughStep = {
  id: "connections",
  title: "Tools your organization uses",
  body: "See which apps are connected. If something needs reconnecting, Otzar says so clearly.",
  why: "Documents and meetings only work when tools are connected.",
  doNext: "Open Connections and check Google status.",
  ctaLabel: "Open Connections",
  ctaTo: "/app/connector-health",
  testId: "walkthrough-step-tools",
  targetContract: ["[data-testid='connector-health'], [data-testid='tools-connections']"],
  facets: ["provider_honesty"],
};

const TALK: WalkthroughStep = {
  id: "ai_action",
  title: "Ask Otzar one real question",
  body: "Open Talk and ask what needs you, or draft a follow-up. You approve anything that leaves.",
  why: "Your AI Teammate works from live org context, not a blank chat.",
  doNext: "Open Talk and ask one question about current work.",
  ctaLabel: "Open Talk",
  ctaTo: "/app/voice",
  testId: "walkthrough-step-talk",
  targetContract: ["[data-testid='voice-ready'], [data-testid='ambient-otzar-bar']"],
  facets: ["ai_action"],
};

/**
 * Role-specific paths. ≤3 steps. Plain language.
 */
export function walkthroughStepsFor(role: WalkthroughRole): WalkthroughStep[] {
  switch (role) {
    case "administrator":
      return [
        {
          id: "org",
          title: "Confirm who is in the organization",
          body: "People shows reporting lines and teammates. Confirm the structure, not every setting by hand.",
          why: "Otzar routes work using this structure.",
          doNext: "Open People and scan who reports to whom.",
          ctaLabel: "Open People",
          ctaTo: "/app/collaboration",
          testId: "walkthrough-step-org",
          targetContract: [
            "[data-testid='people-directory'], [data-testid='collaboration-page']",
          ],
          facets: ["org_state"],
        },
        CONNECTIONS,
        TALK,
      ];
    case "executive":
      return [
        {
          id: "today",
          title: "What needs a decision today",
          body: "Home shows what changed, what is blocked, and what Otzar already handled.",
          why: "You steer without chasing status across tools.",
          doNext: "Scan Home for decisions and blockers.",
          ctaLabel: "Stay on Home",
          ctaTo: "/app",
          testId: "walkthrough-step-today",
          targetContract: ["[data-testid='ambient-work-surface'], [data-testid='employee-shell']"],
          facets: ["org_state"],
        },
        CONNECTIONS,
        TALK,
      ];
    case "manager":
      return [
        {
          id: "team",
          title: "Your team and open work",
          body: "People shows your team. Needs me holds approvals and stuck items for them.",
          why: "You unblock people and AI coordination in one place.",
          doNext: "Open People, then check Needs me for exceptions.",
          ctaLabel: "Open People",
          ctaTo: "/app/collaboration",
          testId: "walkthrough-step-people",
          targetContract: [
            "[data-testid='people-directory'], [data-testid='collaboration-page']",
          ],
          facets: ["org_state"],
        },
        CONNECTIONS,
        TALK,
      ];
    case "contractor":
      return [
        {
          id: "needs",
          title: "Work you are allowed to act on",
          body: "Needs me shows only authorized deliverables. Access stays intentionally limited.",
          why: "You stay inside your project scope.",
          doNext: "Open Needs me and open one item.",
          ctaLabel: "Open Needs me",
          ctaTo: "/app/action-center",
          testId: "walkthrough-step-needs",
          targetContract: ["[data-testid='action-center'], [data-testid='employee-shell']"],
          facets: ["org_state"],
        },
        CONNECTIONS,
        TALK,
      ];
    case "employee":
    default:
      return [
        {
          id: "needs",
          title: "What needs you",
          body: "Approvals, replies, and stuck items land in Needs me. Start here when unsure.",
          why: "Your current work is not buried in tools.",
          doNext: "Open Needs me and complete or open one item.",
          ctaLabel: "Open Needs me",
          ctaTo: "/app/action-center",
          testId: "walkthrough-step-needs",
          targetContract: ["[data-testid='action-center'], [data-testid='employee-shell']"],
          facets: ["org_state"],
        },
        CONNECTIONS,
        TALK,
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
