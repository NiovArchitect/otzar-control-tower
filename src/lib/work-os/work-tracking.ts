// FILE: work-tracking.ts
// PURPOSE: Phase 3C — the first SAFE, read-only tracking layer over
//          transcript-derived work. Derives conservative tracking state from
//          the current proposed actions (Phase 3B) so Otzar can answer "what is
//          blocked?", "who is waiting on whom?", "what follow-ups came out?",
//          "what needs attention?". Honest by construction: NEVER marks
//          anything completed without a real completion signal, NEVER infers
//          "stale" without a real date to compare. No backend mutation, no
//          watchers, no fake completion.
// CONNECTS TO: transcript-actions (TranscriptProposedAction), AmbientOtzarBar
//          (tracking commands), tests/unit/work-tracking.test.ts.

import type { TranscriptProposedAction } from "./transcript-actions";

export type WorkTrackingState =
  | "proposed"
  | "saved"
  | "sent"
  | "approval_pending"
  | "blocked"
  | "needs_owner"
  | "needs_due_date"
  | "stale"
  | "completed_unknown";

export interface WorkTrackingItem {
  id: string;
  title: string;
  source: "transcript_action" | "work_ledger" | "collaboration_request";
  state: WorkTrackingState;
  ownerName?: string;
  dueHint?: string;
  blockerReason?: string;
  waitingOn?: string;
  contextLabel?: string;
  confidence: number;
}

export interface WorkTrackingSummary {
  blockers: WorkTrackingItem[];
  followUps: WorkTrackingItem[];
  waiting: WorkTrackingItem[];
  stale: WorkTrackingItem[];
  needsAttention: WorkTrackingItem[];
  counts: {
    blockers: number;
    followUps: number;
    waiting: number;
    stale: number;
    needsAttention: number;
  };
}

// WHAT: Conservative tracking state for one proposed action.
function stateOf(a: TranscriptProposedAction): WorkTrackingState {
  if (a.status === "sent") return "sent";
  if (a.status === "blocked") return "approval_pending";
  if (a.status === "saved") return "saved";
  // proposed:
  if (a.sourceKind === "blocker" || a.sourceKind === "risk") {
    return a.ownerName === undefined && a.targetName === undefined
      ? "needs_owner"
      : "blocked";
  }
  return "proposed";
}

function toTrackingItem(a: TranscriptProposedAction): WorkTrackingItem {
  const owner = a.ownerName ?? a.targetName;
  const state = stateOf(a);
  return {
    id: a.id,
    title: a.body,
    source: "transcript_action",
    state,
    ...(a.ownerName !== undefined ? { ownerName: a.ownerName } : {}),
    ...(a.dueHint !== undefined ? { dueHint: a.dueHint } : {}),
    ...(a.sourceKind === "blocker" ? { blockerReason: a.body } : {}),
    ...(state === "sent" && owner !== undefined ? { waitingOn: owner } : {}),
    ...(a.contextRef !== undefined ? { contextLabel: a.contextRef.label } : {}),
    confidence: a.confidence,
  };
}

// WHAT: Derive a tracking summary from the current proposed actions.
// INPUT: the proposed actions (Phase 3B); dismissed items are ignored.
// OUTPUT: blockers / follow-ups / waiting / stale / needsAttention + counts.
//         "stale" stays EMPTY — we have no real timestamp to compare honestly.
export function deriveTrackingFromActions(
  actions: ReadonlyArray<TranscriptProposedAction>,
): WorkTrackingSummary {
  const live = actions.filter((a) => a.status !== "dismissed");
  const itemById = new Map<string, WorkTrackingItem>(
    live.map((a) => [a.id, toTrackingItem(a)]),
  );
  const itemOf = (a: TranscriptProposedAction): WorkTrackingItem =>
    itemById.get(a.id)!;
  const items = [...itemById.values()];

  // Categorize by the work item's source kind (a risk/blocker is a blocker; a
  // commitment/follow-up/decision is a follow-up; open questions belong to
  // neither bucket).
  const blockers = live
    .filter((a) => a.sourceKind === "blocker" || a.sourceKind === "risk")
    .map(itemOf);
  const followUps = live
    .filter(
      (a) =>
        a.sourceKind === "commitment" ||
        a.sourceKind === "follow_up" ||
        a.sourceKind === "decision",
    )
    .map(itemOf);
  const waiting = items.filter(
    (i) => i.state === "sent" || i.state === "approval_pending",
  );
  // Honest: no real date signal → no inferred staleness.
  const stale: WorkTrackingItem[] = [];
  const needsAttention = items.filter(
    (i) =>
      i.state === "blocked" ||
      i.state === "needs_owner" ||
      i.state === "approval_pending",
  );

  return {
    blockers,
    followUps,
    waiting,
    stale,
    needsAttention,
    counts: {
      blockers: blockers.length,
      followUps: followUps.length,
      waiting: waiting.length,
      stale: stale.length,
      needsAttention: needsAttention.length,
    },
  };
}

