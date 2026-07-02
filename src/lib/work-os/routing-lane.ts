// FILE: routing-lane.ts
// PURPOSE: PROD-UX-P0R — present the routing/autonomy decision Foundation
//          attached to a work item (WorkLedgerEntryView.routing) as a calm,
//          human chip + a plain-language why. PURE presentation over the
//          projection — the lane was DECIDED server-side (routing-decision.ts,
//          itself a pure read over the persisted deciders); this module never
//          re-derives a lane and never invents a second autonomy system.
//          Doctrine: ambient calm — the two silent lanes add NO chip noise in
//          the card header (their why still shows in View/Why); every
//          non-silent lane gets one quiet, state-colored chip.
// CONNECTS TO: src/lib/types/foundation.ts (RoutingDecisionView/RoutingLane),
//          src/components/work-os/WorkLedgerItem.tsx (chip + why rendering),
//          tests/unit/routing-lane.test.ts.

import type { RoutingDecisionView, RoutingLane } from "@/lib/types/foundation";

export interface RoutingLaneChip {
  /** Short human label — customer copy, never an enum literal. */
  label: string;
  /** Tone classes matching the cockpit's existing quiet palette. */
  cls: string;
}

// Lane → chip vocabulary. Labels are deliberately short (chip-sized) and use
// only customer terms; the full sentence lives in the decision's `reason`.
const LANE_CHIPS: Readonly<Record<RoutingLane, RoutingLaneChip | null>> = {
  // Silent lanes: calm by design — no header chip (why still in View/Why).
  silent_capture: null,
  silent_routing: null,
  notify_owner: { label: "Waiting on owner", cls: "border-slate-400/50 text-slate-600" },
  draft_ready: { label: "Draft ready", cls: "border-sky-500/50 text-sky-600" },
  execute_when_allowed: { label: "Otzar will handle", cls: "border-sky-500/50 text-sky-600" },
  ask_approval: { label: "Needs your approval", cls: "border-amber-500/60 text-amber-600" },
  escalate: { label: "Awaiting sign-off", cls: "border-amber-500/60 text-amber-600" },
  blocked: { label: "Blocked", cls: "border-rose-500/60 text-rose-600" },
  setup_required: { label: "Needs setup", cls: "border-amber-500/60 text-amber-600" },
  identity_review: { label: "Owner needs review", cls: "border-amber-500/60 text-amber-600" },
};

// WHAT: the header chip for a routing decision — or null for the silent lanes.
// INPUT: the item's routing projection (may be undefined on older payloads).
// OUTPUT: { label, cls } or null (no chip). Never throws on sparse data.
// WHY: one lane → one calm chip; silence stays silent (doctrine: no card spam).
export function routingLaneChip(
  routing: RoutingDecisionView | undefined,
): RoutingLaneChip | null {
  if (routing === undefined) return null;
  return LANE_CHIPS[routing.lane] ?? null;
}

/** One-line risk wording for the why panel (never a bare enum). */
const RISK_LINE: Readonly<Record<RoutingDecisionView["risk"], string>> = {
  low: "Low risk",
  medium: "Medium risk",
  high: "High risk — a person stays in the loop",
};

// PROD-MODEL-P5 §19 — the card's ambient left edge, driven by the SAME lane
// the chip uses (never decoration). Attention lanes come forward; assist
// lanes hint; silent lanes recede to the neutral border.
const LANE_EDGES: Readonly<Record<RoutingLane, string>> = {
  silent_capture: "border-l-border/60",
  silent_routing: "border-l-border/60",
  notify_owner: "border-l-slate-300",
  draft_ready: "border-l-sky-300/80",
  execute_when_allowed: "border-l-sky-300/80",
  ask_approval: "border-l-amber-400/80",
  escalate: "border-l-amber-400/80",
  blocked: "border-l-rose-400/80",
  setup_required: "border-l-amber-400/80",
  identity_review: "border-l-amber-400/80",
};

// WHAT: the ambient left-edge class for a work card.
// OUTPUT: a border-l color class; undefined routing → the neutral edge.
export function routingLaneEdge(routing: RoutingDecisionView | undefined): string {
  if (routing === undefined) return "border-l-border/60";
  return LANE_EDGES[routing.lane] ?? "border-l-border/60";
}

export interface RoutingWhyLine {
  /** The plain-language decision sentence (server-humanized). */
  reason: string;
  /** "Low risk" / "Medium risk" / "High risk — …". */
  risk: string;
  /** The suggested next step, when the projection carries one. */
  nextBestAction: string | null;
}

// WHAT: the View/Why lines for a routing decision.
// INPUT: the routing projection (undefined → null: the panel renders nothing).
// OUTPUT: reason + risk wording + optional next step. policy_basis /
//         required_tool raw tokens are NOT surfaced here — they are audit/
//         Advanced material, not normal-flow copy.
// WHY: "why is this in this lane" must read like a sentence a colleague
//      would say, and must never leak backend vocabulary.
export function routingWhyLine(
  routing: RoutingDecisionView | undefined,
): RoutingWhyLine | null {
  if (routing === undefined) return null;
  return {
    reason: routing.reason,
    risk: RISK_LINE[routing.risk],
    nextBestAction: routing.next_best_action,
  };
}
