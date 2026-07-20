// FILE: focus-truth.ts
// PURPOSE: B-02 — every Today Focus card carries why + exact object link.
//          Pure builders so unit tests assert card truth without full DOM.
// CONNECTS TO: AmbientWorkSurface, FOUNDER register B-02.

export type FocusTone = "attention" | "working" | "ambient";

export interface FocusTruthItem {
  key: string;
  title: string;
  /** Short secondary line (may equal why). */
  detail: string | null;
  /** Human reason this card is on Focus right now. */
  why: string;
  /** Deep link to the exact object or its owning queue. */
  to: string | null;
  /** Stable object id when the card is one concrete work object. */
  objectId: string | null;
  tone: FocusTone;
  actionLabel: string | null;
  testId: string;
}

export function focusApprovals(count: number): FocusTruthItem {
  return {
    key: "approvals",
    title:
      count === 1 ? "1 approval is waiting" : `${count} approvals are waiting`,
    detail: null,
    why: "From your open approval queue — Needs me.",
    to: "/app/action-center?lane=approvals",
    objectId: null,
    tone: "attention",
    actionLabel: null,
    testId: "needs-approvals",
  };
}

export function focusBlindSpots(count: number): FocusTruthItem {
  return {
    key: "blind",
    title:
      count === 1
        ? "1 item is stuck and needs a decision"
        : `${count} items are stuck and need a decision`,
    detail: null,
    why: "From urgent stuck work (blind spots) in Needs me.",
    to: "/app/action-center",
    objectId: null,
    tone: "attention",
    actionLabel: null,
    testId: "needs-blind-spots",
  };
}

export function focusReplies(count: number): FocusTruthItem {
  return {
    key: "replies",
    title:
      count === 1 ? "1 reply to review" : `${count} replies to review`,
    detail: null,
    why: "Unread replies waiting in Comms.",
    to: "/app/comms",
    objectId: null,
    tone: "working",
    actionLabel: null,
    testId: "needs-replies",
  };
}

export function focusNextBestStep(input: {
  title: string;
  reason: string | null;
  routeHint: string | null;
}): FocusTruthItem {
  return {
    key: "nbs",
    title: input.title,
    detail: input.reason,
    why: input.reason?.trim()
      ? input.reason
      : "Otzar named this as the next best step for you.",
    to: input.routeHint || "/app/action-center",
    objectId: null,
    tone: "attention",
    actionLabel: null,
    testId: "dgi-next-best-step",
  };
}

export function focusHandoff(input: {
  handoffId: string;
  title: string;
  summary: string | null;
}): FocusTruthItem {
  return {
    key: `handoff-${input.handoffId}`,
    title: input.title,
    detail: input.summary,
    why: "Incoming handoff waiting for your acknowledge.",
    to: `/app/action-center?handoff=${encodeURIComponent(input.handoffId)}`,
    objectId: input.handoffId,
    tone: "working",
    actionLabel: "Acknowledge",
    testId: "ambient-handoff-row",
  };
}

export function focusTwinWork(input: {
  ledgerEntryId: string;
  title: string;
  stateLabel: string;
  needsVerify: boolean;
}): FocusTruthItem {
  return {
    key: `twin-${input.ledgerEntryId}`,
    title: input.title,
    detail: input.stateLabel,
    why: input.needsVerify
      ? "AI Teammate claim needs your verification."
      : "AI Teammate work needs your attention.",
    to: input.needsVerify
      ? null
      : `/app/my-work?ledger=${encodeURIComponent(input.ledgerEntryId)}`,
    objectId: input.ledgerEntryId,
    tone: "working",
    actionLabel: input.needsVerify ? "Verify" : "Open",
    testId: "twin-working-row",
  };
}

export function focusTwinBlocked(eligibleCount: number): FocusTruthItem {
  return {
    key: "blocked",
    title: `${eligibleCount} AI Teammates linked — pick one`,
    detail: "Otzar will not blend them.",
    why: "Multiple Twins linked; pairing must be explicit.",
    to: "/app/my-twin",
    objectId: null,
    tone: "attention",
    actionLabel: null,
    testId: "dgi-twin-blocked",
  };
}

export function focusTwinUnpaired(): FocusTruthItem {
  return {
    key: "unpaired",
    title: "No AI Teammate paired yet",
    detail: "Pair a Twin for governed organizational intelligence.",
    why: "DGI requires a paired AI Teammate for org intelligence.",
    to: "/app/my-twin",
    objectId: null,
    tone: "working",
    actionLabel: null,
    testId: "dgi-twin-unpaired",
  };
}

export function focusHeadline(title: string): FocusTruthItem {
  return {
    key: "headline",
    title,
    detail: null,
    why: "From your day intelligence headline.",
    to: "/app/action-center",
    objectId: null,
    tone: "ambient",
    actionLabel: null,
    testId: "changed-headline",
  };
}

export function focusSuggestion(rank: number, title: string): FocusTruthItem {
  return {
    key: `sug-${rank}`,
    title,
    detail: null,
    why: "From day intelligence suggestions.",
    to: "/app",
    objectId: null,
    tone: "ambient",
    actionLabel: null,
    testId: "changed-suggestion",
  };
}
