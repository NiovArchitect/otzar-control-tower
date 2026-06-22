// FILE: tests/unit/voice-turn-buffer.test.ts
// PURPOSE: Phase OTZAR-RETURN-6 — lock the local, in-memory, session-only voice
//          turn buffer: turns are never persisted, never carry raw audio, never
//          perform an external write; status derives from the proposed action;
//          the buffer is bounded; confirmation updates are local; and nothing in
//          the model output references storage or AVP²/Federation.
// CONNECTS TO: src/lib/voice/voice-turn-buffer.ts.

import { describe, expect, it } from "vitest";
import {
  createVoiceTurn,
  createVoiceTurnBuffer,
  addVoiceTurn,
  updateVoiceTurnConfirmation,
  latestVoiceTurn,
  clearVoiceTurnBuffer,
  type VoiceTurn,
} from "@/lib/voice/voice-turn-buffer";
import { createAmbientVoiceCaptureEvent } from "@/lib/voice/ambient-voice-capture";
import {
  createVoiceProposedAction,
  type VoiceSafetyRoute,
} from "@/lib/voice/voice-approval-safety";

const AT = "2026-06-22T00:00:00.000Z";

function turn(route: VoiceSafetyRoute, transcript = "do the thing", turn_id = `t-${route}`): VoiceTurn {
  const capture_event = createAmbientVoiceCaptureEvent({
    transcript,
    device_mode: "desktop_browser",
    capture_mode: "push_to_talk",
    status: "ready",
    created_at: AT,
  });
  const proposed_action = createVoiceProposedAction({ transcript, route, created_at: AT });
  return createVoiceTurn({ transcript, capture_event, proposed_action, created_at: AT, turn_id });
}

describe("createVoiceTurn — local, non-persistent, no audio", () => {
  it("1. marks persisted false and raw_audio_present false", () => {
    const t = turn("comms");
    expect(t.persisted).toBe(false);
    expect(t.raw_audio_present).toBe(false);
    expect(t.retention).toBe("in_memory_session_only");
    expect(t.turn_schema).toBe("OTZAR_LOCAL_VOICE_TURN");
  });

  it("2. never sets external_write_performed true", () => {
    for (const route of ["chat", "comms", "approval", "action_runtime", "reminder", "note_capture", "ask_twin", "unknown"] as VoiceSafetyRoute[]) {
      expect(turn(route).external_write_performed).toBe(false);
    }
  });

  it("3. a confirm_required proposed action creates a confirmation_required turn", () => {
    expect(turn("comms").status).toBe("confirmation_required");
    expect(turn("approval").status).toBe("confirmation_required");
  });

  it("4. an informational action creates a proposed turn", () => {
    expect(turn("chat").status).toBe("proposed");
    expect(turn("ask_twin").status).toBe("proposed");
  });

  it("5. a blocked action creates a blocked turn", () => {
    expect(turn("unknown").status).toBe("blocked");
  });
});

describe("createVoiceTurnBuffer + addVoiceTurn — bounded, immutable", () => {
  it("6. defaults max_turns to 10", () => {
    expect(createVoiceTurnBuffer().max_turns).toBe(10);
    expect(createVoiceTurnBuffer({ created_at: AT }).persisted).toBe(false);
  });

  it("20. enforces a minimum max_turns of 1", () => {
    expect(createVoiceTurnBuffer({ max_turns: 0 }).max_turns).toBe(1);
    expect(createVoiceTurnBuffer({ max_turns: -5 }).max_turns).toBe(1);
  });

  it("7. appends a turn", () => {
    const b = addVoiceTurn(createVoiceTurnBuffer({ created_at: AT }), turn("comms"));
    expect(b.turns).toHaveLength(1);
  });

  it("8. trims the oldest beyond max_turns", () => {
    let b = createVoiceTurnBuffer({ created_at: AT, max_turns: 2 });
    b = addVoiceTurn(b, turn("comms", "first", "t1"));
    b = addVoiceTurn(b, turn("approval", "second", "t2"));
    b = addVoiceTurn(b, turn("reminder", "third", "t3"));
    expect(b.turns.map((t) => t.turn_id)).toEqual(["t2", "t3"]);
  });

  it("9. does not mutate the original buffer", () => {
    const b0 = createVoiceTurnBuffer({ created_at: AT });
    const b1 = addVoiceTurn(b0, turn("comms"));
    expect(b0.turns).toHaveLength(0);
    expect(b1.turns).toHaveLength(1);
  });

  it("10. latestVoiceTurn returns the newest turn (or null when empty)", () => {
    expect(latestVoiceTurn(createVoiceTurnBuffer({ created_at: AT }))).toBeNull();
    let b = createVoiceTurnBuffer({ created_at: AT });
    b = addVoiceTurn(b, turn("comms", "first", "t1"));
    b = addVoiceTurn(b, turn("approval", "second", "t2"));
    expect(latestVoiceTurn(b)?.turn_id).toBe("t2");
  });
});

