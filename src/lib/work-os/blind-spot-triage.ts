// FILE: blind-spot-triage.ts
// PURPOSE: PROD-UX — triage ordering for the blind-spot backlog so a 200+
//          item feed never lands as an equal-weight wall. Purely reuses the
//          P0R routing projection (no second priority system): lanes that
//          need a HUMAN first (identity review, blocked, setup, approval),
//          then notify/draft lanes, then the silent tail; ties break oldest-
//          first so nothing rots at the bottom.
// CONNECTS TO: src/pages/app/BlindSpots.tsx, tests/unit/blind-spot-triage.test.ts.

import type { RoutingLane, WorkLedgerEntryView } from "@/lib/types/foundation";

/** Lower = more urgent. Unknown/absent routing sorts with the silent tail. */
const LANE_PRIORITY: Readonly<Record<RoutingLane, number>> = {
  identity_review: 0,
  blocked: 1,
  setup_required: 2,
  ask_approval: 3,
  escalate: 3,
  notify_owner: 4,
  draft_ready: 5,
  execute_when_allowed: 6,
  silent_routing: 7,
  silent_capture: 8,
};

export function triagePriority(entry: WorkLedgerEntryView): number {
  const lane = entry.routing?.lane;
  return lane !== undefined ? (LANE_PRIORITY[lane] ?? 8) : 8;
}

// WHAT: order a blind-spot backlog for humane triage.
// OUTPUT: a NEW array — human-needed lanes first, oldest first within a lane.
export function triageBlindSpots(entries: WorkLedgerEntryView[]): WorkLedgerEntryView[] {
  return [...entries].sort((a, b) => {
    const p = triagePriority(a) - triagePriority(b);
    if (p !== 0) return p;
    return a.created_at.localeCompare(b.created_at); // oldest first
  });
}

/** How many items render before the "Show all" affordance. */
export const TRIAGE_INITIAL_COUNT = 25;
