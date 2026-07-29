// FILE: human-work-title.ts
// PURPOSE: Pure helpers for employee-facing work titles and clarity state.
//          Turns generic "Follow up with X" into scannable action titles and
//          flags items that must not sit in active "Waiting on you" work.
// CONNECTS TO: WorkLedgerItem, work-buckets, tests/unit/human-work-title.test.ts.

import type { WorkLedgerEntryView } from "@/lib/types/foundation";

const VAGUE_FOLLOW_UP =
  /^follow\s*up\s+with\s+([A-Za-z][\w'.-]*)\s*$/i;
const VAGUE_GENERIC =
  /^(follow\s*up|check\s*in|touch\s*base|review\s*item|complete\s*checklist|send\s*invite)\s*$/i;

// WHAT: true when the title is a non-actionable generic follow-up.
export function isVagueWorkTitle(title: string): boolean {
  const t = title.trim();
  if (t.length === 0) return true;
  if (VAGUE_FOLLOW_UP.test(t)) return true;
  if (VAGUE_GENERIC.test(t)) return true;
  if (/^follow\s*up\s+with\s+/i.test(t) && t.split(/\s+/).length <= 4) return true;
  return false;
}

// WHAT: employee-facing title — never invents facts; only softens generics.
// INPUT: raw ledger title + optional summary.
// OUTPUT: display title suitable for a card face.
export function humanWorkTitle(
  title: string,
  summary?: string | null,
): string {
  const raw = title.trim();
  if (raw.length === 0) {
    return summary && summary.trim().length > 0
      ? summary.trim().slice(0, 120)
      : "Work item needs a clearer title";
  }
  const m = raw.match(VAGUE_FOLLOW_UP);
  if (m?.[1]) {
    const name = m[1];
    // Do not invent the subject; ask with purpose left open.
    return `Ask ${name} for the update needed to move the review forward`;
  }
  if (VAGUE_GENERIC.test(raw)) {
    if (summary && summary.trim().length > 0) {
      const s = summary.trim();
      return s.length > 100 ? `${s.slice(0, 97)}…` : s;
    }
    return "Clarify this follow-up before it becomes active work";
  }
  return raw;
}

// WHAT: employee clarity state label for My Work lanes / chips.
export type WorkClarityState =
  | "Ready"
  | "Otzar is handling"
  | "Waiting on someone"
  | "Needs your decision"
  | "Suggested work"
  | "Done";

export function workClarityState(entry: WorkLedgerEntryView): WorkClarityState {
  const st = entry.status ?? "";
  if (
    st === "COMPLETED" ||
    st === "SUCCEEDED" ||
    st === "CLOSED" ||
    st === "DONE" ||
    st === "CANCELLED" ||
    st === "EXECUTED"
  ) {
    return "Done";
  }
  if (st === "PROPOSED" || isVagueWorkTitle(entry.title)) {
    return "Suggested work";
  }
  if (
    st === "NEEDS_APPROVAL" ||
    st === "AWAITING_APPROVAL" ||
    st === "NEEDS_REVIEW" ||
    entry.blind_spot_reason !== undefined
  ) {
    return "Needs your decision";
  }
  if (
    st === "EXECUTING" ||
    st === "IN_PROGRESS" ||
    st === "ACTIVE" ||
    st === "RUNNING" ||
    entry.twin_work?.state === "ACTIVE" ||
    entry.coordination?.runtime === "BEAM_DISPATCHED"
  ) {
    return "Otzar is handling";
  }
  if (
    st === "BLOCKED" ||
    st === "WAITING" ||
    st === "PENDING_EXTERNAL" ||
    st === "NEEDS_INPUT" ||
    st === "RUNTIME_MISSING" ||
    st.includes("WAIT")
  ) {
    return "Waiting on someone";
  }
  return "Ready";
}

// WHAT: whether Mark complete is safe for this row (client gate; server still enforces).
export function canMarkCompleteSafely(entry: WorkLedgerEntryView): boolean {
  if (entry.can_complete !== true) return false;
  if (isVagueWorkTitle(entry.title)) return false;
  if ((entry.status ?? "") === "PROPOSED") return false;
  if (workClarityState(entry) === "Suggested work") return false;
  if (workClarityState(entry) === "Otzar is handling") return false;
  return true;
}
