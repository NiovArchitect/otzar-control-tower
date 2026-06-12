// FILE: diagnostics.ts
// PURPOSE: Pure helpers that turn raw browser / Tauri / Foundation
//          status signals into honest, actionable copy strings for
//          the voice UI. Used by AmbientOtzarBar + /app/voice.
//
//          Lives outside the React tree so the strings can be
//          unit-tested without rendering a component.
//
// CONNECTS TO:
//   - src/components/otzar/AmbientOtzarBar.tsx
//   - src/pages/app/Voice.tsx
//   - tests/unit/voice-diagnostics.test.ts

import type { MicrophonePermissionState } from "@/hooks/useMicrophonePermission";

export type VoiceShellMode =
  | "browser_chromium" // Chrome / Edge / brave — full mic + STT + perms API
  | "browser_other" // Firefox / Safari — partial; mic via getUserMedia, no perms API
  | "tauri_webview" // Tauri WKWebView on macOS — no perms API, no STT typically
  | "unknown";

/**
 * Detect which shell the operator is using.
 *
 * Tauri injects `window.__TAURI__` (Tauri 1.x) /
 * `window.__TAURI_INTERNALS__` (Tauri 2.x). We check both. If neither
 * is present, we assume browser and disambiguate Chromium vs other.
 */
export function detectShellMode(): VoiceShellMode {
  if (typeof window === "undefined") return "unknown";
  const anyWin = window as unknown as {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
    chrome?: { runtime?: unknown };
  };
  if (anyWin.__TAURI__ !== undefined || anyWin.__TAURI_INTERNALS__ !== undefined) {
    return "tauri_webview";
  }
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Chrome|Edg|Brave/.test(ua) && !/Mobile/.test(ua)) {
    return "browser_chromium";
  }
  return "browser_other";
}

export interface MicCopy {
  /** Short line for the permission-state row. */
  headline: string;
  /** Longer copy giving the operator the next concrete step. */
  detail: string;
  /** True when the Request-permission button SHOULD be shown. */
  showRequestButton: boolean;
  /** True when the mic button itself should be enabled. */
  micButtonEnabled: boolean;
  /** Closed-vocab tone for color choice. */
  tone: "ok" | "warn" | "error" | "muted";
}

/**
 * Translate (shell, permission-state, STT-supported) → honest copy.
 * Never claims a path will work that we know will throw `not-allowed`.
 */
export function micCopyFor(
  shell: VoiceShellMode,
  perm: MicrophonePermissionState,
  sttSupported: boolean,
): MicCopy {
  // Tauri WKWebView path — permission API is "unsupported" AND
  // SpeechRecognition typically isn't there either. Be honest +
  // direct the operator to Chrome or typed-transcript.
  if (shell === "tauri_webview") {
    // Phase 1253: typed input is the quiet fallback, never a
    // technical warning. No "browser microphone API", no URLs, no
    // "forward-substrate" in the employee's face.
    return {
      headline: "Type to Otzar — voice on desktop is coming",
      detail:
        "Typing works exactly the same: Otzar listens, helps, and asks before acting. Native desktop voice is on the way; voice also works today in your browser.",
      showRequestButton: false,
      micButtonEnabled: false,
      tone: "muted",
    };
  }
  if (!sttSupported) {
    return {
      headline: "Voice input unavailable in this browser",
      detail:
        "Your browser does not expose the Web Speech API. Open Otzar in Chrome for live microphone input, or type your message below.",
      showRequestButton: false,
      micButtonEnabled: false,
      tone: "warn",
    };
  }
  // STT IS supported (Chromium-class browser). Now branch on
  // permission state.
  switch (perm) {
    case "granted":
      return {
        headline: "Microphone permission: granted",
        detail: "Click the microphone to speak to Otzar.",
        showRequestButton: false,
        micButtonEnabled: true,
        tone: "ok",
      };
    case "denied":
      return {
        headline: "Microphone was blocked by this browser",
        detail:
          "Enable microphone access for localhost in your browser's site settings (lock icon → Permissions → Microphone → Allow), then refresh. Until then, type your message below.",
        showRequestButton: false,
        micButtonEnabled: false,
        tone: "error",
      };
    case "prompt":
      return {
        headline: "Microphone permission: not yet granted",
        detail:
          "Click 'Request microphone permission' below — your browser will show the OS-level prompt.",
        showRequestButton: true,
        micButtonEnabled: false,
        tone: "warn",
      };
    case "unsupported":
      // Chromium-ish UA but Permissions API doesn't expose mic name.
      // Mic START may still work — surface that path explicitly.
      return {
        headline:
          "Microphone permission status not reported by this browser",
        detail:
          "Click the microphone — your browser will prompt directly. If you see 'not-allowed', enable microphone access for localhost in your browser's site settings.",
        showRequestButton: false,
        micButtonEnabled: sttSupported,
        tone: "warn",
      };
    case "unknown":
    default:
      return {
        headline: "Checking microphone permission…",
        detail: "",
        showRequestButton: false,
        micButtonEnabled: false,
        tone: "muted",
      };
  }
}

