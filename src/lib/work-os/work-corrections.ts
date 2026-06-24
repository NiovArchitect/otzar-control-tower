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
import type {
  TwinCorrectionType,
  TwinCorrectionScopeType,
  TwinCorrectionState,
} from "@/lib/types/foundation";

export type WorkCorrectionKind =
  | "owner_correction"
  | "target_correction"
  | "due_date_correction"
  | "stale_supersession"
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

// Phase 3E — local, in-session correction history with honest persistence state.
export type CorrectionPersistenceStatus =
  | "local_applied"
  | "persisted"
  | "persistence_failed"
  | "preference_candidate"
  | "typed_preference_persisted";

export interface WorkCorrectionHistoryItem {
  id: string;
  correctionKind: WorkCorrectionKind;
  rawText: string;
  appliedMessage: string;
  scope: "current_flow" | "future_preference_candidate";
  persistenceStatus: CorrectionPersistenceStatus;
  createdAt: string;
}

// WHAT: Map a work correction to the governed TwinCorrectionMemory type so it
//        persists with the right typed meaning (EDX-5 / Foundation #274).
export function correctionTypeFor(kind: WorkCorrectionKind): TwinCorrectionType {
  switch (kind) {
    case "tone_preference":
      return "TONE_PREFERENCE";
    case "interruption_preference":
      return "PREFERENCE";
    case "context_alias":
      return "TERMINOLOGY_DEFINITION";
    default:
      return "MEANING_CLARIFICATION";
  }
}

// Phase 4B — human labels for the typed correction-memory readback (no backend
// enum names, no raw ids, no global-learning claims).
export function correctionTypeLabel(t: TwinCorrectionType): string {
  switch (t) {
    case "TONE_PREFERENCE":
      return "Tone preference";
    case "PREFERENCE":
      return "Preference";
    case "TERMINOLOGY_DEFINITION":
      return "Terminology";
    case "MEANING_CLARIFICATION":
      return "Meaning clarification";
    case "ASK_BEFORE_ACTING":
      return "Ask-before-acting preference";
    case "APPROVAL_PREFERENCE":
      return "Approval preference";
    case "PROJECT_PREFERENCE":
      return "Project preference";
    case "CLIENT_CONTEXT":
      return "Client context";
    case "DO_NOT_USE_CONTEXT":
      return "Do-not-use context";
    case "SENSITIVITY_BOUNDARY":
      return "Sensitivity boundary";
    default:
      return "Correction";
  }
}

export function correctionScopeLabel(s: TwinCorrectionScopeType): string {
  switch (s) {
    case "PERSONAL":
      return "Personal";
    case "CONVERSATION":
      return "Conversation";
    case "PROJECT":
      return "Project";
    case "TEAM":
      return "Team";
    case "ROLE":
      return "Role";
    case "ORG":
      return "Organization";
  }
}

export function correctionStateLabel(s: TwinCorrectionState): string {
  switch (s) {
    case "ACTIVE":
      return "Active";
    case "REVOKED":
      return "Revoked";
    case "EXPIRED":
      return "Expired";
    default:
      return "Saved";
  }
}

// WHAT: A human, honest label for a persistence status (no backend terms,
//        no global-learning claims).
export function persistenceStatusLabel(s: CorrectionPersistenceStatus): string {
  switch (s) {
    case "local_applied":
      return "Applied here";
    case "persisted":
      return "Saved as correction evidence";
    case "typed_preference_persisted":
      return "Saved as preference evidence";
    case "preference_candidate":
      return "Preference for this workflow";
    case "persistence_failed":
      return "Applied here (couldn't save evidence)";
  }
}

