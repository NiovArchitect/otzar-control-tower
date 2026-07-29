// FILE: work-buckets.ts
// PURPOSE: Employee My Work lanes — Do now / Waiting / Otzar is handling /
//          Suggested work / Done. Never mix suggested with active waiting.
// CONNECTS TO: MyWork, TeamWork, WorkLedgerItem, human-work-title.

import type { WorkLedgerEntryView } from "@/lib/types/foundation";
import {
  isVagueWorkTitle,
  workClarityState,
} from "@/lib/work-os/human-work-title";

export type HumanWorkBucket =
  | "Do now"
  | "Waiting"
  | "Otzar is handling"
  | "Suggested work"
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

export function bucketFor(entry: WorkLedgerEntryView): HumanWorkBucket {
  if (entry.ledger_type === "MEETING") return "Meetings";
  const st = entry.status ?? "";
  if (DONE.has(st)) return "Done";

  const clarity = workClarityState(entry);
  if (clarity === "Suggested work" || st === "PROPOSED" || isVagueWorkTitle(entry.title)) {
    return "Suggested work";
  }
  if (clarity === "Otzar is handling") return "Otzar is handling";
  if (clarity === "Waiting on someone") return "Waiting";
  if (clarity === "Needs your decision") return "Do now";
  // Ready confirmed work the user can act on.
  return "Do now";
}

/** Signal-first order: act → wait → handling → decide later → history. */
export const BUCKET_ORDER: readonly HumanWorkBucket[] = [
  "Do now",
  "Waiting",
  "Otzar is handling",
  "Suggested work",
  "Meetings",
  "Done",
] as const;

export const COLLAPSED_BY_DEFAULT: ReadonlySet<string> = new Set([
  "Done",
  "Meetings",
  "Suggested work",
]);

/** Short lane subtitles for the page header of each section. */
export function bucketSubtitle(bucket: HumanWorkBucket): string {
  switch (bucket) {
    case "Do now":
      return "Confirmed work you can act on now.";
    case "Waiting":
      return "Blocked on someone else, evidence, or an event.";
    case "Otzar is handling":
      return "Otzar is clarifying, coordinating, or drafting.";
    case "Suggested work":
      return "Possible work from communication — not active until accepted.";
    case "Done":
      return "Recently completed.";
    case "Meetings":
      return "Scheduled meetings linked to your work.";
  }
}
