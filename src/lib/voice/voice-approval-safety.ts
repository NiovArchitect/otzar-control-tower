// FILE: voice-approval-safety.ts
// PURPOSE: Phase OTZAR-RETURN-5 — the local voice approval safety layer. Voice
//          must never jump straight from a transcript to an action. This pure,
//          deterministic model classifies each intent route's risk, produces a
//          DRAFT / proposed action, and requires an explicit confirmation step
//          for privileged routes — all LOCAL. It performs no API call, no send,
//          no approval, no task change, and no external write of any kind.
//
// HONESTY INVARIANTS (load-bearing — see docs/ambient-voice-readiness.md):
//   - `external_write_performed` is ALWAYS false in this build. Confirming is
//     local-only; nothing leaves Otzar, nothing is sent/approved/created.
//   - Privileged routes (comms, approval, action_runtime, reminder) are
//     `confirm_required` and cannot execute without confirmation.
//   - `unknown` is `blocked` — Otzar asks for clarification, never guesses an
//     action.
//   - Otzar product safety infra — not AVP², no protocol artifact, no network.

import type { AmbientVoiceIntentRoute } from "@/lib/voice/ambient-voice-capture";

// The route vocabulary is the RETURN-3 intent route, reused verbatim so the
// hint and the safety layer never drift.
export type VoiceSafetyRoute = AmbientVoiceIntentRoute;

export type VoiceSafetyLevel =
  | "informational"
  | "draft_only"
  | "confirm_required"
  | "blocked";

export type VoiceConfirmationState =
  | "not_required"
  | "required"
  | "confirmed"
  | "declined"
  | "expired"
  | "blocked";

export interface VoiceProposedAction {
  action_schema: "OTZAR_VOICE_PROPOSED_ACTION";
  schema_version: "0.1";
  transcript_text: string;
  route: VoiceSafetyRoute;
  safety_level: VoiceSafetyLevel;
  confirmation_state: VoiceConfirmationState;
  proposed_title: string;
  proposed_summary: string;
  proposed_next_step: string;
  /** Always false for confirm_required / blocked routes — they need a confirm. */
  can_execute_without_confirmation: boolean;
  /** Always false in this build. No voice route performs an external write. */
  external_write_performed: false;
  created_at: string;
  expires_at?: string;
  reason_codes: string[];
}

// ── route → safety level ────────────────────────────────────────────────────

export function voiceRouteSafetyLevel(route: VoiceSafetyRoute): VoiceSafetyLevel {
  switch (route) {
    case "chat":
    case "ask_twin":
      return "informational";
    case "note_capture":
      return "draft_only";
    case "reminder":
    case "comms":
    case "approval":
    case "action_runtime":
      return "confirm_required";
    case "unknown":
    default:
      return "blocked";
  }
}

/** True only for privileged routes that require an explicit confirm. chat /
 *  ask_twin / note_capture are false (no privileged action); unknown is false
 *  too — a blocked route is clarified, not confirmed. */
export function requiresVoiceConfirmation(route: VoiceSafetyRoute): boolean {
  return voiceRouteSafetyLevel(route) === "confirm_required";
}

// ── per-route proposed copy ─────────────────────────────────────────────────

interface RouteCopy {
  title: string;
  summary: string;
  next_step: string;
  reason: string;
}

const ROUTE_COPY: Record<VoiceSafetyRoute, RouteCopy> = {
  chat: {
    title: "Chat response",
    summary: "Otzar will respond in Chat. No privileged action.",
    next_step: "Send to Chat as text.",
    reason: "INFORMATIONAL_NO_ACTION",
  },
  ask_twin: {
    title: "Ask Twin",
    summary: "Otzar will ask your Twin. No privileged action.",
    next_step: "Ask Twin with this transcript.",
    reason: "INFORMATIONAL_NO_ACTION",
  },
  note_capture: {
    title: "Capture note",
    summary: "A note draft for review. Nothing leaves Otzar.",
    next_step: "Review as a note before saving.",
    reason: "DRAFT_ONLY_REVIEW",
  },
  comms: {
    title: "Draft communication",
    summary: "A message draft. Nothing leaves Otzar until you confirm.",
    next_step: "Review and confirm before sending.",
    reason: "PRIVILEGED_ROUTE_CONFIRM_REQUIRED",
  },
  approval: {
    title: "Review approval request",
    summary: "An approval request. Nothing is decided until you confirm.",
    next_step: "Confirm before approving or declining.",
    reason: "PRIVILEGED_ROUTE_CONFIRM_REQUIRED",
  },
  action_runtime: {
    title: "Proposed work action",
    summary: "A proposed work action. Nothing changes until you confirm.",
    next_step: "Confirm before changing work state.",
    reason: "PRIVILEGED_ROUTE_CONFIRM_REQUIRED",
  },
  reminder: {
    title: "Draft reminder",
    summary: "A reminder draft. Nothing is created until you confirm.",
    next_step: "Confirm before creating reminder.",
    reason: "PRIVILEGED_ROUTE_CONFIRM_REQUIRED",
  },
  unknown: {
    title: "Unclear voice request",
    summary: "Otzar isn't sure what to do yet.",
    next_step: "Clarify the request before acting.",
    reason: "ROUTE_UNCLEAR_BLOCKED",
  },
};