// Indefinite pronouns / collective words that look like a Name but are NOT a
// person — so "Someone should take that" / "They own this" fall through to the
// vague-endpoint guard, never a bogus owner_correction with ownerName="Someone".
const NOT_A_PERSON = new Set([
  "someone", "somebody", "anyone", "anybody", "everyone", "everybody", "nobody",
  "noone", "they", "them", "we", "you", "i", "it", "this", "that", "the", "team",
  "people", "everything", "something", "anything", "leadership", "management",
  "who", "whoever", "he", "she",
]);
function isLikelyName(s: string | undefined): s is string {
  return s !== undefined && /^[A-Z][a-z]+$/.test(s) && !NOT_A_PERSON.has(s.toLowerCase());
}
// A date-ish hint disambiguates "Use Monday, not Friday" (due change) from
// "Use the latest decision, not the old one" (supersession).
const DATEISH =
  /\b(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day|today|tomorrow|tonight|next\s+\w+|this\s+(?:week|month|morning|afternoon|evening)|by\s+\w+|end\s+of\s+\w+|\d{1,2}(?:st|nd|rd|th)?|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i;
function looksLikeDate(s: string): boolean {
  return DATEISH.test(s.trim());
}
// Try each pattern; return the first capture that is a real person name.
function firstName(t: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = t.match(re);
    if (m !== null && isLikelyName(m[1])) return m[1];
  }
  return null;
}

