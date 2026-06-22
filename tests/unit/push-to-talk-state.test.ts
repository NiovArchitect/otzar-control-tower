// FILE: tests/unit/push-to-talk-state.test.ts
// PURPOSE: Phase OTZAR-RETURN-4 — lock the push-to-talk capture state machine:
//          capture is only ever reached EXPLICITLY (idle -> arming -> listening),
//          there is no background/always-on path, transitions are total (never
//          throw), copy never claims always-on/wake-word listening, and a
//          captured turn produces a transcript-only event.
// CONNECTS TO: src/lib/voice/push-to-talk-state.ts.

import { describe, expect, it } from "vitest";
import {
  pushToTalkTransition,
  isCapturing,
  describePushToTalkState,
  pushToTalkStateLabel,
  pushToTalkCaptureEvent,
  type PushToTalkState,
  type PushToTalkEvent,
} from "@/lib/voice/push-to-talk-state";

const ALL_STATES: PushToTalkState[] = [
  "idle",
  "permission_required",
  "permission_denied",
  "arming",
  "listening",
  "captured",
  "blocked",
  "error",
];

describe("pushToTalkTransition — explicit, deterministic capture", () => {
  it("a full happy path: idle -> arming -> listening -> captured -> idle", () => {
    let s: PushToTalkState = "idle";
    s = pushToTalkTransition(s, "ARM");
    expect(s).toBe("arming");
    s = pushToTalkTransition(s, "PERMISSION_GRANTED");
    expect(s).toBe("listening");
    s = pushToTalkTransition(s, "TRANSCRIPT_CAPTURED");
    expect(s).toBe("captured");
    s = pushToTalkTransition(s, "RESET");
    expect(s).toBe("idle");
  });

  it("capture is NEVER reached without an explicit ARM (no background path)", () => {
    // From idle, none of these begin listening — only ARM moves forward.
    for (const ev of ["PERMISSION_GRANTED", "START_LISTENING", "TRANSCRIPT_CAPTURED", "RESET", "STOP"] as PushToTalkEvent[]) {
      expect(pushToTalkTransition("idle", ev)).toBe("idle");
    }
    // And ARM lands in `arming`, NOT directly in `listening`.
    expect(pushToTalkTransition("idle", "ARM")).toBe("arming");
  });

  it("permission denial routes to permission_denied, not listening", () => {
    expect(pushToTalkTransition("arming", "PERMISSION_DENIED")).toBe("permission_denied");
  });

  it("CANCEL from any state returns to idle", () => {
    for (const s of ALL_STATES) {
      expect(pushToTalkTransition(s, "CANCEL")).toBe("idle");
    }
  });

  it("BLOCKED and ERROR are reachable from any state and RESET clears them", () => {
    for (const s of ALL_STATES) {
      expect(pushToTalkTransition(s, "BLOCKED")).toBe("blocked");
      expect(pushToTalkTransition(s, "ERROR")).toBe("error");
    }
    expect(pushToTalkTransition("blocked", "RESET")).toBe("idle");
    expect(pushToTalkTransition("error", "RESET")).toBe("idle");
    expect(pushToTalkTransition("permission_denied", "RESET")).toBe("idle");
  });

  it("captured can re-arm for another explicit capture", () => {
    expect(pushToTalkTransition("captured", "ARM")).toBe("arming");
  });

  it("listening stops back to idle on STOP", () => {
    expect(pushToTalkTransition("listening", "STOP")).toBe("idle");
  });

  it("is total — an unhandled (state,event) pair returns the state unchanged and never throws", () => {
    expect(pushToTalkTransition("listening", "ARM")).toBe("listening");
    expect(pushToTalkTransition("captured", "PERMISSION_GRANTED")).toBe("captured");
    expect(pushToTalkTransition("blocked", "ARM")).toBe("blocked");
  });
});

describe("isCapturing", () => {
  it("is true only while listening", () => {
    for (const s of ALL_STATES) {
      expect(isCapturing(s)).toBe(s === "listening");
    }
  });
});

describe("describePushToTalkState — honest copy", () => {
  it("the idle copy makes explicit there is no background listening", () => {
    expect(describePushToTalkState("idle").toLowerCase()).toContain("no background listening");
  });

  it("no state's copy ever claims always-on / wake-word / on-device listening", () => {
    for (const s of ALL_STATES) {
      const copy = describePushToTalkState(s).toLowerCase();
      expect(copy).not.toContain("always listening");
      expect(copy).not.toContain("always-on");
      expect(copy).not.toContain("wake word");
      expect(copy).not.toContain("wake-word");
      expect(copy).not.toContain("on-device");
    }
  });

  it("captured copy states Otzar received transcript text only", () => {
    expect(describePushToTalkState("captured").toLowerCase()).toContain("transcript text only");
  });

  it("provides a short badge label for each state", () => {
    expect(pushToTalkStateLabel("listening")).toBe("Listening");
    expect(pushToTalkStateLabel("permission_denied")).toBe("Mic declined");
    expect(pushToTalkStateLabel("permission_required")).toBe("Permission needed");
  });
});

describe("pushToTalkCaptureEvent — transcript only", () => {
  it("produces a push_to_talk capture event that never carries audio", () => {
    const ev = pushToTalkCaptureEvent("remind me tomorrow", "desktop_browser", "2026-06-22T00:00:00.000Z");
    expect(ev.capture_mode).toBe("push_to_talk");
    expect(ev.audio_sent_to_otzar).toBe(false);
    expect(ev.otzar_receives).toBe("transcript_text_only");
    expect(ev.intended_route).toBe("reminder");
    expect(ev.transcript_present).toBe(true);
  });

  it("an empty transcript yields transcript_present false and route unknown", () => {
    const ev = pushToTalkCaptureEvent("  ", "desktop_browser", "2026-06-22T00:00:00.000Z");
    expect(ev.transcript_present).toBe(false);
    expect(ev.intended_route).toBe("unknown");
  });
});
