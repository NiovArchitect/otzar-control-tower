// FILE: tests/unit/voice-note-execution.test.ts
// PURPOSE: Phase OTZAR-RETURN-7 — lock the first governed voice EXECUTION route:
//          ONLY note_capture calls the governed internal-note write; every other
//          route is refused and the injected observe fn is NEVER called; the
//          write is internal (never an external send); governed_api_called is
//          true only when observe is invoked; success carries a note id;
//          duplicate is honest; failure is safe.
// CONNECTS TO: src/lib/voice/voice-note-execution.ts.

import { describe, expect, it, vi } from "vitest";
import {
  executeVoiceNoteCapture,
  type ObserveFn,
} from "@/lib/voice/voice-note-execution";
import {
  createVoiceTurn,
  type VoiceTurn,
} from "@/lib/voice/voice-turn-buffer";
import { createAmbientVoiceCaptureEvent } from "@/lib/voice/ambient-voice-capture";
import {
  createVoiceProposedAction,
  type VoiceSafetyRoute,
} from "@/lib/voice/voice-approval-safety";
import type { ApiResult } from "@/lib/api";
import type { ObserveResponse } from "@/lib/types/foundation";

const AT = "2026-06-22T00:00:00.000Z";

function turn(route: VoiceSafetyRoute, transcript = "note: the contract renews in Q3"): VoiceTurn {
  const capture_event = createAmbientVoiceCaptureEvent({
    transcript,
    device_mode: "desktop_browser",
    capture_mode: "push_to_talk",
    status: "ready",
    created_at: AT,
  });
  const proposed_action = createVoiceProposedAction({ transcript, route, created_at: AT });
  return createVoiceTurn({ transcript, capture_event, proposed_action, created_at: AT, turn_id: `t-${route}` });
}

function okObserve(data: ObserveResponse): ObserveFn {
  return vi.fn(async () => ({ ok: true, data, status: 200 }) as ApiResult<ObserveResponse>);
}
function failObserve(code = "NETWORK_ERROR"): ObserveFn {
  return vi.fn(async () => ({ ok: false, code, message: "boom", status: 500 }) as ApiResult<ObserveResponse>);
}

const SUCCESS_DATA: ObserveResponse = {
  ok: true,
  capsule_ids: ["cap-note-1", "cap-note-2"],
  extracted_summary: { decisions: 0, commitments: 1, work_patterns: 0, external_entities: 0, vocab_growth: 0 },
};