// WHAT: Detect and classify a correction. Returns null when the text is not a
//        correction. Patterns are specific to avoid hijacking normal commands;
//        indefinite "names" (Someone/They/…) are rejected so vague work falls
//        through to the endpoint-clarity guard.
export function detectCorrection(text: string): WorkCorrection | null {
  const t = text.trim();
  const base = { rawText: t, confidence: 0.8 } as const;

  let m: RegExpMatchArray | null;

  // Target correction must be checked before owner ("send that to X, not Y").
  if ((m = t.match(/\bsend\s+(?:that|this|it)\s+to\s+([A-Z][a-z]+)\b/i)) !== null && isLikelyName(m[1])) {
    return { ...base, kind: "target_correction", targetName: m[1]!, scope: "current_flow" };
  }

  // Stale → current supersession (checked before "use X not Y" due + before the
  // generic decision-changed forms). HONEST: this asks one focused question; it
  // does not silently mutate persisted work (no safe Work-Ledger update rail).
  if (
    /\bignore\s+the\s+(?:older|old|stale|previous|outdated)\b/i.test(t) ||
    /\buse\s+(?:the\s+)?(?:latest|current|newest|new|most\s+recent)\b[^.]*\bnot\s+the\s+old\b/i.test(t) ||
    /\b(?:that|the|this)\s+(?:decision|plan|note)\s+(?:changed|is\s+(?:wrong|stale|outdated|old))\b/i.test(t) ||
    /\b(?:this|that)\s+supersedes?\s+the\s+old\b/i.test(t) ||
    /\bwe\s+changed\s+direction\b/i.test(t) ||
    /\b(?:the\s+)?(?:latest|current)\s+meeting\s+(?:overrides?|changed)\b/i.test(t) ||
    /\buse\s+what\s+we\s+just\s+decided\b/i.test(t) ||
    /\bcurrent\s+context\s+wins\b/i.test(t) ||
    /\bdon'?t\s+use\s+the\s+(?:old|older|stale)\b/i.test(t)
  ) {
    return { ...base, kind: "stale_supersession", confidence: 0.7, scope: "current_flow" };
  }

  // Owner / responsibility correction — broadened natural variants. Each name is
  // gated by isLikelyName (rejects Someone/They/We/…).
  {
    const owner = firstName(t, [
      /\bno,?\s+([A-Z][a-z]+)\s+owns?\s+(?:that|this|it)\b/i,
      /\b([A-Z][a-z]+)\s+owns?\s+(?:it|this|that)\b/i,
      /\bmake\s+([A-Z][a-z]+)\s+the\s+owner\b/i,
      /\bassign\s+(?:it|this|that)\s+to\s+([A-Z][a-z]+)\b/i,
      /\bchange\s+the\s+owner\s+to\s+([A-Z][a-z]+)\b/i,
      /\b(?:it|this|that)\s+belongs?\s+(?:to|with)\s+([A-Z][a-z]+)\b/i,
      /\b(?:actually,?\s+)?([A-Z][a-z]+)\s+is\s+responsible\b/i,
      /\bput\s+([A-Z][a-z]+)\s+on\s+(?:it|this|that)\b/i,
      /\bgive\s+(?:it|this|that)\s+to\s+([A-Z][a-z]+)\b/i,
      /\b([A-Z][a-z]+)\s+should\s+(?:take|own|have)\s+(?:it|this|that)\b/i,
      /\bmove\s+ownership\s+to\s+([A-Z][a-z]+)\b/i,
      /\b(?:that|this|it)\s+should\s+be\s+on\s+([A-Z][a-z]+)\b/i,
    ]);
    if (owner !== null) {
      return { ...base, kind: "owner_correction", ownerName: owner, scope: "current_flow" };
    }
  }

  // Due-date / schedule correction — canonical + natural variants.
  if (
    (m = t.match(
      /\b(?:that'?s|this\s+is|it'?s|that\s+is)\s+due\s+(.+?)[.?!]*$/i,
    )) !== null
  ) {
    return { ...base, kind: "due_date_correction", dueHint: m[1]!.trim(), scope: "current_flow" };
  }
  if (
    (m = t.match(/\b(?:update|move|change|push|reschedule)\b[^]*?\bfrom\s+\w+\s+to\s+([A-Za-z0-9 ]+?)[.?!]*$/i)) !== null &&
    looksLikeDate(m[1]!)
  ) {
    return { ...base, kind: "due_date_correction", dueHint: m[1]!.trim(), scope: "current_flow" };
  }
  if (
    (m = t.match(/\b(?:the\s+)?(?:deadline|due\s+date|date)\s+(?:is|changed\s+to|moved\s+to|'s)\s+([A-Za-z0-9 ]+?)[.?!]*$/i)) !== null
  ) {
    return { ...base, kind: "due_date_correction", dueHint: m[1]!.replace(/\bnow\b\s*$/i, "").trim(), scope: "current_flow" };
  }
  if ((m = t.match(/\buse\s+([A-Za-z0-9 ]+?),?\s+not\s+\w+\b/i)) !== null && looksLikeDate(m[1]!)) {
    return { ...base, kind: "due_date_correction", dueHint: m[1]!.trim(), scope: "current_flow" };
  }
  if ((m = t.match(/\bpush\s+(?:that|this|it)\s+to\s+([A-Za-z0-9 ]+?)[.?!]*$/i)) !== null && looksLikeDate(m[1]!)) {
    return { ...base, kind: "due_date_correction", dueHint: m[1]!.trim(), scope: "current_flow" };
  }

  if (
    /\b(?:that'?s|that\s+is|it'?s)\s+not\s+blocked(?:\s+anymore)?\b/i.test(t) ||
    /\bno\s+longer\s+blocked\b/i.test(t) ||
    /\b(?:that|this|the)\s+blocker\s+is\s+(?:cleared|resolved|gone)\b/i.test(t) ||
    (m = t.match(/\b([A-Z][a-z]+)\s+is\s+unblocked\b/i)) !== null && isLikelyName(m?.[1])
  ) {
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
  // Stale→current supersession: we never silently mutate persisted work (no safe
  // update rail) — ask one focused question so the user names what changed.
  if (correction.kind === "stale_supersession") {
    const hasDecision = actions.some(
      (a) => a.status !== "dismissed" && a.sourceKind === "decision",
    );
    return {
      applied: false,
      message: "I'll use the current context here, not the older note.",
      needsClarification: true,
      clarificationQuestion: hasDecision
        ? "Which decision should I update?"
        : "What should replace the old decision?",
    };
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
