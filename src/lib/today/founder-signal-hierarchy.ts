// FILE: founder-signal-hierarchy.ts
// PURPOSE: YC / founder-grade Today signal hierarchy — lead with operating
//          story, demote raw communication volume. Pure builders for tests.
// CONNECTS TO: AmbientWorkSurface, composeHomeBands, focus-truth.

export type FounderSignalLane =
  | "primary_objective"
  | "otzar_handled"
  | "needs_founder"
  | "team_movement"
  | "communications";

export interface FounderSignalItem {
  key: string;
  title: string;
  detail?: string;
  to?: string;
  testId: string;
  lane: FounderSignalLane;
}

export interface FounderSignalInput {
  /** DGI next best step when real (not idle). */
  nextDecisionTitle: string | null;
  nextDecisionReason: string | null;
  nextDecisionRoute: string | null;
  /** Completed governed action sample. */
  completedActionTitle: string | null;
  completedActionTo: string | null;
  /** Completed AI collaboration sample. */
  completedCollabTitle: string | null;
  completedCollabTo: string | null;
  failedActionTitle: string | null;
  failedActionTo: string | null;
  /** Approvals / blind spots / handoffs (material). */
  approvalsCount: number;
  blindSpotCount: number;
  openHandoffCount: number;
  handoffTitle: string | null;
  /** Unread communication volume — demoted, never primary alone. */
  communicationReplyCount: number;
  /** Team movement samples: name + open work label. */
  teamSamples: Array<{ name: string; openLabel: string }>;
  /** Tools reconnect if real. */
  toolsReconnectLabel: string | null;
  /** Org truth conflicts. */
  truthConflictCount: number;
}

/**
 * WHAT: Build ordered founder Today lanes for YC-clear first screen.
 * INPUT: Real counts and samples only (no invented activity).
 * OUTPUT: Lanes with items; communications always last and collapsed.
 * WHY: Judges and founders must see problem→completion→decision in 10s,
 *      not "19 replies".
 */
