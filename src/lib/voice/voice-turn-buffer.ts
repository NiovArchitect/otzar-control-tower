// FILE: voice-turn-buffer.ts
// PURPOSE: Phase OTZAR-RETURN-6 — the LOCAL, in-memory, session-only voice turn
//          buffer. It lets Otzar remember a voice turn (transcript text +
//          capture event + proposed action + confirmation state) for the
//          current session so the safety flow is coherent — WITHOUT persisting
//          anything and WITHOUT storing raw audio.
//
// HONESTY / SAFETY INVARIANTS (load-bearing — see docs/ambient-voice-readiness.md):
//   - `persisted` is ALWAYS false. This model never writes to localStorage,
//     sessionStorage, IndexedDB, a backend, or the filesystem. Retention is
//     "in_memory_session_only" — it lives in React state and is gone on reload.
//   - `raw_audio_present` is ALWAYS false. Transcript text only.
//   - `external_write_performed` is ALWAYS false. Nothing here sends, approves,
//     completes, or creates anything.
//   - Otzar product infra — not AVP², no protocol artifact, no network.

import type { AmbientVoiceCaptureEvent } from "@/lib/voice/ambient-voice-capture";
import {
  applyVoiceConfirmation,
  type VoiceProposedAction,
  type VoiceConfirmationState,
  type VoiceConfirmationDecision,
} from "@/lib/voice/voice-approval-safety";

export type VoiceTurnStatus =
  | "captured"
  | "proposed"
  | "confirmation_required"
  | "confirmed"
  | "declined"
  | "blocked"
  | "expired";

export interface VoiceTurn {
  turn_schema: "OTZAR_LOCAL_VOICE_TURN";
  schema_version: "0.1";
  turn_id: string;
  created_at: string;
  updated_at: string;
  transcript_text: string;
  transcript_present: boolean;
  capture_event: AmbientVoiceCaptureEvent;
  proposed_action: VoiceProposedAction;
  status: VoiceTurnStatus;
  confirmation_state: VoiceConfirmationState;
  external_write_performed: false;
  persisted: false;
  raw_audio_present: false;
  retention: "in_memory_session_only";
  reason_codes: string[];
}

export interface VoiceTurnBuffer {
  buffer_schema: "OTZAR_LOCAL_VOICE_TURN_BUFFER";
  schema_version: "0.1";
  buffer_id: string;
  created_at: string;
  updated_at: string;
  max_turns: number;
  retention: "in_memory_session_only";
  persisted: false;
  raw_audio_present: false;
  turns: VoiceTurn[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${nowIso()}`;
}

/** Map the proposed action's confirmation state to a turn status. */
function turnStatusFromAction(action: VoiceProposedAction): VoiceTurnStatus {
  switch (action.confirmation_state) {
    case "required":
      return "confirmation_required";
    case "confirmed":
      return "confirmed";
    case "declined":
      return "declined";
    case "blocked":
      return "blocked";
    case "expired":
      return "expired";
    case "not_required":
    default:
      return "proposed";
  }
}

// ── createVoiceTurn ─────────────────────────────────────────────────────────

export interface CreateVoiceTurnInput {
  transcript: string;
  capture_event: AmbientVoiceCaptureEvent;
  proposed_action: VoiceProposedAction;
  created_at?: string;
  turn_id?: string;
}

export function createVoiceTurn(input: CreateVoiceTurnInput): VoiceTurn {
  const created = input.created_at ?? nowIso();
  const transcript_text = input.transcript.trim();
  return {
    turn_schema: "OTZAR_LOCAL_VOICE_TURN",
    schema_version: "0.1",
    turn_id: input.turn_id ?? generateId("turn"),
    created_at: created,
    updated_at: created,
    transcript_text,
    transcript_present: transcript_text.length > 0,
    capture_event: input.capture_event,
    proposed_action: input.proposed_action,
    status: turnStatusFromAction(input.proposed_action),
    confirmation_state: input.proposed_action.confirmation_state,
    external_write_performed: false,
    persisted: false,
    raw_audio_present: false,
    retention: "in_memory_session_only",
    reason_codes: [...input.proposed_action.reason_codes],
  };
}

// ── createVoiceTurnBuffer ───────────────────────────────────────────────────

export interface CreateVoiceTurnBufferInput {
  buffer_id?: string;
  max_turns?: number;
  created_at?: string;
}

export function createVoiceTurnBuffer(
  input: CreateVoiceTurnBufferInput = {},
): VoiceTurnBuffer {
  const created = input.created_at ?? nowIso();
  // Bounded: at least 1, default 10.
  const max_turns = Math.max(1, Math.floor(input.max_turns ?? 10));
  return {
    buffer_schema: "OTZAR_LOCAL_VOICE_TURN_BUFFER",
    schema_version: "0.1",
    buffer_id: input.buffer_id ?? generateId("buffer"),
    created_at: created,
    updated_at: created,
    max_turns,
    retention: "in_memory_session_only",
    persisted: false,
    raw_audio_present: false,
    turns: [],
  };
}

// ── addVoiceTurn (immutable, bounded) ───────────────────────────────────────

export function addVoiceTurn(buffer: VoiceTurnBuffer, turn: VoiceTurn): VoiceTurnBuffer {
  const appended = [...buffer.turns, turn];
  // Drop oldest beyond max_turns.
  const trimmed =
    appended.length > buffer.max_turns
      ? appended.slice(appended.length - buffer.max_turns)
      : appended;
  return { ...buffer, turns: trimmed, updated_at: turn.updated_at };
}

// ── updateVoiceTurnConfirmation ─────────────────────────────────────────────

export interface UpdateVoiceTurnResult {
  buffer: VoiceTurnBuffer;
  issues: string[];
}

export function updateVoiceTurnConfirmation(
  buffer: VoiceTurnBuffer,
  turn_id: string,
  decision: VoiceConfirmationDecision,
): UpdateVoiceTurnResult {
  const idx = buffer.turns.findIndex((t) => t.turn_id === turn_id);
  if (idx === -1) {
    return { buffer, issues: ["TURN_NOT_FOUND"] };
  }
  const turn = buffer.turns[idx];
  if (turn === undefined) {
    return { buffer, issues: ["TURN_NOT_FOUND"] };
  }
  const { action, issues } = applyVoiceConfirmation(turn.proposed_action, decision);
  const updatedAt = nowIso();
  const updatedTurn: VoiceTurn = {
    ...turn,
    proposed_action: action,
    confirmation_state: action.confirmation_state,
    status: turnStatusFromAction(action),
    // Never flips — re-asserted for clarity.
    external_write_performed: false,
    updated_at: updatedAt,
  };
  const turns = buffer.turns.map((t, i) => (i === idx ? updatedTurn : t));
  return { buffer: { ...buffer, turns, updated_at: updatedAt }, issues };
}

// ── latestVoiceTurn ─────────────────────────────────────────────────────────

export function latestVoiceTurn(buffer: VoiceTurnBuffer): VoiceTurn | null {
  return buffer.turns.length > 0 ? (buffer.turns[buffer.turns.length - 1] ?? null) : null;
}

// ── clearVoiceTurnBuffer ────────────────────────────────────────────────────

export function clearVoiceTurnBuffer(buffer: VoiceTurnBuffer): VoiceTurnBuffer {
  return { ...buffer, turns: [], updated_at: nowIso() };
}