/**
 * Translate a raw SpeechRecognition error code into actionable copy.
 * The browser emits a small closed-vocab set: not-allowed,
 * service-not-allowed, no-speech, audio-capture, network, aborted,
 * language-not-supported, bad-grammar.
 */
export function speechRecognitionErrorCopy(error: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone was blocked by this shell. Open Otzar in your browser for mic input, or type your message instead.";
    case "no-speech":
      return "No speech detected. Try again, closer to the microphone.";
    case "audio-capture":
      return "No microphone device detected. Check your input device, then try again.";
    case "network":
      return "Browser STT requires network access for some implementations. Check your connection or type your message.";
    case "aborted":
      return "Voice input was cancelled.";
    case "language-not-supported":
      return "Browser STT does not support the configured language. Type your message instead.";
    default:
      return `Voice input error (${error}). Try again or type your message.`;
  }
}

/**
 * Translate a Foundation voice-intent failure code into actionable
 * copy. Foundation emits LLM_UNAVAILABLE when the provider returns
 * an error; we expand that into a clearer instruction.
 */
export function llmErrorCopy(code: string): string {
  switch (code) {
    case "LLM_UNAVAILABLE":
      // Phase 1253: setup mode, not a broken brain. Provider/key
      // details live behind the admin Integrations surface, never in
      // the employee's face.
      return "Otzar is in setup mode — the AI provider isn't connected yet. Everything else keeps working, and an admin can finish setup in Integrations.";
    case "OTZAR_BUSY_TRY_AGAIN":
      return "Otzar is catching its breath — try again in a moment. Nothing was lost.";
    case "BUDGET_TOO_LARGE":
      return "That message is a little long. Trim it and try again.";
    case "INVALID_REQUEST":
      return "Something looked off about that request. Refresh and try again.";
    case "SESSION_INVALID":
    case "SESSION_EXPIRED":
    case "SESSION_REVOKED":
    case "SESSION_INVALIDATED":
      return "Your session expired. Sign in again.";
    default:
      // Plain recovery copy with a small support reference — never a
      // raw backend error sentence.
      return `Otzar couldn't finish that — try again in a moment. (ref: ${code})`;
  }
}

export interface TtsHealth {
  supported: boolean;
  muted: boolean;
  lastTest: "untested" | "spoken" | "no_audio" | "error";
  copy: string;
}

export function ttsHealthCopy(
  supported: boolean,
  muted: boolean,
  lastTest: TtsHealth["lastTest"],
): TtsHealth {
  if (!supported) {
    return {
      supported,
      muted,
      lastTest,
      copy: "Speech output is unavailable in this shell. Otzar's responses are shown as text — your device cannot speak them.",
    };
  }
  if (muted) {
    return {
      supported,
      muted,
      lastTest,
      copy: "Speech output is muted. Click the speaker icon to unmute.",
    };
  }
  switch (lastTest) {
    case "spoken":
      return {
        supported,
        muted,
        lastTest,
        copy: "Speech output is active. Otzar will speak responses through your device.",
      };
    case "no_audio":
      return {
        supported,
        muted,
        lastTest,
        copy: "Your device reported the test spoke, but you may not have heard audio. Check your Mac output volume + the output device.",
      };
    case "error":
      return {
        supported,
        muted,
        lastTest,
        copy: "Speech output did not start. Check your Mac output volume, or fall back to reading the text response.",
      };
    case "untested":
    default:
      return {
        supported,
        muted,
        lastTest,
        copy: "Speech output is available — click 'Test Otzar voice' to confirm audio.",
      };
  }
}
