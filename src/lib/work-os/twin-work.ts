// FILE: twin-work.ts
// PURPOSE: [C.3] Pure helpers for AI Teammate work-claim rows on my-work —
//          which states count as "Twin is on this" for Today, accuracy labels.
// CONNECTS TO: AmbientWorkSurface, WorkLedgerItem, WorkLedgerEntryView.twin_work.

import type { TwinWorkProjection, WorkLedgerEntryView } from "@/lib/types/foundation";

/** In-flight Twin claim states that should surface on Today (not COMPLETED). */
const ACTIVE_TWIN_STATES = new Set([
  "CLAIMED_WORKING",
  "NEEDS_CLARITY",
  "COLLAB_REQUESTED",
]);

export function isActiveTwinWork(
  twin: TwinWorkProjection | undefined | null,
): boolean {
  if (twin == null) return false;
  return ACTIVE_TWIN_STATES.has(twin.state);
}

export function activeTwinWorkItems(
  items: WorkLedgerEntryView[],
): WorkLedgerEntryView[] {
  return items.filter((e) => isActiveTwinWork(e.twin_work));
}

export function twinWorkStateLabel(state: string): string {
  switch (state) {
    case "CLAIMED_WORKING":
      return "Working on this";
    case "NEEDS_CLARITY":
      return "Needs a quick check from you";
    case "COLLAB_REQUESTED":
      return "Needs collaboration";
    case "COMPLETED":
      return "Finished";
    default:
      return state.replace(/_/g, " ").toLowerCase();
  }
}

export function twinAccuracyLabel(accuracy: string): string | null {
  switch (accuracy) {
    case "REGULATED_HEALTH":
      return "Clinical accuracy";
    case "REGULATED_FINANCE":
      return "Financial accuracy";
    case "INSURANCE":
      return "Insurance accuracy";
    case "STANDARD":
      return null;
    default:
      return null;
  }
}
