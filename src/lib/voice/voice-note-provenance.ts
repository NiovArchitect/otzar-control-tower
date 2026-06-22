// FILE: voice-note-provenance.ts
// PURPOSE: Phase OTZAR-RETURN-8 — close the loop around the first governed voice
//          write (RETURN-7 note_capture) WITHOUT widening execution. It builds
//          honest provenance for a saved voice note and reports read-back and
//          undo status truthfully.
//
// KEY FINDING (load-bearing — see docs/ambient-voice-readiness.md):
//   `POST /otzar/observe` is an LLM EXTRACTION pipeline. A single event_type
//   "NOTE" can fan out to MULTIPLE memory capsules, and per Foundation's
//   PORTABILITY ROUTING invariant DECISIONS route to the ORG wallet while
//   commitments/insights route to the caller's wallet. Therefore:
//     - Provenance must reflect ALL capsule ids, not just the first.
//     - A clean undo is NOT safely available: the existing per-capsule,
//       caller-wallet-scoped revoke (POST /cosmp/capsules/:id/revoke) cannot
//       atomically revoke a fan-out across wallets (org-wallet capsules would be
//       NOT_OWNER for the caller). Revoking one capsule while claiming the note
//       was removed would be a false claim.
//   So RETURN-8 ships read-back/provenance + an honest "undo requires a governed
//   revoke path" with a typed contract proposal. It performs NO revoke/delete.
//
// HONESTY INVARIANTS:
//   - external_message_sent ALWAYS false; raw_audio_stored ALWAYS false.
//   - Never claims an audit url that was not returned.
//   - Never claims read-back the endpoint cannot provide.
//   - Otzar product infra — not AVP², no protocol artifact, no network here.

import type { VoiceNoteExecutionResult } from "@/lib/voice/voice-note-execution";

export type VoiceNoteReadbackStatus = "available" | "unavailable" | "pending";

export type VoiceNoteUndoStatus =
  | "available"
  | "unavailable"
  | "requires_backend_contract"
  | "revoked";

export interface VoiceNoteProvenance {
  provenance_schema: "OTZAR_VOICE_NOTE_PROVENANCE";
  schema_version: "0.1";
  route: "note_capture";
  source_result_id?: string;
  note_id: string | null;
  capsule_id: string | null;
  /** Every capsule minted from the note (may span wallets). */
  capsule_ids: string[];
  capsule_count: number;
  /** [OTZAR-RETURN-10] the durable grouping id, when the backend returned one.
   *  Its presence is what makes a future note-scoped revoke plan identifiable. */
  voice_note_id?: string;
  transcript_text: string;
  event_type: "NOTE";
  created_from: "voice_note_capture";
  audit_id?: string;
  audit_url?: string;
  readback_status: VoiceNoteReadbackStatus;
  undo_status: VoiceNoteUndoStatus;
  external_message_sent: false;
  raw_audio_stored: false;
  reason_codes: string[];
}

/** A typed proposal for the governed revoke path a real undo would need. This
 *  is a CONTRACT PROPOSAL only — nothing here calls or implements a revoke. */
export interface VoiceNoteUndoContractProposal {
  proposal_schema: "OTZAR_VOICE_NOTE_UNDO_CONTRACT_PROPOSAL";
  schema_version: "0.1";
  route: "note_capture";
  proposed_endpoint: string;
  method: "POST";
  requires_auth: true;
  audit_required: true;
  preferred_semantics: "revoke_or_tombstone";
  hard_delete_allowed: false;
  raw_audio_scope: "none";
  external_side_effects_allowed: false;
  reason_codes: string[];
}

/** Build honest provenance from a RETURN-7 note execution result. Read-back is
 *  reported as unavailable (no safe by-id read across wallets from this build)
 *  and undo as requires_backend_contract (per the fan-out finding above). Pure;
 *  calls nothing. */
export function buildVoiceNoteProvenance(
  result: VoiceNoteExecutionResult,
): VoiceNoteProvenance | null {
  // Provenance exists only for a real note write.
  if (result.execution_status !== "succeeded" || result.internal_note_created !== true) {
    return null;
  }
  const capsule_ids = result.capsule_ids ?? (result.note_id !== undefined ? [result.note_id] : []);
  const note_id = result.note_id ?? capsule_ids[0] ?? null;
  return {
    provenance_schema: "OTZAR_VOICE_NOTE_PROVENANCE",
    schema_version: "0.1",
    route: "note_capture",
    ...(result.source_turn_id !== null ? { source_result_id: result.source_turn_id } : {}),
    note_id,
    capsule_id: note_id,
    capsule_ids,
    capsule_count: capsule_ids.length,
    ...(result.voice_note_id !== undefined ? { voice_note_id: result.voice_note_id } : {}),
    transcript_text: "", // the transcript stays in the local turn; not duplicated here
    event_type: "NOTE",
    created_from: "voice_note_capture",
    ...(result.audit_id !== undefined ? { audit_id: result.audit_id } : {}),
    ...(result.audit_url !== undefined ? { audit_url: result.audit_url } : {}),
    // No by-id read endpoint that spans the caller + org wallets a NOTE can mint
    // into; the capsule ids are shown for provenance instead.
    readback_status: "unavailable",
    undo_status: "requires_backend_contract",
    external_message_sent: false,
    raw_audio_stored: false,
    reason_codes: [
      "NOTE_FANS_OUT_TO_MULTIPLE_CAPSULES",
      "DECISIONS_ROUTE_TO_ORG_WALLET_NOT_CALLER_REVOCABLE",
      "READBACK_NO_CROSS_WALLET_BY_ID_ENDPOINT",
    ],
  };
}

/** The typed revoke contract a safe undo would require. Pure; proposes only. */
export function buildVoiceNoteUndoProposal(): VoiceNoteUndoContractProposal {
  return {
    proposal_schema: "OTZAR_VOICE_NOTE_UNDO_CONTRACT_PROPOSAL",
    schema_version: "0.1",
    route: "note_capture",
    // A NOTE-scoped revoke that tombstones EVERY capsule the note minted, with
    // per-wallet authorization (caller + org), in one governed, audited call.
    proposed_endpoint: "/api/v1/otzar/voice-notes/:source_result_id/revoke",
    method: "POST",
    requires_auth: true,
    audit_required: true,
    preferred_semantics: "revoke_or_tombstone",
    hard_delete_allowed: false,
    raw_audio_scope: "none",
    external_side_effects_allowed: false,
    reason_codes: [
      "NOTE_LEVEL_REVOKE_NOT_PER_CAPSULE",
      "MUST_TOMBSTONE_ALL_MINTED_CAPSULES",
      "PER_WALLET_AUTHORIZATION_REQUIRED",
    ],
  };
}

/** Honest UI copy for read-back status. */
export function voiceNoteReadbackCopy(status: VoiceNoteReadbackStatus): string {
  switch (status) {
    case "available":
      return "Read-back available.";
    case "pending":
      return "Reading the note back…";
    case "unavailable":
    default:
      return "Read-back is not available from this endpoint yet. The capsule id is shown for provenance.";
  }
}

/** Honest UI copy for undo status. */
export function voiceNoteUndoCopy(status: VoiceNoteUndoStatus): string {
  switch (status) {
    case "available":
      return "Undo / revoke note.";
    case "revoked":
      return "Voice note revoked — removed from your active memory.";
    case "requires_backend_contract":
      return "Undo is not available in this build. A governed revoke path is required before Otzar can remove this note safely.";
    case "unavailable":
    default:
      return "Undo is not available.";
  }
}