describe("updateVoiceTurnConfirmation — local only", () => {
  function bufferWith(route: VoiceSafetyRoute, turn_id = "t1") {
    return addVoiceTurn(createVoiceTurnBuffer({ created_at: AT }), turn(route, "do the thing", turn_id));
  }

  it("11. confirm sets the turn to confirmed (no external write)", () => {
    const { buffer } = updateVoiceTurnConfirmation(bufferWith("comms"), "t1", "confirm");
    const t = latestVoiceTurn(buffer);
    expect(t?.status).toBe("confirmed");
    expect(t?.confirmation_state).toBe("confirmed");
    expect(t?.external_write_performed).toBe(false);
  });

  it("12. decline sets the turn to declined", () => {
    const { buffer } = updateVoiceTurnConfirmation(bufferWith("approval"), "t1", "decline");
    expect(latestVoiceTurn(buffer)?.status).toBe("declined");
  });

  it("13. expire sets the turn to expired", () => {
    const { buffer } = updateVoiceTurnConfirmation(bufferWith("reminder"), "t1", "expire");
    expect(latestVoiceTurn(buffer)?.status).toBe("expired");
  });

  it("14. a missing turn returns an issue and an unchanged buffer", () => {
    const b = bufferWith("comms");
    const { buffer, issues } = updateVoiceTurnConfirmation(b, "nope", "confirm");
    expect(issues).toContain("TURN_NOT_FOUND");
    expect(buffer).toBe(b);
  });

  it("a blocked turn cannot become executable on confirm", () => {
    const { buffer } = updateVoiceTurnConfirmation(bufferWith("unknown"), "t1", "confirm");
    const t = latestVoiceTurn(buffer);
    expect(t?.status).toBe("blocked");
    expect(t?.external_write_performed).toBe(false);
  });
});

describe("clearVoiceTurnBuffer + hygiene", () => {
  it("15. clears the turns", () => {
    let b = createVoiceTurnBuffer({ created_at: AT });
    b = addVoiceTurn(b, turn("comms"));
    expect(clearVoiceTurnBuffer(b).turns).toHaveLength(0);
  });

  it("16/17/18/19. no storage refs, no raw-audio fields, no AVP²/Federation, no external write", () => {
    let b = createVoiceTurnBuffer({ created_at: AT });
    for (const route of ["chat", "comms", "approval", "action_runtime", "reminder", "note_capture", "ask_twin", "unknown"] as VoiceSafetyRoute[]) {
      b = addVoiceTurn(b, turn(route, "do the thing", `id-${route}`));
    }
    const blob = JSON.stringify(b).toLowerCase();
    expect(blob).not.toContain("localstorage");
    expect(blob).not.toContain("sessionstorage");
    expect(blob).not.toContain("indexeddb");
    expect(blob).not.toContain("avp");
    expect(blob).not.toContain("federation");
    expect(blob).not.toContain("cosmp");
    // No raw-audio fields beyond the explicit raw_audio_present:false flags.
    const t = latestVoiceTurn(b);
    const keys = Object.keys(t ?? {});
    expect(keys).not.toContain("audio");
    expect(keys).not.toContain("audio_blob");
    expect(keys).not.toContain("waveform");
    // Every turn + the buffer is non-persistent and writes nothing.
    expect(b.persisted).toBe(false);
    expect(b.raw_audio_present).toBe(false);
    for (const turnItem of b.turns) {
      expect(turnItem.external_write_performed).toBe(false);
      expect(turnItem.persisted).toBe(false);
    }
  });
});
