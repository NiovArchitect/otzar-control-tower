// FILE: walkthrough.ts
// PURPOSE: A-04 — versioned, role-aware first-use walkthrough plan.
//          Completion is dual-written: localStorage + Twin PREFERENCE
//          correction (server-side marker) so version bumps re-show.
// CONNECTS TO: FirstUseReveal, correctionMemory API, FOUNDER register A-04.

export const WALKTHROUGH_VERSION = "v1" as const;

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

/** Max 3 steps — ADHD one-shot, not a tour maze. */
export function walkthroughStepsFor(role: WalkthroughRole): WalkthroughStep[] {
  const commonTalk: WalkthroughStep = {
    id: "talk",
    title: "Talk to Otzar",
    body: "Ask what needs you, what’s blocked, or draft a follow-up. You approve what leaves.",
    ctaLabel: "Open Talk",
    ctaTo: "/app/voice",
    testId: "walkthrough-step-talk",
  };

  switch (role) {
    case "administrator":
      return [
        {
          id: "org",
          title: "See how work reports",
          body: "People shows your reporting structure — who reports to whom — so Otzar routes work correctly.",
          ctaLabel: "Open People",
          ctaTo: "/app/collaboration",
          testId: "walkthrough-step-org",
        },
        {
          id: "tools",
          title: "Connect tools",
          body: "Google Meet, Calendar, and Docs power Comms and Today. Reconnect if scopes go stale.",
          ctaLabel: "Open Tools",
          ctaTo: "/app/connector-health",
          testId: "walkthrough-step-tools",
        },
        commonTalk,
      ];
    case "executive":
      return [
        {
          id: "today",
          title: "Today is your command surface",
          body: "Focus holds at most a few decisions. Glance chips open projects, AI work, and Needs me.",
          ctaLabel: "Stay on Today",
          ctaTo: "/app",
          testId: "walkthrough-step-today",
        },
        {
          id: "people",
          title: "Organizational shape",
          body: "Open People to see structure and who can collaborate — without a SaaS admin maze.",
          ctaLabel: "Open People",
          ctaTo: "/app/collaboration",
          testId: "walkthrough-step-people",
        },
        commonTalk,
      ];
    case "manager":
      return [
        {
          id: "team",
          title: "Your people and open work",
          body: "People shows reporting lines. Needs me holds approvals and stuck work for your team.",
          ctaLabel: "Open People",
          ctaTo: "/app/collaboration",
          testId: "walkthrough-step-people",
        },
        {
          id: "needs",
          title: "What needs you",
          body: "Approvals, handoffs, and blockers land in Needs me — not a generic inbox.",
          ctaLabel: "Open Needs me",
          ctaTo: "/app/action-center",
          testId: "walkthrough-step-needs",
        },
        commonTalk,
      ];
    case "contractor":
      return [
        {
          id: "needs",
          title: "Your scoped work",
          body: "Needs me shows only what you’re allowed to act on. Otzar stays inside your boundaries.",
          ctaLabel: "Open Needs me",
          ctaTo: "/app/action-center",
          testId: "walkthrough-step-needs",
        },
        {
          id: "projects",
          title: "Projects you’re on",
          body: "Open a project to see the mission pulse — people, open work, blockers — in one place.",
          ctaLabel: "Open Projects",
          ctaTo: "/app/work-projects",
          testId: "walkthrough-step-projects",
        },
        commonTalk,
      ];
    case "employee":
    default:
      return [
        {
          id: "needs",
          title: "What needs you",
          body: "Approvals, replies, and stuck items land in Needs me — start here when in doubt.",
          ctaLabel: "Open Needs me",
          ctaTo: "/app/action-center",
          testId: "walkthrough-step-needs",
        },
        {
          id: "projects",
          title: "Project mission",
          body: "Projects group people and work so Otzar keeps one mission coherent.",
          ctaLabel: "Open Projects",
          ctaTo: "/app/work-projects",
          testId: "walkthrough-step-projects",
        },
        commonTalk,
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
