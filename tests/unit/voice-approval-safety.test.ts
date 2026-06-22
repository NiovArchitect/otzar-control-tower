// FILE: tests/unit/voice-approval-safety.test.ts
// PURPOSE: Phase OTZAR-RETURN-5 — lock the voice approval safety model: route
//          risk classification, privileged-route confirmation gating, a
//          draft/proposed action that NEVER performs an external write, and a
//          confirm/decline/expire flow that stays local. No API, no send, no
//          approve, no task change, no raw audio, no AVP²/Federation strings.
// CONNECTS TO: src/lib/voice/voice-approval-safety.ts.

import { describe, expect, it } from "vitest";
import {
  voiceRouteSafetyLevel,
  requiresVoiceConfirmation,
  createVoiceProposedAction,
  applyVoiceConfirmation,
  voiceConfirmationCopy,
  type VoiceSafetyRoute,
} from "@/lib/voice/voice-approval-safety";

const AT = "2026-06-22T00:00:00.000Z";
function propose(route: VoiceSafetyRoute, transcript = "do the thing") {
  return createVoiceProposedAction({ transcript, route, created_at: AT });
}

describe("voiceRouteSafetyLevel + requiresVoiceConfirmation", () => {
  it("1. chat is informational and does not require confirmation", () => {
    expect(voiceRouteSafetyLevel("chat")).toBe("informational");
    expect(requiresVoiceConfirmation("chat")).toBe(false);
  });

  it("2. ask_twin is informational and does not require confirmation", () => {
    expect(voiceRouteSafetyLevel("ask_twin")).toBe("informational");
    expect(requiresVoiceConfirmation("ask_twin")).toBe(false);
  });

  it("3. note_capture is draft_only and does not require privileged confirmation", () => {
    expect(voiceRouteSafetyLevel("note_capture")).toBe("draft_only");
    expect(requiresVoiceConfirmation("note_capture")).toBe(false);
  });

  it("4. comms requires confirmation", () => {
    expect(voiceRouteSafetyLevel("comms")).toBe("confirm_required");
    expect(requiresVoiceConfirmation("comms")).toBe(true);
  });

  it("5. approval requires confirmation", () => {
    expect(voiceRouteSafetyLevel("approval")).toBe("confirm_required");
    expect(requiresVoiceConfirmation("approval")).toBe(true);
  });

  it("6. action_runtime requires confirmation", () => {
    expect(voiceRouteSafetyLevel("action_runtime")).toBe("confirm_required");
    expect(requiresVoiceConfirmation("action_runtime")).toBe(true);
  });

  it("7. reminder requires confirmation", () => {
    expect(voiceRouteSafetyLevel("reminder")).toBe("confirm_required");
    expect(requiresVoiceConfirmation("reminder")).toBe(true);
  });

  it("8. unknown is blocked", () => {
    expect(voiceRouteSafetyLevel("unknown")).toBe("blocked");
    expect(requiresVoiceConfirmation("unknown")).toBe(false);
  });
});

describe("createVoiceProposedAction — drafts only, never executes", () => {
  it("9. never sets external_write_performed true for any route", () => {
    for (const route of ["chat", "ask_twin", "note_capture", "comms", "approval", "action_runtime", "reminder", "unknown"] as VoiceSafetyRoute[]) {
      expect(propose(route).external_write_performed).toBe(false);
    }
  });

  it("10. comms proposed action says review and confirm before sending", () => {
    const a = propose("comms");
    expect(a.proposed_next_step.toLowerCase()).toContain("review and confirm before sending");
    expect(a.confirmation_state).toBe("required");
    expect(a.can_execute_without_confirmation).toBe(false);
  });

  it("11. approval proposed action says confirm before approving/declining", () => {
    const a = propose("approval");
    expect(a.proposed_next_step.toLowerCase()).toContain("confirm before approving or declining");
  });

  it("12. action_runtime proposed action says confirm before changing work state", () => {
    const a = propose("action_runtime");
    expect(a.proposed_next_step.toLowerCase()).toContain("confirm before changing work state");
  });

  it("13. unknown proposed action is blocked", () => {
    const a = propose("unknown");
    expect(a.safety_level).toBe("blocked");
    expect(a.confirmation_state).toBe("blocked");
    expect(a.can_execute_without_confirmation).toBe(false);
  });

  it("informational routes are not_required and may execute without a gate", () => {
    const chat = propose("chat");
    expect(chat.confirmation_state).toBe("not_required");
    expect(chat.can_execute_without_confirmation).toBe(true);
  });
});

describe("applyVoiceConfirmation — local only, never an external write", () => {
  it("14. confirm on a privileged action sets confirmed (and no external write)", () => {
    const { action } = applyVoiceConfirmation(propose("comms"), "confirm");
    expect(action.confirmation_state).toBe("confirmed");
    expect(action.external_write_performed).toBe(false);
  });

  it("15. decline sets declined", () => {
    const { action } = applyVoiceConfirmation(propose("approval"), "decline");
    expect(action.confirmation_state).toBe("declined");
    expect(action.external_write_performed).toBe(false);
  });

  it("16. expire sets expired", () => {
    const { action } = applyVoiceConfirmation(propose("reminder"), "expire");
    expect(action.confirmation_state).toBe("expired");
  });

  it("17. a blocked route cannot confirm into an executable state", () => {
    const { action, issues } = applyVoiceConfirmation(propose("unknown"), "confirm");
    expect(action.confirmation_state).toBe("blocked");
    expect(action.external_write_performed).toBe(false);
    expect(issues).toContain("ROUTE_BLOCKED_NEEDS_CLARIFICATION");
  });

  it("18. an informational action never becomes an external write on confirm", () => {
    const { action, issues } = applyVoiceConfirmation(propose("chat"), "confirm");
    expect(action.confirmation_state).toBe("not_required");
    expect(action.external_write_performed).toBe(false);
    expect(issues).toContain("NO_CONFIRMATION_REQUIRED_FOR_ROUTE");
  });

  it("voiceConfirmationCopy is honest across states", () => {
    expect(voiceConfirmationCopy(propose("comms"))).toMatch(/confirmation required/i);
    expect(voiceConfirmationCopy(applyVoiceConfirmation(propose("comms"), "confirm").action)).toMatch(/no external write has been performed/i);
    expect(voiceConfirmationCopy(applyVoiceConfirmation(propose("comms"), "decline").action)).toMatch(/declined/i);
    expect(voiceConfirmationCopy(propose("unknown"))).toMatch(/clarification/i);
    expect(voiceConfirmationCopy(propose("chat"))).toMatch(/no privileged action/i);
    expect(voiceConfirmationCopy(propose("note_capture"))).toMatch(/draft created for review/i);
  });
});

describe("model output hygiene", () => {
  it("19. output contains no AVP²/Federation/protocol references", () => {
    const blob = JSON.stringify(
      (["chat", "ask_twin", "note_capture", "comms", "approval", "action_runtime", "reminder", "unknown"] as VoiceSafetyRoute[]).map(
        (r) => applyVoiceConfirmation(propose(r), "confirm").action,
      ),
    ).toLowerCase();
    expect(blob).not.toContain("avp");
    expect(blob).not.toContain("federation");
    expect(blob).not.toContain("cosmp");
    expect(blob).not.toContain("protocol");
  });

  it("20. proposed action carries no raw-audio fields", () => {
    const a = propose("comms");
    const keys = Object.keys(a);
    expect(keys).not.toContain("audio");
    expect(keys).not.toContain("audio_blob");
    expect(keys).not.toContain("waveform");
    // It carries the transcript text only.
    expect(a.transcript_text).toBe("do the thing");
  });
});
