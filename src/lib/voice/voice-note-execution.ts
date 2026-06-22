// FILE: voice-note-execution.ts
// PURPOSE: Phase OTZAR-RETURN-7 — the FIRST governed voice EXECUTION route.
//          Governed voice CONTROL already exists (RETURN-3..6: capture, routing,
//          confirm-before-act, local turn buffer, inert handoff). This adds
//          exactly ONE low-risk governed WRITE: an internal note capture for the
//          note_capture route, behind explicit user action.
//
//          It reuses the SAME governed, audit-aware write the Observe page
//          already performs — POST /api/v1/otzar/observe with event_type "NOTE"
//          — which writes the CALLER'S OWN memory capsule and emits a
//          CAPSULE_CREATED audit. It is internal only.
//
// HARD SAFETY INVARIANTS (load-bearing — see docs/ambient-voice-readiness.md):
//   - ONLY note_capture executes. Every other route (comms, approval,
//     action_runtime, reminder, chat, ask_twin, unknown) is REFUSED and the
//     governed write is never called.
//   - `external_write_performed` is ALWAYS false. This is an internal note
//     capture, never an external send (no message / email / Slack / calendar).
//   - No approval is decided, no task completed, no reminder created.
//   - `governed_api_called` is true ONLY when the note API was actually invoked.
//   - No raw audio. Transcript text only.
//   - Otzar product infra — not AVP², no protocol artifact.

import type { ApiResult } from "@/lib/api";
import type { ObserveRequest, ObserveResponse } from "@/lib/types/foundation";
import type { VoiceTurn } from "@/lib/voice/voice-turn-buffer";

/** The governed note-capture call, injected so the model stays pure and
 *  testable. The Voice page passes `api.otzar.observe`. */
export type ObserveFn = (req: ObserveRequest) => Promise<ApiResult<ObserveResponse>>;

export interface VoiceNoteExecutionResult {
  result_schema: "OTZAR_VOICE_NOTE_EXECUTION_RESULT";
  schema_version: "0.1";
  route: "note_capture";
  source_handoff_id: string | null;
  source_turn_id: string | null;
  execution_status: "not_started" | "succeeded" | "failed" | "refused";
  governed_api_called: boolean;
  /** Always false. Internal note capture is never an external send. */
  external_write_performed: false;
  internal_note_created: boolean;
  /** The PRIMARY capsule id (capsule_ids[0]); kept for back-compat. */
  note_id?: string;
  /** ALL capsule ids minted from this note. A single NOTE observation is an
   *  extraction that can fan out to MULTIPLE capsules across wallets (decisions
   *  route to the org wallet, commitments/insights to the caller's). Provenance
   *  must reflect every one — not just the first. */
  capsule_ids?: string[];
  // [OTZAR-RETURN-10] the durable grouping id Foundation returns for a voice
  // note (shared by every capsule). Present only when the backend supports it.
  voice_note_id?: string;
  audit_id?: string;
  audit_url?: string;
  message: string;
  reason_codes: string[];
}

const NOTE_EVENT_TYPE = "NOTE";

function baseResult(turn: VoiceTurn | null): VoiceNoteExecutionResult {
  return {
    result_schema: "OTZAR_VOICE_NOTE_EXECUTION_RESULT",
    schema_version: "0.1",
    route: "note_capture",
    source_handoff_id: null,
    source_turn_id: turn?.turn_id ?? null,
    execution_status: "not_started",
    governed_api_called: false,
    external_write_performed: false,
    internal_note_created: false,
    message: "",
    reason_codes: [],
  };
}

/** Refuse a non-note (or non-executable) turn without ever calling the API. */
export function refuseVoiceNoteExecution(
  turn: VoiceTurn,
  reason: string,
  message: string,
): VoiceNoteExecutionResult {
  return {
    ...baseResult(turn),
    execution_status: "refused",
    governed_api_called: false,
    internal_note_created: false,
    message,
    reason_codes: [reason],
  };
}

/** Execute the governed internal note capture for a note_capture turn ONLY.
 *  Any other route returns a refusal and NEVER calls `observe`. */
export async function executeVoiceNoteCapture(
  turn: VoiceTurn,
  observe: ObserveFn,
): Promise<VoiceNoteExecutionResult> {
  const route = turn.proposed_action.route;
  if (route !== "note_capture") {
    return refuseVoiceNoteExecution(
      turn,
      "ROUTE_NOT_EXECUTABLE_THIS_BUILD",
      "Only internal note capture can run in this build. This route is not executed.",
    );
  }
  const content = turn.transcript_text.trim();
  if (content.length === 0) {
    return refuseVoiceNoteExecution(turn, "EMPTY_TRANSCRIPT", "Nothing to save yet.");
  }

  // [OTZAR-RETURN-10] mark this as a voice-note capture so Foundation groups
  // every capsule it mints under one voice_note_id and returns it.
  const req: ObserveRequest = {
    content,
    event_type: NOTE_EVENT_TYPE,
    source: "voice_note_capture",
  };
  const r = await observe(req);

  // From here on the governed API WAS called.
  if (!r.ok) {
    return {
      ...baseResult(turn),
      execution_status: "failed",
      governed_api_called: true,
      internal_note_created: false,
      message: "Couldn't save the note right now. No external message was sent.",
      reason_codes: [r.code],
    };
  }

  const data = r.data;
  // Duplicate content is an honest "already captured" — not a new note.
  if ("skipped" in data && data.skipped === true) {
    return {
      ...baseResult(turn),
      execution_status: "succeeded",
      governed_api_called: true,
      internal_note_created: false,
      message: "This note was already captured. No external message was sent.",
      reason_codes: ["DUPLICATE_CONTENT"],
    };
  }

  const capsule_ids = "capsule_ids" in data ? data.capsule_ids : [];
  const note_id = capsule_ids[0];
  const voice_note_id = "voice_note_id" in data ? data.voice_note_id : undefined;
  return {
    ...baseResult(turn),
    execution_status: "succeeded",
    governed_api_called: true,
    internal_note_created: true,
    ...(note_id !== undefined ? { note_id } : {}),
    capsule_ids,
    ...(voice_note_id !== undefined ? { voice_note_id } : {}),
    message: "Internal note saved to your memory. No external message was sent.",
    reason_codes: ["INTERNAL_NOTE_CAPTURED"],
  };
}

/** Honest UI copy for the result (or null = nothing run yet). */
export function describeVoiceNoteExecution(result: VoiceNoteExecutionResult | null): string {
  if (result === null) return "";
  return result.message;
}
