// FILE: confirmed-action-handoff.ts
// PURPOSE: Phase OTZAR-RETURN-6 — the INERT confirmed-action handoff scaffold.
//          When a privileged voice route has been confirmed locally, this
//          produces a typed handoff object that a FUTURE chunk could connect to
//          the existing governed / audit-aware action runtime. It is the seam,
//          not the execution: nothing here runs, calls an API, or writes.
//
// HONESTY / SAFETY INVARIANTS (load-bearing — see docs/ambient-voice-readiness.md):
//   - `execution_status` is ALWAYS "not_executed".
//   - `external_write_performed` is ALWAYS false.
//   - `governed_api_called` is ALWAYS false.
//   - A handoff is created ONLY for a turn that is genuinely confirmed AND on a
//     confirm_required route. Informational / draft_only / blocked / unconfirmed
//     turns never produce one.
//   - Otzar product infra — not AVP², no protocol artifact, no network. (This is
//     unrelated to src/lib/avp2/e2e-handoff.ts.)

import type { VoiceTurn } from "@/lib/voice/voice-turn-buffer";
import type { VoiceSafetyRoute, VoiceSafetyLevel } from "@/lib/voice/voice-approval-safety";

export interface ConfirmedVoiceActionHandoff {
  handoff_schema: "OTZAR_CONFIRMED_VOICE_ACTION_HANDOFF";
  schema_version: "0.1";
  handoff_id: string;
  created_at: string;
  source_turn_id: string;
  route: VoiceSafetyRoute;
  safety_level: VoiceSafetyLevel;
  confirmation_state: "confirmed";
  transcript_text: string;
  proposed_title: string;
  proposed_summary: string;
  proposed_next_step: string;
  execution_status: "not_executed";
  external_write_performed: false;
  governed_api_called: false;
  ready_for_future_governed_execution: true;
  requires_governed_runtime: true;
  reason_codes: string[];
}

export type CreateHandoffResult =
  | { ok: true; handoff: ConfirmedVoiceActionHandoff }
  | { ok: false; issue: string };

/** Build the inert handoff for a confirmed, privileged turn. Returns an honest
 *  refusal for any turn that is not a genuinely-confirmed confirm_required turn.
 *  Never calls an API, never executes, never writes. */
export function createConfirmedVoiceActionHandoff(turn: VoiceTurn): CreateHandoffResult {
  const action = turn.proposed_action;
  if (action === undefined || action === null) {
    return { ok: false, issue: "MISSING_PROPOSED_ACTION" };
  }
  if (action.safety_level !== "confirm_required") {
    // informational / draft_only / blocked routes carry no governed action.
    return { ok: false, issue: "ROUTE_NOT_CONFIRM_REQUIRED" };
  }
  if (turn.confirmation_state !== "confirmed" || turn.status !== "confirmed") {
    return { ok: false, issue: "TURN_NOT_CONFIRMED" };
  }
  return {
    ok: true,
    handoff: {
      handoff_schema: "OTZAR_CONFIRMED_VOICE_ACTION_HANDOFF",
      schema_version: "0.1",
      handoff_id: `handoff-${turn.turn_id}`,
      created_at: turn.updated_at,
      source_turn_id: turn.turn_id,
      route: action.route,
      safety_level: action.safety_level,
      confirmation_state: "confirmed",
      transcript_text: turn.transcript_text,
      proposed_title: action.proposed_title,
      proposed_summary: action.proposed_summary,
      proposed_next_step: action.proposed_next_step,
      execution_status: "not_executed",
      external_write_performed: false,
      governed_api_called: false,
      ready_for_future_governed_execution: true,
      requires_governed_runtime: true,
      reason_codes: [
        "CONFIRMED_LOCAL_READY_FOR_GOVERNED_EXECUTION",
        "INERT_NO_EXECUTION_THIS_BUILD",
      ],
    },
  };
}

/** Honest UI copy for a handoff (or its absence). */
export function describeConfirmedActionHandoff(
  handoff: ConfirmedVoiceActionHandoff | null,
): string {
  if (handoff === null) {
    return "No governed action handoff is available.";
  }
  return "Confirmed locally and ready for future governed execution. No external write has been performed in this build.";
}
