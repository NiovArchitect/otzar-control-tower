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

/** [C.3b] Whether Drive (or projection) reports a post-claim edit. */
export function twinWorkEditDetected(
  twin: TwinWorkProjection | undefined | null,
): boolean {
  if (twin == null) return false;
  return (
    twin.edit_detected === true || twin.edit_signal === "MODIFIED_AFTER_CLAIM"
  );
}

/** Ids with an open doc link — candidates for edit detection. */
export function twinWorkDocClaimIds(items: WorkLedgerEntryView[]): string[] {
  return items
    .filter(
      (e) =>
        isActiveTwinWork(e.twin_work) &&
        typeof e.twin_work?.web_view_link === "string" &&
        e.twin_work.web_view_link.length > 0,
    )
    .map((e) => e.ledger_entry_id);
}
