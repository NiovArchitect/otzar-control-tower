// FILE: work-buckets.ts
// PURPOSE: Human work states for My Work — not backend categories.
//          To do · In progress · Waiting · Needs review · Done (+ meetings).
// CONNECTS TO: MyWork, TeamWork, WorkLedgerItem.

import type { WorkLedgerEntryView } from "@/lib/types/foundation";

export type HumanWorkBucket =
  | "Needs review"
  | "To do"
  | "In progress"
  | "Waiting"
  | "Done"
  | "Meetings";

const DONE = new Set([
  "COMPLETED",
  "SUCCEEDED",
  "CLOSED",
  "DONE",
  "CANCELLED",
  "EXECUTED",
]);

const WAITING = new Set([
  "BLOCKED",
  "RUNTIME_MISSING",
  "WAITING",
  "PENDING_EXTERNAL",
  "NEEDS_INPUT",
]);

const IN_PROGRESS = new Set(["EXECUTING", "IN_PROGRESS", "ACTIVE", "RUNNING"]);

const NEEDS_REVIEW = new Set([
  "NEEDS_APPROVAL",
  "NEEDS_REVIEW",
  "PROPOSED",
  "AWAITING_APPROVAL",
]);

export function bucketFor(entry: WorkLedgerEntryView): HumanWorkBucket {
  if (entry.ledger_type === "MEETING") return "Meetings";
  const st = entry.status ?? "";
  if (DONE.has(st)) return "Done";
  if (entry.blind_spot_reason !== undefined) return "Needs review";
  if (NEEDS_REVIEW.has(st) || st.startsWith("NEEDS_")) return "Needs review";
  if (WAITING.has(st) || st.includes("WAIT")) return "Waiting";
  if (IN_PROGRESS.has(st)) return "In progress";
  if (entry.ledger_type === "FOLLOW_UP" || entry.ledger_type === "COMMITMENT") {
    return "To do";
  }
  if (entry.ledger_type === "TASK") return "To do";
  return "To do";
}

/** Human-first order: what needs the person, then flow, then done. */
export const BUCKET_ORDER: readonly HumanWorkBucket[] = [
  "Needs review",
  "To do",
  "In progress",
  "Waiting",
  "Meetings",
  "Done",
] as const;

export const COLLAPSED_BY_DEFAULT: ReadonlySet<string> = new Set([
  "Done",
  "Meetings",
]);
