// FILE: transcript-actions.ts
// PURPOSE: Phase 3B — turn a transcript DIGEST (Phase 3A) into REVIEWABLE
//          proposed actions. Transcript-derived work should become proposals
//          the human approves/sends/saves/dismisses — NOT invisible automation
//          and NOT a raw list. Deterministic + honest (confidence carried).
//          No fake completion: nothing is "done" until the user acts and a
//          governed rail confirms it.
// CONNECTS TO: transcript-intelligence (TranscriptDigest), TranscriptActionReview
//          (the calm card UI), AmbientOtzarBar (handlers),
//          tests/unit/transcript-actions.test.ts.

import type {
  TranscriptDigest,
  TranscriptWorkItem,
  TranscriptWorkItemKind,
} from "./transcript-intelligence";

export type TranscriptProposedActionKind =
  | "save_follow_up"
  | "assign_owner"
  | "send_request"
  | "mark_blocker"
  | "ask_clarification";

export type TranscriptProposedActionStatus =
  | "proposed"
  // [OTZAR-LIVE-6] in-flight states — give the card immediate feedback while the
  // governed save/send round-trips, then resolve to a terminal status.
  | "saving"
  | "sending"
  | "approved"
  | "saved"
  | "sent"
  | "dismissed"
  | "blocked";

export interface TranscriptContextRef {
  type: string;
  id: string;
  label: string;
}

export interface TranscriptProposedAction {
  id: string;
  kind: TranscriptProposedActionKind;
  title: string;
  body: string;
  sourceKind: TranscriptWorkItemKind;
  ownerName?: string;
  targetName?: string;
  dueHint?: string;
  confidence: number;
  contextRef?: TranscriptContextRef;
  status: TranscriptProposedActionStatus;
}

// The short label shown on a card by source kind.
const KIND_LABEL: Record<TranscriptWorkItemKind, string> = {
  decision: "Decision",
  blocker: "Blocker",
  commitment: "Commitment",
  follow_up: "Follow-up",
  risk: "Risk",
  open_question: "Open question",
};

// WHAT: Map one work item to its proposed-action kind.
//        commitments/follow-ups/decisions → save_follow_up;
//        a blocker/risk with a named owner → send_request (someone owns it),
//        otherwise mark_blocker; open questions → ask_clarification.
function actionKindFor(
  item: TranscriptWorkItem,
): TranscriptProposedActionKind {
  switch (item.kind) {
    case "commitment":
    case "follow_up":
    case "decision":
      return "save_follow_up";
    case "blocker":
    case "risk":
      return item.ownerName !== undefined || item.targetName !== undefined
        ? "send_request"
        : "mark_blocker";
    case "open_question":
      return "ask_clarification";
  }
}

// WHAT: Convert a digest into ordered, reviewable proposed actions. Each carries
//        its source kind, owner/due hints, confidence, and (optionally) the
//        context reference, starting in "proposed" status.
// INPUT: the digest + an optional context reference to attach.
// OUTPUT: TranscriptProposedAction[] — empty when the digest had no work.
export function digestToProposedActions(
  digest: TranscriptDigest,
  contextRef?: TranscriptContextRef,
): TranscriptProposedAction[] {
  // Order: decisions, then follow-ups/commitments, then blockers, risks,
  // open questions — most-actionable first, questions last.
  const ordered: TranscriptWorkItem[] = [
    ...digest.decisions,
    ...digest.commitments,
    ...digest.followUps,
    ...digest.blockers,
    ...digest.risks,
    ...digest.openQuestions,
  ];

  return ordered.map((item, i) => {
    const kind = actionKindFor(item);
    return {
      id: `pa-${i + 1}`,
      kind,
      title: KIND_LABEL[item.kind],
      body: item.text,
      sourceKind: item.kind,
      ...(item.ownerName !== undefined ? { ownerName: item.ownerName } : {}),
      ...(item.targetName !== undefined ? { targetName: item.targetName } : {}),
      ...(item.dueHint !== undefined ? { dueHint: item.dueHint } : {}),
      confidence: item.confidence,
      ...(contextRef !== undefined ? { contextRef } : {}),
      status: "proposed" as const,
    };
  });
}

// WHAT: A compact, human count line for the orb outcome.
export function proposedActionsCount(
  actions: ReadonlyArray<TranscriptProposedAction>,
): string {
  const n = actions.length;
  if (n === 0) {
    return "I didn't find any clear next actions in that text.";
  }
  return `I found ${n} proposed action${n === 1 ? "" : "s"} from this meeting.`;
}
