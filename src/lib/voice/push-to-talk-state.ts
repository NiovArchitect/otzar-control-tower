// FILE: push-to-talk-state.ts
// PURPOSE: Phase OTZAR-RETURN-4 — the deterministic push-to-talk capture state
//          machine. The first concrete step from the RETURN-3 readiness model
//          toward real ambient capture: a small, pure, testable state machine
//          that models EXPLICIT, user-initiated voice capture (push-to-talk),
//          honestly — with NO background / always-on / wake-word listening.
//
// HONESTY INVARIANTS (load-bearing — see docs/ambient-voice-readiness.md):
//   - Capture is ALWAYS explicit. The only way into `listening` is ARM (a user
//     action) → permission granted → START_LISTENING. There is no state and no
//     transition that begins capture in the background or on a wake word.
//   - Wake-word / always-on listening is NOT implemented and NOT modelled here.
//     Push-to-talk is the honest capture model today.
//   - On capture, the produced event reuses the RETURN-3 ambient model, so
//     Otzar receives the transcript text only (audio_sent_to_otzar = false).
//   - This is Otzar PRODUCT infrastructure — not AVP², no protocol artifact.

import {
  createAmbientVoiceCaptureEvent,
  type AmbientVoiceCaptureEvent,
  type AmbientVoiceDeviceMode,
} from "@/lib/voice/ambient-voice-capture";

// The full set of states. Note the absence of any "background"/"always_on"
// state — that is the point.
export type PushToTalkState =
  | "idle" //               not capturing; waiting for an explicit press
  | "permission_required" // needs OS mic permission before it can arm
  | "permission_denied" //   the OS/user declined mic access
  | "arming" //              pressed; preparing to listen (perms in flight)
  | "listening" //           actively capturing, user-initiated, in the open
  | "captured" //            a transcript was captured; listening has stopped
  | "blocked" //             the shell/provider blocks capture here
  | "error"; //              a recoverable error occurred

export type PushToTalkEvent =
  | "ARM" //                 user presses push-to-talk
  | "PERMISSION_GRANTED"
  | "PERMISSION_DENIED"
  | "START_LISTENING" //     permission ok → begin capture
  | "TRANSCRIPT_CAPTURED"
  | "STOP" //                user releases / stops; back to idle
  | "CANCEL" //              abort from anywhere; back to idle
  | "BLOCKED"
  | "ERROR"
  | "RESET"; //              return a terminal state to idle

/** Pure, total transition. An undefined (state,event) pair returns the state
 *  unchanged — never throws, so the UI can fire events freely. CANCEL/RESET
 *  always return to idle; that is intentional and global. */
export function pushToTalkTransition(
  state: PushToTalkState,
  event: PushToTalkEvent,
): PushToTalkState {
  // Global escapes — valid from any state.
  if (event === "CANCEL") return "idle";
  if (event === "BLOCKED") return "blocked";
  if (event === "ERROR") return "error";

  switch (state) {
    case "idle":
      if (event === "ARM") return "arming";
      return state;
    case "arming":
      if (event === "PERMISSION_GRANTED" || event === "START_LISTENING") return "listening";
      if (event === "PERMISSION_DENIED") return "permission_denied";
      if (event === "STOP") return "idle";
      return state;
    case "permission_required":
      if (event === "PERMISSION_GRANTED") return "arming";
      if (event === "PERMISSION_DENIED") return "permission_denied";
      if (event === "ARM") return "arming";
      return state;
    case "listening":
      if (event === "TRANSCRIPT_CAPTURED") return "captured";
      if (event === "STOP") return "idle";
      return state;
    case "captured":
      if (event === "ARM") return "arming"; // press again to capture more
      if (event === "RESET" || event === "STOP") return "idle";
      return state;
    case "permission_denied":
    case "blocked":
    case "error":
      if (event === "RESET") return "idle";
      if (event === "ARM" && state === "blocked") return state; // stays blocked
      return state;
    default:
      return state;
  }
}

/** True only while audio is actively being captured. */
export function isCapturing(state: PushToTalkState): boolean {
  return state === "listening";
}

/** Honest, user-facing copy for each state. Never claims background / always-on
 *  listening; every line makes clear capture is explicit. */
export function describePushToTalkState(state: PushToTalkState): string {
  switch (state) {
    case "idle":
      return "Ready. Press and hold to talk — Otzar captures only while you do. No background listening.";
    case "permission_required":
      return "Microphone permission is needed before you can capture. Otzar asks once, when you press to talk.";
    case "permission_denied":
      return "Microphone access was declined. Voice capture stays off; text mode still works.";
    case "arming":
      return "Getting ready to listen…";
    case "listening":
      return "Listening — capturing while you talk. Release to stop.";
    case "captured":
      return "Captured. Otzar received the transcript text only.";
    case "blocked":
      return "Voice capture isn't available in this shell. Text mode is active.";
    case "error":
      return "Voice capture hit a snag. Text mode still works; press to try again.";
    default:
      return "Text mode is active.";
  }
}

/** Short status word for a badge. */
export function pushToTalkStateLabel(state: PushToTalkState): string {
  switch (state) {
    case "permission_required":
      return "Permission needed";
    case "permission_denied":
      return "Mic declined";
    default:
      return state.charAt(0).toUpperCase() + state.slice(1);
  }
}

/** Build the transcript-only capture event for a completed push-to-talk turn.
 *  Reuses the RETURN-3 ambient model so the honesty invariants (no raw audio)
 *  hold automatically. */
export function pushToTalkCaptureEvent(
  transcript: string,
  device_mode: AmbientVoiceDeviceMode = "desktop_browser",
  created_at?: string,
): AmbientVoiceCaptureEvent {
  return createAmbientVoiceCaptureEvent({
    transcript,
    device_mode,
    capture_mode: "push_to_talk",
    status: "ready",
    ...(created_at !== undefined ? { created_at } : {}),
  });
}
