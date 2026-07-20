// FILE: what-changed.ts
// PURPOSE: B-04 — "What changed" from real state only. Never invents team
//          activity. Missing integrations named specifically.
// CONNECTS TO: AmbientWorkSurface, FOUNDER register B-04.

export type WhatChangedKind =
  | "handoff"
  | "attention"
  | "blocker"
  | "twin"
  | "integration"
  | "truth"
  | "quiet";

export interface WhatChangedItem {
  kind: WhatChangedKind;
  title: string;
  /** Why this line is on the strip (source of truth). */
  why: string;
  /** Product path when the human can open the object. */
  to: string | null;
  testId: string;
}

export interface WhatChangedInput {
  openHandoffCount: number;
  handoffSampleTitles: string[];
  attentionCount: number;
  blockedOrUnpaired: boolean;
  twinWorkingCount: number;
  toolsReconnectLabel: string | null;
  truthConflictCount: number;
  teamOpenSample: string | null;
}

/**
 * Build ≤4 real change lines. Quiet when nothing real changed.
 * Integration lines always name the specific reconnect need when present.
 */
export function buildWhatChanged(input: WhatChangedInput): WhatChangedItem[] {
  const out: WhatChangedItem[] = [];

  if (input.toolsReconnectLabel) {
    out.push({
      kind: "integration",
      title: input.toolsReconnectLabel,
      why: "OAuth/catalog reports reconnect needed — not a fake Connected status.",
      to: "/app/connector-health?need=reconnect&from=today",
      testId: "what-changed-integration",
    });
  }

  if (input.truthConflictCount > 0) {
    out.push({
      kind: "truth",
      title:
        input.truthConflictCount === 1
          ? "1 org truth conflict needs review"
          : `${input.truthConflictCount} org truth conflicts need review`,
      why: "From DGI open_org_truth_conflicts_count.",
      to: "/app/action-center",
      testId: "what-changed-truth",
    });
  }

  if (input.blockedOrUnpaired) {
    out.push({
      kind: "blocker",
      title: "AI Teammate pairing needs a fix",
      why: "DGI coherence BLOCKED or UNPAIRED.",
      to: "/app/my-twin",
      testId: "what-changed-pairing",
    });
  }

  if (input.openHandoffCount > 0) {
    const sample = input.handoffSampleTitles[0];
    out.push({
      kind: "handoff",
      title:
        input.openHandoffCount === 1
          ? sample
            ? `Handoff waiting: ${sample}`
            : "1 handoff waiting"
          : `${input.openHandoffCount} handoffs waiting`,
      why: "Incoming handoffs from the server, not a static feed.",
      to: "/app/action-center",
      testId: "what-changed-handoff",
    });
  }

  if (input.twinWorkingCount > 0) {
    out.push({
      kind: "twin",
      title:
        input.twinWorkingCount === 1
          ? "1 AI Teammate item needs you"
          : `${input.twinWorkingCount} AI Teammate items need you`,
      why: "From my-work twin_work projection.",
      to: "/app/my-work",
      testId: "what-changed-twin",
    });
  }

  if (input.attentionCount > 0 && out.length < 3) {
    out.push({
      kind: "attention",
      title:
        input.attentionCount === 1
          ? "1 item needs attention"
          : `${input.attentionCount} items need attention`,
      why: "From DGI attention_count.",
      to: "/app/action-center",
      testId: "what-changed-attention",
    });
  }

  if (input.teamOpenSample && out.length < 4) {
    out.push({
      kind: "handoff",
      title: `Team: ${input.teamOpenSample}`,
      why: "Sample from team-work open load (real state).",
      to: "/app/collaboration",
      testId: "what-changed-team",
    });
  }

  if (out.length === 0) {
    out.push({
      kind: "quiet",
      title: "Nothing new since your last quiet window",
      why: "No handoffs, attention, twin work, truth conflicts, or reconnect needs.",
      to: null,
      testId: "what-changed-quiet",
    });
  }

  return out.slice(0, 4);
}