describe("executeVoiceNoteCapture — note_capture only", () => {
  it("1. a note_capture turn creates an internal note (succeeded, note_id, internal_note_created)", async () => {
    const observe = okObserve(SUCCESS_DATA);
    const r = await executeVoiceNoteCapture(turn("note_capture"), observe);
    expect(observe).toHaveBeenCalledTimes(1);
    expect(observe).toHaveBeenCalledWith({
      content: "note: the contract renews in Q3",
      event_type: "NOTE",
      source: "voice_note_capture",
    });
    expect(r.execution_status).toBe("succeeded");
    expect(r.internal_note_created).toBe(true);
    expect(r.note_id).toBe("cap-note-1");
    expect(r.governed_api_called).toBe(true);
    expect(r.external_write_performed).toBe(false);
    expect(r.message.toLowerCase()).toContain("no external message was sent");
  });

  it("2-7. comms/approval/action_runtime/reminder/chat/ask_twin/unknown are refused and NEVER call observe", async () => {
    for (const route of ["comms", "approval", "action_runtime", "reminder", "chat", "ask_twin", "unknown"] as VoiceSafetyRoute[]) {
      const observe = okObserve(SUCCESS_DATA);
      const r = await executeVoiceNoteCapture(turn(route), observe);
      expect(observe, `observe must not be called for ${route}`).not.toHaveBeenCalled();
      expect(r.execution_status).toBe("refused");
      expect(r.governed_api_called).toBe(false);
      expect(r.internal_note_created).toBe(false);
      expect(r.external_write_performed).toBe(false);
    }
  });

  it("8. the result carries no raw-audio field", async () => {
    const r = await executeVoiceNoteCapture(turn("note_capture"), okObserve(SUCCESS_DATA));
    const keys = Object.keys(r);
    expect(keys).not.toContain("audio");
    expect(keys).not.toContain("waveform");
    expect(keys).not.toContain("raw_audio");
  });

  it("9. external_write_performed is false on every path", async () => {
    const success = await executeVoiceNoteCapture(turn("note_capture"), okObserve(SUCCESS_DATA));
    const refused = await executeVoiceNoteCapture(turn("comms"), okObserve(SUCCESS_DATA));
    const failed = await executeVoiceNoteCapture(turn("note_capture"), failObserve());
    for (const r of [success, refused, failed]) {
      expect(r.external_write_performed).toBe(false);
    }
  });

  it("10. governed_api_called is true only when observe is actually invoked", async () => {
    const refused = await executeVoiceNoteCapture(turn("approval"), okObserve(SUCCESS_DATA));
    expect(refused.governed_api_called).toBe(false);
    const failed = await executeVoiceNoteCapture(turn("note_capture"), failObserve());
    expect(failed.governed_api_called).toBe(true); // called, then failed
    expect(failed.execution_status).toBe("failed");
    expect(failed.internal_note_created).toBe(false);
  });

  it("11. success includes a note id (capsule)", async () => {
    const r = await executeVoiceNoteCapture(turn("note_capture"), okObserve(SUCCESS_DATA));
    expect(r.note_id).toBe("cap-note-1");
  });

  it("12. failure shows a safe error and creates no note", async () => {
    const r = await executeVoiceNoteCapture(turn("note_capture"), failObserve("OBSERVE_FAILED"));
    expect(r.execution_status).toBe("failed");
    expect(r.internal_note_created).toBe(false);
    expect(r.reason_codes).toContain("OBSERVE_FAILED");
    expect(r.message.toLowerCase()).toContain("couldn't save");
  });

  it("duplicate content is honest (succeeded but not a new note)", async () => {
    const dup: ObserveResponse = { ok: true, skipped: true, reason: "DUPLICATE_CONTENT" };
    const r = await executeVoiceNoteCapture(turn("note_capture"), okObserve(dup));
    expect(r.execution_status).toBe("succeeded");
    expect(r.internal_note_created).toBe(false);
    expect(r.reason_codes).toContain("DUPLICATE_CONTENT");
    expect(r.message.toLowerCase()).toContain("already captured");
  });

  it("stores the voice_note_id when the backend returns one (RETURN-10)", async () => {
    const withGroup: ObserveResponse = {
      ok: true,
      capsule_ids: ["cap-obs-1", "cap-obs-2"],
      voice_note_id: "11111111-2222-3333-4444-555555555555",
      extracted_summary: { decisions: 1, commitments: 1, work_patterns: 0, external_entities: 0, vocab_growth: 0 },
    };
    const r = await executeVoiceNoteCapture(turn("note_capture"), okObserve(withGroup));
    expect(r.voice_note_id).toBe("11111111-2222-3333-4444-555555555555");
    expect(r.capsule_ids).toEqual(["cap-obs-1", "cap-obs-2"]);
  });

  it("stays backward-compatible when the backend returns no voice_note_id", async () => {
    const r = await executeVoiceNoteCapture(turn("note_capture"), okObserve(SUCCESS_DATA));
    expect(r.voice_note_id).toBeUndefined();
    expect(r.internal_note_created).toBe(true);
  });

  it("an empty transcript is refused without calling observe", async () => {
    const observe = okObserve(SUCCESS_DATA);
    const r = await executeVoiceNoteCapture(turn("note_capture", "   "), observe);
    expect(observe).not.toHaveBeenCalled();
    expect(r.execution_status).toBe("refused");
    expect(r.governed_api_called).toBe(false);
  });
});
