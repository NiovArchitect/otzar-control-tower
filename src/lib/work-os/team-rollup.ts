// FILE: team-rollup.ts
// PURPOSE: CX-SLICE-1 — the manager's operating-state rollup for Team Work:
//          what each direct report owns, what is unowned/escalated, blocked/
//          needs-setup, waiting on approval, and recently completed — computed
//          PURELY from the already-loaded (paginated) team-work entries + the
//          REAL hierarchy manager edges. No fake analytics: when more pages
//          exist, the rollup says exactly which slice it covers.
// CONNECTS TO: src/pages/app/TeamWork.tsx, lib/org (manager edges),
//              tests/unit/team-rollup.test.ts.

import type {
  Entity,
  EntityMembership,
  WorkLedgerEntryView,
} from "@/lib/types/foundation";

export interface DirectReportRollup {
  entity_id: string;
  name: string;
  open: number;
  blocked: number;
  approvals: number;
}

export interface TeamRollup {
  /** Present only when the caller was resolved AND has manager edges. */
  directReports: DirectReportRollup[] | null;
  unownedOrEscalated: number;
  blockedOrSetup: number;
  approvalsNeeded: number;
  recentlyCompleted: number;
  /** Honest coverage note when pagination means more exists ("first N items"). */
  coverage: string | null;
}

const OPEN_EXCLUDED = new Set(["EXECUTED", "VERIFIED", "CANCELLED", "EXPIRED"]);
const APPROVAL_LANES = new Set(["ask_approval", "escalate"]);
const BLOCKED_LANES = new Set(["blocked", "setup_required"]);
const UNOWNED_LANES = new Set(["identity_review"]);

function laneOf(e: WorkLedgerEntryView): string {
  return e.routing?.lane ?? "";
}

// WHAT: compute the Team Work rollup.
// INPUT: loaded entries (the current pages), the caller's email, the people
//        list, hierarchy memberships, the org root id, and whether more pages
//        exist. All optional inputs degrade honestly (null sections, never
//        invented numbers).
export function buildTeamRollup(input: {
  entries: WorkLedgerEntryView[];
  callerEmail: string | null;
  people: Entity[];
  memberships: EntityMembership[];
  orgEntityId: string | null;
  hasMore: boolean;
}): TeamRollup {
  const { entries } = input;
  const approvalsNeeded = entries.filter(
    (e) => APPROVAL_LANES.has(laneOf(e)) || e.status === "NEEDS_APPROVAL",
  ).length;
  const blockedOrSetup = entries.filter(
    (e) => BLOCKED_LANES.has(laneOf(e)) || e.status === "BLOCKED" || e.status === "RUNTIME_MISSING",
  ).length;
  const unownedOrEscalated = entries.filter(
    (e) =>
      UNOWNED_LANES.has(laneOf(e)) ||
      e.status === "NEEDS_OWNER" ||
      (e.owner_entity_id === null && !OPEN_EXCLUDED.has(e.status)),
  ).length;
  const recentlyCompleted = entries.filter((e) => e.status === "EXECUTED").length;

  // Direct reports: caller resolved by email (stable id from the people
  // list), reports = active person→person manager edges under the caller.
  let directReports: DirectReportRollup[] | null = null;
  const email = input.callerEmail?.trim().toLowerCase() ?? "";
  const self =
    email.length > 0
      ? input.people.find((p) => (p.email ?? "").toLowerCase() === email)
      : undefined;
  if (self !== undefined && input.orgEntityId !== null) {
    const reportEdges = input.memberships.filter(
      (m) => m.is_active && m.parent_id === self.entity_id,
    );
    if (reportEdges.length > 0) {
      const nameOf = new Map(input.people.map((p) => [p.entity_id, p.display_name] as const));
      directReports = reportEdges
        .filter((m) => nameOf.has(m.child_id))
        .map((m) => {
          const theirs = entries.filter((e) => e.owner_entity_id === m.child_id);
          return {
            entity_id: m.child_id,
            name: nameOf.get(m.child_id) ?? "Unknown",
            open: theirs.filter((e) => !OPEN_EXCLUDED.has(e.status)).length,
            blocked: theirs.filter(
              (e) => BLOCKED_LANES.has(laneOf(e)) || e.status === "BLOCKED",
            ).length,
            approvals: theirs.filter(
              (e) => APPROVAL_LANES.has(laneOf(e)) || e.status === "NEEDS_APPROVAL",
            ).length,
          };
        })
        .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name));
    }
  }

  return {
    directReports,
    unownedOrEscalated,
    blockedOrSetup,
    approvalsNeeded,
    recentlyCompleted,
    coverage: input.hasMore
      ? `Based on the first ${entries.length} items — load more below for the full picture.`
      : null,
  };
}