export function buildFounderSignalLanes(
  input: FounderSignalInput,
): Array<{ lane: FounderSignalLane; label: string; items: FounderSignalItem[] }> {
  const primary: FounderSignalItem[] = [];
  if (input.nextDecisionTitle) {
    primary.push({
      key: "primary-objective",
      title: input.nextDecisionTitle,
      detail:
        input.nextDecisionReason?.trim() ||
        "Primary decision Otzar named for you right now.",
      to: input.nextDecisionRoute ?? "/app/action-center",
      testId: "founder-primary-objective",
      lane: "primary_objective",
    });
  } else if (input.truthConflictCount > 0) {
    primary.push({
      key: "primary-truth",
      title:
        input.truthConflictCount === 1
          ? "1 company truth conflict needs a decision"
          : `${input.truthConflictCount} company truth conflicts need a decision`,
      detail: "Resolve before the team runs on conflicting facts.",
      to: "/app/action-center",
      testId: "founder-primary-truth",
      lane: "primary_objective",
    });
  } else {
    primary.push({
      key: "primary-calm",
      title: "Governed work is in motion",
      detail:
        "Otzar keeps humans in control of what AI can know and do — review completed work below.",
      to: "/app/action-center?tab=completed",
      testId: "founder-primary-calm",
      lane: "primary_objective",
    });
  }

  const handled: FounderSignalItem[] = [];
  if (input.completedActionTitle) {
    handled.push({
      key: "handled-action",
      title: `Completed: ${input.completedActionTitle}`,
      detail: "Governed action finished with verification path on Needs me.",
      to: input.completedActionTo ?? "/app/action-center?tab=completed",
      testId: "founder-handled-action",
      lane: "otzar_handled",
    });
  }
  if (input.completedCollabTitle) {
    handled.push({
      key: "handled-collab",
      title: `AI Teammates collaborated: ${input.completedCollabTitle}`,
      detail: "Who / why / result — open the collaboration receipt.",
      to: input.completedCollabTo ?? "/app/collaboration",
      testId: "founder-handled-collab",
      lane: "otzar_handled",
    });
  }
  if (input.failedActionTitle) {
    handled.push({
      key: "handled-failed",
      title: `Failed (not completed): ${input.failedActionTitle}`,
      detail: "Honest failure — no fake success. Retry or correct on Needs me.",
      to: input.failedActionTo ?? "/app/action-center?tab=blocked",
      testId: "founder-handled-failed",
      lane: "otzar_handled",
    });
  }

  const needs: FounderSignalItem[] = [];
  if (input.approvalsCount > 0) {
    needs.push({
      key: "needs-approvals",
      title:
        input.approvalsCount === 1
          ? "1 approval is waiting"
          : `${input.approvalsCount} approvals are waiting`,
      detail: "Human approval required for consequential work.",
      to: "/app/action-center?tab=pending",
      testId: "founder-needs-approvals",
      lane: "needs_founder",
    });
  }
  if (input.blindSpotCount > 0) {
    needs.push({
      key: "needs-blind",
      title:
        input.blindSpotCount === 1
          ? "1 stuck decision needs you"
          : `${input.blindSpotCount} stuck decisions need you`,
      detail: "Work is blocked until a human chooses.",
      to: "/app/action-center",
      testId: "founder-needs-blind",
      lane: "needs_founder",
    });
  }
  if (input.openHandoffCount > 0) {
    needs.push({
      key: "needs-handoff",
      title: input.handoffTitle
        ? `Handoff waiting: ${input.handoffTitle}`
        : `${input.openHandoffCount} handoff${input.openHandoffCount === 1 ? "" : "s"} waiting`,
      detail: "Acknowledge so ownership is clear.",
      to: "/app/action-center",
      testId: "founder-needs-handoff",
      lane: "needs_founder",
    });
  }
  if (input.toolsReconnectLabel) {
    needs.push({
      key: "needs-tools",
      title: input.toolsReconnectLabel,
      detail: "Connector access is not fully usable until reconnected.",
      to: "/app/connector-health?need=reconnect&from=today",
      testId: "founder-needs-tools",
      lane: "needs_founder",
    });
  }

  const team: FounderSignalItem[] = input.teamSamples.slice(0, 5).map((t, i) => ({
    key: `team-${i}-${t.name}`,
    title: t.name,
    detail: t.openLabel,
    to: "/app/collaboration",
    testId: `founder-team-${i}`,
    lane: "team_movement" as const,
  }));

  const communications: FounderSignalItem[] = [];
  if (input.communicationReplyCount > 0) {
    communications.push({
      key: "comms-collapsed",
      title:
        input.communicationReplyCount === 1
          ? "1 communication thread to review later"
          : `${input.communicationReplyCount} communication replies (grouped)`,
      detail:
        "Comms are secondary. Expand only after operating signals above.",
      to: "/app/comms",
      testId: "founder-comms-collapsed",
      lane: "communications",
    });
  }

  const lanes: Array<{
    lane: FounderSignalLane;
    label: string;
    items: FounderSignalItem[];
  }> = [
    {
      lane: "primary_objective",
      label: "What matters now",
      items: primary.slice(0, 1),
    },
    {
      lane: "otzar_handled",
      label: "What Otzar completed",
      items: handled.slice(0, 3),
    },
    {
      lane: "needs_founder",
      label: "What needs a decision",
      items: needs.slice(0, 3),
    },
    {
      lane: "team_movement",
      label: "Team movement",
      items: team.slice(0, 5),
    },
    {
      lane: "communications",
      label: "Communications (secondary)",
      items: communications,
    },
  ];

  return lanes.filter((l) => l.items.length > 0);
}

/**
 * WHAT: Collapse raw reply counts into a secondary signal copy line.
 * INPUT: Unread reply count from presence store.
 * OUTPUT: Human summary — never "N replies" as the only Today headline.
 */
export function collapseCommunicationSignal(count: number): string {
  if (count <= 0) return "No unread communications";
  if (count === 1) return "1 communication reply (secondary)";
  return `${count} communication replies — grouped under Communications, not the primary story`;
}
