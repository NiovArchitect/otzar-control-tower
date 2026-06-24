// FILE: work-nodes.ts
// PURPOSE: [OTZAR-LIVE-6] A small, REAL node model for the ambient surface. Each
//          node is grounded ONLY in current state the orb already holds — the
//          people in the active request, the draft/request itself, approvals
//          waiting, replies received, the current context, saved corrections.
//          There are NO decorative nodes: a node exists iff its backing state
//          exists. Presence intensity governs each node's priority/accent. The
//          orb renders this collapsed by default (a "Work nodes · N" chip); when
//          there is no real state there are no nodes and nothing renders.
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx (collapsed node strip),
//          tests/unit/work-nodes.test.ts, src/lib/stores/presence.ts (intensity).

import type { PresenceIntensity } from "@/lib/stores/presence";

export type WorkNodeKind =
  | "person"
  | "request"
  | "approval"
  | "reply"
  | "context"
  | "correction";

export interface WorkNode {
  id: string;
  kind: WorkNodeKind;
  /** Short human label (a name, a count, a context title). */
  label: string;
  /** One glance: what it's connected to / whether it needs attention. */
  detail: string;
  intensity: PresenceIntensity;
}

// The real state the nodes are built from — passed in by the orb so this stays
// pure + unit-testable. Every field maps to an existing rail.
export interface WorkNodeInputs {
  /** Teammates in the active request (pendingClarification.recipients). */
  recipients: string[];
  /** True while Otzar is waiting for the user to name the recipient. */
  awaitingRecipient: boolean;
  /** The active draft/proposal (pendingArtifact), or null. */
  draft: {
    targetLabel: string | null;
    proposed: boolean;
    externalChannel: boolean;
  } | null;
  /** Active current-surface-context title, or null. */
  contextTitle: string | null;
  /** Approvals waiting on the user (presence.approvalsCount). */
  approvalsCount: number;
  /** Unread replies/notes (presence.unreadCount). */
  unreadCount: number;
  /** Active saved corrections (not revoked). */
  correctionsActive: number;
}

const RANK: Record<PresenceIntensity, number> = {
  critical: 0,
  attention: 1,
  working: 2,
  ambient: 3,
};

// WHAT: Build the list of REAL work nodes from current state. Empty when nothing
//       is in flight. Sorted so the nodes that most need the human come first.
export function buildWorkNodes(i: WorkNodeInputs): WorkNode[] {
  const nodes: WorkNode[] = [];
  const seen = new Set<string>();

  // People in the active request — recipients held, plus a single-recipient
  // draft target. Real names only (no demo/placeholder fallback).
  const persons = [...i.recipients];
  if (i.draft?.targetLabel != null) persons.push(i.draft.targetLabel);
  for (const p of persons) {
    const key = p.trim().toLowerCase();
    if (key.length === 0 || seen.has(`person:${key}`)) continue;
    seen.add(`person:${key}`);
    nodes.push({
      id: `person:${key}`,
      kind: "person",
      label: p.trim(),
      detail: i.awaitingRecipient ? "Naming this recipient" : "In the current request",
      intensity: i.awaitingRecipient ? "attention" : "working",
    });
  }

  // The draft / request itself.
  if (i.draft != null) {
    nodes.push({
      id: "request",
      kind: "request",
      label: i.draft.proposed
        ? "Pending approval"
        : i.draft.externalChannel
          ? "Draft (local)"
          : "Draft ready",
      detail: i.draft.proposed ? "Waiting on an approver" : "Ready when you are",
      intensity: i.draft.proposed ? "attention" : "working",
    });
  }

  // Approvals waiting on the user.
  if (i.approvalsCount > 0) {
    nodes.push({
      id: "approval",
      kind: "approval",
      label: i.approvalsCount === 1 ? "1 approval" : `${i.approvalsCount} approvals`,
      detail: "Needs your decision",
      intensity: "attention",
    });
  }

  // Replies / notes received.
  if (i.unreadCount > 0) {
    nodes.push({
      id: "reply",
      kind: "reply",
      label: i.unreadCount === 1 ? "1 new reply" : `${i.unreadCount} new replies`,
      detail: "From your team",
      intensity: "working",
    });
  }

  // Current context.
  if (i.contextTitle != null && i.contextTitle.trim().length > 0) {
    nodes.push({
      id: "context",
      kind: "context",
      label: i.contextTitle.trim(),
      detail: "Current context",
      intensity: "ambient",
    });
  }

  // Saved corrections shaping the workflow.
  if (i.correctionsActive > 0) {
    nodes.push({
      id: "correction",
      kind: "correction",
      label:
        i.correctionsActive === 1
          ? "1 saved correction"
          : `${i.correctionsActive} saved corrections`,
      detail: "Shaping your workflow",
      intensity: "ambient",
    });
  }

  // Most-needed nodes first; stable within a tier.
  return nodes
    .map((n, idx) => [n, idx] as const)
    .sort(([a, ai], [b, bi]) =>
      RANK[a.intensity] !== RANK[b.intensity]
        ? RANK[a.intensity] - RANK[b.intensity]
        : ai - bi,
    )
    .map(([n]) => n);
}
