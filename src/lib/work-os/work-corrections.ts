// FILE: work-corrections.ts
// PURPOSE: Phase 3D — capture the user's CORRECTIONS to Otzar's work
//          interpretation and apply them to the current review/tracking flow.
//          Corrections are learning signals, not one-off fixes — but this seed
//          stays HONEST: it applies locally to the active proposed actions and
//          (best-effort) persists a minimal correction via the existing governed
//          rail; it NEVER claims global learning, NEVER mutates production data
//          structure, NEVER auto-sends after a correction.
// CONNECTS TO: transcript-actions (TranscriptProposedAction), AmbientOtzarBar
//          (handler + governed api.otzar.correction persistence),
//          tests/unit/work-corrections.test.ts.

import type { TranscriptProposedAction } from "./transcript-actions";

export type WorkCorrectionKind =
  | "owner_correction"
  | "target_correction"
  | "due_date_correction"
  | "kind_correction"
  | "not_blocked"
  | "not_follow_up"
  | "tone_preference"
  | "interruption_preference"
  | "context_alias"
  | "unknown";

export interface WorkCorrection {
  kind: WorkCorrectionKind;
  rawText: string;
  itemRef?: string;
  ownerName?: string;
  targetName?: string;
  dueHint?: string;
  newKind?: "blocker" | "follow_up" | "decision" | "risk" | "open_question";
  preferenceText?: string;
  confidence: number;
  scope: "current_flow" | "future_preference_candidate";
}

