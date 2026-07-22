// FILE: activation-path.ts
// PURPOSE: Founder activation sequence (9 steps) derived from live setup
//          journey + discovery — each step has state, one next action, and
//          a real route. No static decorative pills.
// CONNECTS TO: OrgSetup, setup-journey, org-discovery, tests.

import type { SetupJourney, SectionState } from "@/lib/setup/setup-journey";
import type { OrgDiscoveryView } from "@/lib/setup/org-discovery";

export type ActivationStepState = "ready" | "needs_attention" | "current" | "unknown";

export interface ActivationStep {
  id: string;
  /** 1-based index for display. */
  n: number;
  label: string;
  state: ActivationStepState;
  stateLabel: string;
  /** One line of current truth. */
  detail: string;
  /** One next action. */
  action: { label: string; to: string };
}

export interface ActivationPathView {
  steps: ActivationStep[];
  /** First step that still needs attention, else Ready. */
  focusStepId: string;
}

function mapSectionState(s: SectionState): ActivationStepState {
  if (s === "ready") return "ready";
  if (s === "unknown") return "unknown";
  return "needs_attention";
}

function sectionByKey(journey: SetupJourney, key: string) {
  return journey.sections.find((s) => s.key === key) ?? null;
}

/**
 * Derive the 9-step Organization activation path from existing journey truth.
 * Steps: Organization · People · Structure · Projects · AI Teammates ·
 * Connections · Governance · First workflow · Ready.
 */
export function deriveActivationPath(
  journey: SetupJourney,
  discovery: OrgDiscoveryView,
): ActivationPathView {
  const people = sectionByKey(journey, "people");
  const roles = sectionByKey(journey, "roles");
  const twins = sectionByKey(journey, "twins");
  const tools = sectionByKey(journey, "tools");
  const gov = sectionByKey(journey, "governance");
  const workflows = sectionByKey(journey, "workflows");

  const open = discovery.openSeedCount;
  const orgState: ActivationStepState =
    open > 0 ? "needs_attention" : discovery.available ? "ready" : "unknown";

  const steps: ActivationStep[] = [
    {
      id: "organization",
      n: 1,
      label: "Organization",
      state: orgState,
      stateLabel:
        open > 0
          ? `${open} need review`
          : discovery.available
            ? "Calm"
            : "Loading",
      detail:
        open > 0
          ? "Otzar found items that need your confirmation before anything applies."
          : "Discovery is calm — confirm exceptions as new signals arrive.",
      action:
        open > 0
          ? {
              label: `Review ${open} items`,
              to: "/organization-seeding",
            }
          : { label: "Open discovery", to: "/setup" },
    },
    {
      id: "people",
      n: 2,
      label: "People",
      state: people ? mapSectionState(people.state) : "unknown",
      stateLabel: people?.stateLabel ?? "—",
      detail:
        people?.lines.find((l) => l.kind === "action")?.text ??
        people?.lines[0]?.text ??
        "Invite and activate people with minimum access.",
      action: people?.action ?? { label: "Open Users", to: "/users" },
    },
    {
      id: "structure",
      n: 3,
      label: "Structure",
      state: roles ? mapSectionState(roles.state) : "unknown",
      stateLabel: roles?.stateLabel ?? "—",
      detail:
        roles?.lines.find((l) => l.kind === "action")?.text ??
        roles?.lines[0]?.text ??
        "Confirm managers, teams, and reporting lines.",
      action:
        open > 0 && discovery.reviewCategories.some((c) => c.id === "managers")
          ? { label: "Review managers", to: "/organization-seeding?class=managers" }
          : roles?.action ?? { label: "Review structure", to: "/organization-seeding" },
    },
    {
      id: "projects",
      n: 4,
      label: "Projects",
      state:
        discovery.reviewCategories.some((c) => c.id === "projects" && c.count > 0)
          ? "needs_attention"
          : "ready",
      stateLabel: discovery.reviewCategories.some((c) => c.id === "projects")
        ? `${discovery.reviewCategories.find((c) => c.id === "projects")!.count} to place`
        : "Placement ambient",
      detail: discovery.reviewCategories.some((c) => c.id === "projects")
        ? "Project membership proposals need confirmation."
        : "Project placement can stay ambient for managers; exceptions land in review.",
      action: discovery.reviewCategories.some((c) => c.id === "projects")
        ? { label: "Review projects", to: "/organization-seeding?class=projects" }
        : { label: "Open projects", to: "/app/work-projects" },
    },
    {
      id: "ai-teammates",
      n: 5,
      label: "AI Teammates",
      state: twins ? mapSectionState(twins.state) : "unknown",
      stateLabel: twins?.stateLabel ?? "—",
      detail:
        twins?.lines.find((l) => l.kind === "action")?.text ??
        twins?.lines[0]?.text ??
        "Pair people with governed AI Teammates.",
      action: twins?.action ?? { label: "Open AI Teammates", to: "/ai-teammates" },
    },
    {
      id: "connections",
      n: 6,
      label: "Connections",
      state: tools ? mapSectionState(tools.state) : "unknown",
      stateLabel: tools?.stateLabel ?? "—",
      detail:
        tools?.lines.find((l) => l.kind === "action")?.text ??
        tools?.lines[0]?.text ??
        "Connect tools so Otzar can work with real systems.",
      action: tools?.action ?? {
        label: "Open Connections",
        to: "/tools-connections",
      },
    },
    {
      id: "governance",
      n: 7,
      label: "Governance",
      state: gov ? mapSectionState(gov.state) : "unknown",
      stateLabel: gov?.stateLabel ?? "—",
      detail:
        gov?.lines.find((l) => l.kind === "action")?.text ??
        gov?.lines[0]?.text ??
        "Approvals, audit, and data boundaries stay on by default.",
      action: gov?.action ?? {
        label: "Open Governance",
        to: "/governance",
      },
    },
    {
      id: "first-workflow",
      n: 8,
      label: "First workflow",
      state: workflows ? mapSectionState(workflows.state) : "unknown",
      stateLabel: workflows?.stateLabel ?? "—",
      detail:
        workflows?.lines.find((l) => l.kind === "action")?.text ??
        workflows?.lines[0]?.text ??
        "Prove value with one real governed workflow.",
      action: workflows?.action ?? { label: "Open workflows", to: "/workflows" },
    },
    {
      id: "ready",
      n: 9,
      label: "Ready",
      state:
        journey.summaryState === "ready" && open === 0
          ? "ready"
          : journey.summaryState === "unknown"
            ? "unknown"
            : "needs_attention",
      stateLabel:
        journey.summaryState === "ready" && open === 0
          ? "Ready"
          : "Not yet",
      detail:
        journey.summaryState === "ready" && open === 0
          ? "Organization can run day-to-day with Otzar. Keep reviewing new signals as they appear."
          : journey.nextStep.detail,
      action:
        journey.summaryState === "ready" && open === 0
          ? { label: "Go-live readiness", to: "/setup/go-live" }
          : {
              label: journey.nextStep.linkLabel,
              to: journey.nextStep.to,
            },
    },
  ];

  // Mark the first non-ready step as "current" for focus.
  const focus =
    steps.find((s) => s.state === "needs_attention" || s.state === "unknown") ??
    steps[steps.length - 1]!;
  const withCurrent = steps.map((s) =>
    s.id === focus.id && s.state !== "ready"
      ? { ...s, state: "current" as const }
      : s,
  );

  return { steps: withCurrent, focusStepId: focus.id };
}
