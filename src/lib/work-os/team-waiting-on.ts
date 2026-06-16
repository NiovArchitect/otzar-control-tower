// FILE: team-waiting-on.ts
// PURPOSE: Phase 1285-G — pure helpers for the Team Work "Waiting on team"
//          panel. Derive directional relationship state (who is waiting on
//          whom) from REAL Work Ledger entries — filter to active directional
//          asks, group by owner, format age. Pure + unit-tested so the manager
//          view can never silently drift or fabricate state.
// CONNECTS TO: src/pages/app/TeamWork.tsx, tests/unit/team-waiting-on.test.ts.

import type { WorkLedgerEntryView } from "@/lib/types/foundation";

// Directional work types — one person waiting on another (mirrors the backend
// TRACKABLE_LEDGER_TYPES set).
export const DIRECTIONAL_TYPES = new Set([
  "TASK",
  "FOLLOW_UP",
  "APPROVAL",
  "BLOCKER",
  "DECISION",
]);

// Statuses that mean the ask is done — it drops out of the waiting-on panel.
export const DONE_STATUSES = new Set(["EXECUTED", "VERIFIED", "CANCELLED", "EXPIRED"]);

// WHAT: true when this entry is an ACTIVE directional ask (someone is waiting
//        on someone else). WHY: powers the "Waiting on team" panel; completion
//        (EXECUTED) drops the item.
export function isWaitingOnItem(e: WorkLedgerEntryView): boolean {
  return (
    DIRECTIONAL_TYPES.has(e.ledger_type) &&
    e.owner_entity_id !== null &&
    e.requester_entity_id !== null &&
    e.owner_entity_id !== e.requester_entity_id &&
    !DONE_STATUSES.has(e.status)
  );
}

export interface OwnerGroup {
  owner_entity_id: string;
  name: string;
  items: WorkLedgerEntryView[];
}

// WHAT: group active directional asks by OWNER (the person being waited on).
// OUTPUT: ordered groups; each carries the owner's display name (never a raw
//         UUID label — falls back to a neutral phrase if unresolved).
export function groupWaitingByOwner(entries: WorkLedgerEntryView[]): OwnerGroup[] {
  const byOwner = new Map<string, OwnerGroup>();
  for (const e of entries) {
    if (!isWaitingOnItem(e)) continue;
    const key = e.owner_entity_id as string;
    if (!byOwner.has(key)) {
      byOwner.set(key, {
        owner_entity_id: key,
        name: e.owner_display_name ?? "a teammate",
        items: [],
      });
    }
    byOwner.get(key)!.items.push(e);
  }
  return [...byOwner.values()];
}

// WHAT: human-readable age from an ISO created_at, relative to `now`.
// WHY: "3d" / "5h" / "just now" — no raw timestamps in the panel.
export function ageOf(createdAt: string, now: number = Date.now()): string {
  const then = Date.parse(createdAt);
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((now - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