export interface CorrectionApplyResult {
  applied: boolean;
  message: string;
  actions?: TranscriptProposedAction[];
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

// WHAT: Detect and classify a correction. Returns null when the text is not a
//        correction. Patterns are specific to avoid hijacking normal commands.
export function detectCorrection(text: string): WorkCorrection | null {
  const t = text.trim();
  const base = { rawText: t, confidence: 0.8 } as const;

  let m: RegExpMatchArray | null;

  // Target correction must be checked before owner ("send that to X, not Y").
  if ((m = t.match(/\bsend\s+(?:that|this|it)\s+to\s+([A-Z][a-z]+)\b/i)) !== null) {
    return { ...base, kind: "target_correction", targetName: m[1]!, scope: "current_flow" };
  }
  if (
    (m = t.match(/\bno,?\s+([A-Z][a-z]+)\s+owns?\s+(?:that|this|it)\b/i)) !== null
  ) {
    return { ...base, kind: "owner_correction", ownerName: m[1]!, scope: "current_flow" };
  }
  if (
    (m = t.match(
      /\b(?:that'?s|this\s+is|it'?s|that\s+is)\s+due\s+(.+?)[.?!]*$/i,
    )) !== null
  ) {
    return { ...base, kind: "due_date_correction", dueHint: m[1]!.trim(), scope: "current_flow" };
  }
  if (/\b(?:that'?s|that\s+is|it'?s)\s+not\s+blocked(?:\s+anymore)?\b/i.test(t)) {
    return { ...base, kind: "not_blocked", scope: "current_flow" };
  }
  if (/\bdon'?t\s+mark\s+(?:that|this|it)\s+as\s+a\s+follow.?up\b/i.test(t)) {
    return { ...base, kind: "not_follow_up", scope: "current_flow" };
  }
  if (/\b(?:that|this|it)\s+should\s+be\s+a\s+blocker\b/i.test(t)) {
    return { ...base, kind: "kind_correction", newKind: "blocker", scope: "current_flow" };
  }
  if (/\b(?:that|this|it)\s+should\s+be\s+a\s+follow.?up\b/i.test(t)) {
    return { ...base, kind: "kind_correction", newKind: "follow_up", scope: "current_flow" };
  }
  if (/\bdon'?t\s+interrupt\s+me\s+for\s+that\b/i.test(t)) {
    return { ...base, kind: "interruption_preference", preferenceText: t, scope: "future_preference_candidate" };
  }
  if ((m = t.match(/\buse\s+a\s+warmer\s+tone\s+with\s+([A-Z][a-z]+)/i)) !== null) {
    return { ...base, kind: "tone_preference", preferenceText: m[1]!, scope: "future_preference_candidate" };
  }
  if ((m = t.match(/\bwhen\s+i\s+say\s+(.+?),\s+i\s+mean\s+(.+?)[.?!]*$/i)) !== null) {
    return { ...base, kind: "context_alias", preferenceText: `${m[1]!.trim()} = ${m[2]!.trim()}`, scope: "future_preference_candidate" };
  }
  return null;
}

function isBlockerSource(a: TranscriptProposedAction): boolean {
  return a.sourceKind === "blocker" || a.sourceKind === "risk";
}
function isFollowUpSource(a: TranscriptProposedAction): boolean {
  return (
    a.sourceKind === "commitment" ||
    a.sourceKind === "follow_up" ||
    a.sourceKind === "decision"
  );
}

// The actions a correction could apply to (narrowed by kind so "that" is less
// ambiguous: not_blocked → blockers, not_follow_up → follow-ups, etc.).
function candidateSet(
  c: WorkCorrection,
  live: TranscriptProposedAction[],
): TranscriptProposedAction[] {
  switch (c.kind) {
    case "not_blocked":
      return live.filter(isBlockerSource);
    case "not_follow_up":
      return live.filter(isFollowUpSource);
    case "kind_correction":
      return c.newKind === "blocker"
        ? live.filter(isFollowUpSource)
        : live.filter(isBlockerSource);
    default:
      return live;
  }
}

function applyToAction(
  c: WorkCorrection,
  a: TranscriptProposedAction,
): TranscriptProposedAction {
  switch (c.kind) {
    case "owner_correction":
      return { ...a, ownerName: c.ownerName! };
    case "target_correction":
      return { ...a, targetName: c.targetName! };
    case "due_date_correction":
      return { ...a, dueHint: c.dueHint! };
    case "not_blocked":
      return { ...a, sourceKind: "follow_up", kind: "save_follow_up", title: "Follow-up" };
    case "not_follow_up":
      return { ...a, status: "dismissed" };
    case "kind_correction":
      if (c.newKind === "blocker") {
        return {
          ...a,
          sourceKind: "blocker",
          kind:
            a.ownerName !== undefined || a.targetName !== undefined
              ? "send_request"
              : "mark_blocker",
          title: "Blocker",
        };
      }
      return { ...a, sourceKind: "follow_up", kind: "save_follow_up", title: "Follow-up" };
    default:
      return a;
  }
}

function confirmMessage(c: WorkCorrection): string {
  switch (c.kind) {
    case "owner_correction":
      return `Updated: ${c.ownerName} owns that.`;
    case "target_correction":
      return `Updated: I'll send that to ${c.targetName} when you're ready.`;
    case "due_date_correction":
      return `Updated: due ${c.dueHint}.`;
    case "not_blocked":
      return "Got it. I won't treat that as blocked here.";
    case "not_follow_up":
      return "Got it. I removed that follow-up.";
    case "kind_correction":
      return c.newKind === "blocker"
        ? "Updated: marked that as a blocker."
        : "Updated: marked that as a follow-up.";
    default:
      return "Updated.";
  }
}

// WHAT: Preference corrections don't target an item — honest local confirmation.
export function preferenceMessage(c: WorkCorrection): string {
  switch (c.kind) {
    case "interruption_preference":
      return "Got it. I'll treat that as a preference for this workflow.";
    case "tone_preference":
      return `Got it. I'll use a warmer tone with ${c.preferenceText} here.`;
    case "context_alias":
      return "Got it. I'll keep that in mind for this workflow.";
    default:
      return "Got it.";
  }
}

// WHAT: Apply a correction to the current proposed actions.
// INPUT: the correction + the current actions.
// OUTPUT: applied? + a human message + (when applied) the updated actions, or a
//         single focused clarification when "that" is ambiguous.
export function applyCorrection(
  correction: WorkCorrection,
  actions: ReadonlyArray<TranscriptProposedAction>,
): CorrectionApplyResult {
  if (correction.scope === "future_preference_candidate") {
    return { applied: true, message: preferenceMessage(correction) };
  }
  const live = actions.filter((a) => a.status !== "dismissed");
  const candidates = candidateSet(correction, live);
  if (candidates.length === 0) {
    return {
      applied: false,
      message: "I'm not sure which item you mean.",
      needsClarification: true,
      clarificationQuestion: "Which item should I correct?",
    };
  }
  if (candidates.length > 1) {
    return {
      applied: false,
      message: "There's more than one item that could be.",
      needsClarification: true,
      clarificationQuestion: "Which item should I update?",
    };
  }
  const target = candidates[0]!;
  const updated = actions.map((a) =>
    a.id === target.id ? applyToAction(correction, a) : a,
  );
  return { applied: true, message: confirmMessage(correction), actions: updated };
}
