// FILE: tests/unit/confirmed-action-handoff.test.ts
// PURPOSE: Phase OTZAR-RETURN-6 — lock the inert confirmed-action handoff: it is
//          created ONLY for genuinely-confirmed privileged turns, it never
//          executes / calls an API / performs an external write, and its copy is
//          honest. Unconfirmed / informational / draft-only / blocked turns
//          never produce one.
// CONNECTS TO: src/lib/voice/confirmed-action-handoff.ts, voice-turn-buffer.ts.

import { describe, expect, it } from "vitest";
import {
  createConfirmedVoiceActionHandoff,
  describeConfirmedActionHandoff,
} from "@/lib/voice/confirmed-action-handoff";
import {
  createVoiceTurn,
  updateVoiceTurnConfirmation,
  createVoiceTurnBuffer,
  addVoiceTurn,
  latestVoiceTurn,
  type VoiceTurn,
} from "@/lib/voice/voice-turn-buffer";
import { createAmbientVoiceCaptureEvent } from "@/lib/voice/ambient-voice-capture";
import {
  createVoiceProposedAction,
  type VoiceSafetyRoute,
} from "@/lib/voice/voice-approval-safety";

const AT = "2026-06-22T00:00:00.000Z";

function makeTurn(route: VoiceSafetyRoute): VoiceTurn {
  const capture_event = createAmbientVoiceCaptureEvent({
    transcript: "do the thing",
    device_mode: "desktop_browser",
    capture_mode: "push_to_talk",
    status: "ready",
    created_at: AT,
  });
  const proposed_action = createVoiceProposedAction({ transcript: "do the thing", route, created_at: AT });
  return createVoiceTurn({ transcript: "do the thing", capture_event, proposed_action, created_at: AT, turn_id: `t-${route}` });
}

/** A privileged turn that has been locally confirmed via the buffer flow. */
function confirmedTurn(route: VoiceSafetyRoute): VoiceTurn {
  const b = updateVoiceTurnConfirmation(
    addVoiceTurn(createVoiceTurnBuffer({ created_at: AT }), makeTurn(route)),
    `t-${route}`,
    "confirm",
  ).buffer;
  const t = latestVoiceTurn(b);
  if (t === null) throw new Error("expected a turn");
  return t;
}

describe("createConfirmedVoiceActionHandoff — only for confirmed privileged turns", () => {
  it("1-4. a confirmed comms/approval/action_runtime/reminder turn creates a handoff", () => {
    for (const route of ["comms", "approval", "action_runtime", "reminder"] as VoiceSafetyRoute[]) {
      const r = createConfirmedVoiceActionHandoff(confirmedTurn(route));
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.handoff.route).toBe(route);
        expect(r.handoff.source_turn_id).toBe(`t-${route}`);
      }
    }
  });

  it("5. an unconfirmed privileged turn does not create a handoff", () => {
    const r = createConfirmedVoiceActionHandoff(makeTurn("comms")); // still confirmation_required
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issue).toBe("TURN_NOT_CONFIRMED");
  });

  it("6. a declined turn does not create a handoff", () => {
    const b = updateVoiceTurnConfirmation(
      addVoiceTurn(createVoiceTurnBuffer({ created_at: AT }), makeTurn("approval")),
      "t-approval",
      "decline",
    ).buffer;
    const r = createConfirmedVoiceActionHandoff(latestVoiceTurn(b)!);
    expect(r.ok).toBe(false);
  });

  it("7. an informational chat turn does not create a handoff", () => {
    const r = createConfirmedVoiceActionHandoff(makeTurn("chat"));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issue).toBe("ROUTE_NOT_CONFIRM_REQUIRED");
  });

  it("8. a draft-only note_capture turn does not create a handoff", () => {
    const r = createConfirmedVoiceActionHandoff(makeTurn("note_capture"));
    expect(r.ok).toBe(false);
  });

  it("9. a blocked unknown turn does not create a handoff", () => {
    const r = createConfirmedVoiceActionHandoff(makeTurn("unknown"));
    expect(r.ok).toBe(false);
  });
});

describe("the handoff is inert", () => {
  it("10-12. external_write_performed false, governed_api_called false, execution_status not_executed", () => {
    const r = createConfirmedVoiceActionHandoff(confirmedTurn("comms"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.handoff.external_write_performed).toBe(false);
      expect(r.handoff.governed_api_called).toBe(false);
      expect(r.handoff.execution_status).toBe("not_executed");
      expect(r.handoff.ready_for_future_governed_execution).toBe(true);
      expect(r.handoff.requires_governed_runtime).toBe(true);
    }
  });

  it("13. handoff copy says no external write has been performed", () => {
    const r = createConfirmedVoiceActionHandoff(confirmedTurn("approval"));
    if (!r.ok) throw new Error("expected ok");
    expect(describeConfirmedActionHandoff(r.handoff).toLowerCase()).toContain(
      "no external write has been performed",
    );
    expect(describeConfirmedActionHandoff(null)).toMatch(/no governed action handoff is available/i);
  });

  it("14. output contains no AVP²/Federation references", () => {
    const r = createConfirmedVoiceActionHandoff(confirmedTurn("action_runtime"));
    if (!r.ok) throw new Error("expected ok");
    const blob = JSON.stringify(r.handoff).toLowerCase();
    expect(blob).not.toContain("avp");
    expect(blob).not.toContain("federation");
    expect(blob).not.toContain("cosmp");
    expect(blob).not.toContain("protocol");
  });

  it("15. no raw-audio fields and no execution side-channel keys", () => {
    const r = createConfirmedVoiceActionHandoff(confirmedTurn("reminder"));
    if (!r.ok) throw new Error("expected ok");
    const keys = Object.keys(r.handoff);
    expect(keys).not.toContain("audio");
    expect(keys).not.toContain("waveform");
    expect(keys).not.toContain("api_response");
  });
});