export type TrackingFocus =
  | "blockers"
  | "waiting"
  | "followUps"
  | "needsAttention"
  | "stale"
  | "all";

// WHAT: Detect a tracking query and what it's asking about. Returns null when
//        the text is not a tracking question.
export function detectTrackingCommand(text: string): { focus: TrackingFocus } | null {
  const t = text.toLowerCase();
  if (/\bwhat(?:'s| is| are)?\s+(?:still\s+)?blocked\b/.test(t)) {
    return { focus: "blockers" };
  }
  if (/\bwho(?:'s| is)?\s+waiting\b/.test(t)) {
    return { focus: "waiting" };
  }
  if (
    /\bwhat\s+follow[\s-]?ups?\b/.test(t) ||
    /\bfollow[\s-]?ups?\s+(?:came\s+out|from\s+(?:this|the)\s+meeting)\b/.test(t)
  ) {
    return { focus: "followUps" };
  }
  if (/\bwhat\s+(?:still\s+)?needs?\s+attention\b/.test(t)) {
    return { focus: "needsAttention" };
  }
  if (/\bwhat(?:'s| is| has)?\s+(?:gone\s+)?stale\b/.test(t)) {
    return { focus: "stale" };
  }
  if (
    /\bwhat\s+changed\s+since\s+(?:the\s+)?meeting\b/.test(t) ||
    /\b(?:show\s+(?:me\s+)?the\s+)?tracking\b/.test(t) ||
    /\btrack(?:ing)?\s+(?:from\s+)?(?:this|the)\s+meeting\b/.test(t)
  ) {
    return { focus: "all" };
  }
  return null;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// WHAT: A compact, human, honest tracking answer for the orb outcome line.
export function composeTrackingAnswer(
  s: WorkTrackingSummary,
  focus: TrackingFocus,
): string {
  switch (focus) {
    case "blockers":
      if (s.blockers.length === 0) return "Nothing is blocked right now.";
      return `I found ${plural(s.blockers.length, "blocker")}.`;
    case "waiting": {
      if (s.waiting.length === 0) {
        return "Nobody is waiting on a sent request yet.";
      }
      const named = s.waiting
        .map((i) => i.waitingOn)
        .filter((x): x is string => x !== undefined);
      if (named.length > 0) {
        return `${plural(s.waiting.length, "item")} waiting — on ${[...new Set(named)].join(", ")}.`;
      }
      return `${plural(s.waiting.length, "item")} are waiting on a teammate.`;
    }
    case "followUps":
      if (s.followUps.length === 0) return "No follow-ups from this meeting yet.";
      return `${plural(s.followUps.length, "follow-up")} from this meeting.`;
    case "needsAttention":
      if (s.needsAttention.length === 0) return "Nothing needs your attention right now.";
      return `${plural(s.needsAttention.length, "item")} need${s.needsAttention.length === 1 ? "s" : ""} attention.`;
    case "stale":
      // Honest: we don't infer staleness without a real due date.
      return "I can't tell what's stale yet — I'd need real due dates to compare.";
    case "all": {
      const parts = [
        plural(s.counts.blockers, "blocker"),
        plural(s.counts.followUps, "follow-up"),
        `${plural(s.counts.needsAttention, "item")} needing attention`,
      ];
      return `I found ${parts.join(", ")}.`;
    }
  }
}