function initialConfirmationState(level: VoiceSafetyLevel): VoiceConfirmationState {
  if (level === "confirm_required") return "required";
  if (level === "blocked") return "blocked";
  return "not_required";
}

// ── createVoiceProposedAction ───────────────────────────────────────────────

export interface CreateVoiceProposedActionInput {
  transcript: string;
  route: VoiceSafetyRoute;
  created_at?: string;
  expires_at?: string;
}

export function createVoiceProposedAction(
  input: CreateVoiceProposedActionInput,
): VoiceProposedAction {
  const transcript_text = input.transcript.trim();
  const safety_level = voiceRouteSafetyLevel(input.route);
  const copy = ROUTE_COPY[input.route];
  const confirmation_state = initialConfirmationState(safety_level);
  const can_execute_without_confirmation =
    safety_level !== "confirm_required" && safety_level !== "blocked";
  return {
    action_schema: "OTZAR_VOICE_PROPOSED_ACTION",
    schema_version: "0.1",
    transcript_text,
    route: input.route,
    safety_level,
    confirmation_state,
    proposed_title: copy.title,
    proposed_summary: copy.summary,
    proposed_next_step: copy.next_step,
    can_execute_without_confirmation,
    external_write_performed: false,
    created_at: input.created_at ?? new Date().toISOString(),
    ...(input.expires_at !== undefined ? { expires_at: input.expires_at } : {}),
    reason_codes: [copy.reason],
  };
}

// ── applyVoiceConfirmation ──────────────────────────────────────────────────

export type VoiceConfirmationDecision = "confirm" | "decline" | "expire";

export interface ApplyVoiceConfirmationResult {
  action: VoiceProposedAction;
  issues: string[];
}

export function applyVoiceConfirmation(
  action: VoiceProposedAction,
  decision: VoiceConfirmationDecision,
): ApplyVoiceConfirmationResult {
  const issues: string[] = [];

  // A blocked route can never be confirmed into an executable state.
  if (action.safety_level === "blocked") {
    issues.push("ROUTE_BLOCKED_NEEDS_CLARIFICATION");
    return { action: { ...action, confirmation_state: "blocked" }, issues };
  }

  // Informational / draft-only routes carry no privileged action to confirm.
  if (action.safety_level === "informational" || action.safety_level === "draft_only") {
    if (decision === "confirm") issues.push("NO_CONFIRMATION_REQUIRED_FOR_ROUTE");
    return { action: { ...action, confirmation_state: "not_required" }, issues };
  }

  // confirm_required path. Confirming is LOCAL ONLY — external_write_performed
  // never becomes true in this build.
  let next: VoiceConfirmationState = action.confirmation_state;
  if (decision === "confirm") next = "confirmed";
  else if (decision === "decline") next = "declined";
  else if (decision === "expire") next = "expired";

  return {
    action: { ...action, confirmation_state: next, external_write_performed: false },
    issues,
  };
}

// ── voiceConfirmationCopy ───────────────────────────────────────────────────

export function voiceConfirmationCopy(action: VoiceProposedAction): string {
  if (action.safety_level === "blocked" || action.confirmation_state === "blocked") {
    return "Otzar needs clarification before acting.";
  }
  switch (action.confirmation_state) {
    case "confirmed":
      return "Confirmed locally. No external write has been performed in this build.";
    case "declined":
      return "Voice action declined.";
    case "expired":
      return "This voice request expired. Start again when you're ready.";
    case "required":
      return "Confirmation required before Otzar performs this action.";
    case "not_required":
    default:
      if (action.safety_level === "draft_only") {
        return "Draft created for review. No external write has been performed.";
      }
      return "No privileged action is proposed.";
  }
}

/** Short label for the safety level badge. */
export function voiceSafetyLevelLabel(level: VoiceSafetyLevel): string {
  switch (level) {
    case "informational":
      return "Informational";
    case "draft_only":
      return "Draft only";
    case "confirm_required":
      return "Confirm required";
    case "blocked":
    default:
      return "Needs clarification";
  }
}
