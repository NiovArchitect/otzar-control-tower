// FILE: tests/unit/voice-note-provenance.test.ts
// PURPOSE: Phase OTZAR-RETURN-8 — lock honest provenance for a saved voice note
//          and the typed undo contract proposal. Provenance reflects ALL minted
//          capsule ids (a NOTE fans out), never invents an audit url, reports
//          read-back as unavailable and undo as requires_backend_contract, and
//          carries no external-send/raw-audio. No revoke is performed.
// CONNECTS TO: src/lib/voice/voice-note-provenance.ts, voice-note-execution.ts.

import { describe, expect, it } from "vitest";
import {
  buildVoiceNoteProvenance,
  buildVoiceNoteUndoProposal,
  voiceNoteReadbackCopy,
  voiceNoteUndoCopy,
} from "@/lib/voice/voice-note-provenance";
import type { VoiceNoteExecutionResult } from "@/lib/voice/voice-note-execution";

function successResult(over: Partial<VoiceNoteExecutionResult> = {}): VoiceNoteExecutionResult {
  return {
    result_schema: "OTZAR_VOICE_NOTE_EXECUTION_RESULT",
    schema_version: "0.1",
    route: "note_capture",
    source_handoff_id: null,
    source_turn_id: "live-note_capture",
    execution_status: "succeeded",
    governed_api_called: true,
    external_write_performed: false,
    internal_note_created: true,
    note_id: "cap-obs-1",
    capsule_ids: ["cap-obs-1", "cap-obs-2"],
    message: "Internal note saved to your memory. No external message was sent.",
    reason_codes: ["INTERNAL_NOTE_CAPTURED"],
    ...over,
  };
}

describe("buildVoiceNoteProvenance", () => {
  it("1-2. builds provenance from a successful note execution and maps capsule ids", () => {
    const p = buildVoiceNoteProvenance(successResult());
    expect(p).not.toBeNull();
    expect(p?.note_id).toBe("cap-obs-1");
    expect(p?.capsule_id).toBe("cap-obs-1");
    // ALL capsules are reflected, not just the first (a NOTE fans out).
    expect(p?.capsule_ids).toEqual(["cap-obs-1", "cap-obs-2"]);
    expect(p?.capsule_count).toBe(2);
    expect(p?.created_from).toBe("voice_note_capture");
    expect(p?.event_type).toBe("NOTE");
  });

  it("3. does not invent an audit url when none was returned", () => {
    const p = buildVoiceNoteProvenance(successResult());
    expect(p?.audit_url).toBeUndefined();
    expect(p?.audit_id).toBeUndefined();
  });

  it("surfaces an audit url only when the result carries one", () => {
    const p = buildVoiceNoteProvenance(successResult({ audit_url: "/audit/evt-1", audit_id: "evt-1" }));
    expect(p?.audit_url).toBe("/audit/evt-1");
    expect(p?.audit_id).toBe("evt-1");
  });

  it("4-5. external_message_sent false and raw_audio_stored false", () => {
    const p = buildVoiceNoteProvenance(successResult());
    expect(p?.external_message_sent).toBe(false);
    expect(p?.raw_audio_stored).toBe(false);
  });

  it("6. read-back is reported unavailable (no safe cross-wallet by-id read)", () => {
    expect(buildVoiceNoteProvenance(successResult())?.readback_status).toBe("unavailable");
  });

  it("7. undo is reported requires_backend_contract (note fans out across wallets)", () => {
    const p = buildVoiceNoteProvenance(successResult());
    expect(p?.undo_status).toBe("requires_backend_contract");
    expect(p?.reason_codes).toContain("NOTE_FANS_OUT_TO_MULTIPLE_CAPSULES");
    expect(p?.reason_codes).toContain("DECISIONS_ROUTE_TO_ORG_WALLET_NOT_CALLER_REVOCABLE");
  });

  it("returns null when no note was actually created (refused / failed / duplicate)", () => {
    expect(buildVoiceNoteProvenance(successResult({ execution_status: "refused", internal_note_created: false }))).toBeNull();
    expect(buildVoiceNoteProvenance(successResult({ execution_status: "failed", internal_note_created: false }))).toBeNull();
    // duplicate: succeeded but no new note
    expect(buildVoiceNoteProvenance(successResult({ internal_note_created: false }))).toBeNull();
  });

  it("8. provenance output contains no AVP²/Federation references", () => {
    const blob = JSON.stringify(buildVoiceNoteProvenance(successResult())).toLowerCase();
    expect(blob).not.toContain("avp");
    expect(blob).not.toContain("federation");
    expect(blob).not.toContain("cosmp");
  });
});

describe("buildVoiceNoteUndoProposal — typed contract, not an implementation", () => {
  it("proposes a governed, audited, soft revoke and forbids hard delete / external effects", () => {
    const p = buildVoiceNoteUndoProposal();
    expect(p.route).toBe("note_capture");
    expect(p.method).toBe("POST");
    expect(p.requires_auth).toBe(true);
    expect(p.audit_required).toBe(true);
    expect(p.preferred_semantics).toBe("revoke_or_tombstone");
    expect(p.hard_delete_allowed).toBe(false);
    expect(p.raw_audio_scope).toBe("none");
    expect(p.external_side_effects_allowed).toBe(false);
    expect(p.reason_codes).toContain("MUST_TOMBSTONE_ALL_MINTED_CAPSULES");
  });
});

describe("copy is honest", () => {
  it("read-back unavailable + undo requires governed revoke path", () => {
    expect(voiceNoteReadbackCopy("unavailable").toLowerCase()).toContain("capsule id is shown for provenance");
    expect(voiceNoteUndoCopy("requires_backend_contract").toLowerCase()).toContain("governed revoke path is required");
    expect(voiceNoteUndoCopy("revoked").toLowerCase()).toContain("removed from your active memory");
  });
});
