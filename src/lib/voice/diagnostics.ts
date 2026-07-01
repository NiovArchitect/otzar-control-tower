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

// ────────────────────────────────────────────────────────────────
// P0G — browser voice → server STT fallback (pure decision logic).
// The MediaRecorder→server transcription path (previously desktop-
// only) is now available to browsers as a FALLBACK when the Web
// Speech API fails, and as the PRIMARY voice path when Web Speech
// is unavailable (e.g. Firefox / Safari). These helpers are pure so
// the decision matrix is unit-testable without rendering anything.
// ────────────────────────────────────────────────────────────────

/** Which speech-to-text engine a voice surface should route the mic to. */
export type SttPath =
  | "desktop_capture" // Tauri shell: existing MediaRecorder→server flow, unchanged
  | "web_speech" // browser: in-browser Web Speech API (existing default)
  | "server_stt" // browser: MediaRecorder→server transcription fallback
  | "text_only"; // nothing can capture audio — typing always works

export interface SttPathInput {
  /** Current shell per detectShellMode(). */
  shell: VoiceShellMode;
  /** True when SpeechRecognition / webkitSpeechRecognition exists. */
  webSpeechAvailable: boolean;
  /** True when getUserMedia + MediaRecorder exist (server STT capture). */
  recorderAvailable: boolean;
  /**
   * True once this surface saw Web Speech fail with a "network" error
   * this session — from then on we go straight to server STT instead
   * of flapping between the two engines.
   */
  serverSttPreferred: boolean;
}

// WHAT: decide which STT engine the mic button should drive.
// INPUT: shell + capability + session-preference flags (see SttPathInput).
// OUTPUT: closed-vocab SttPath.
// WHY: one pure, exhaustively-testable gate instead of scattered
//      conditionals. The Tauri desktop path is preserved EXACTLY:
//      tauri_webview + recorder → "desktop_capture" (never web speech).
export function decideSttPath(input: SttPathInput): SttPath {
  if (input.shell === "tauri_webview") {
    // Desktop keeps its existing capture flow, unchanged. No Web
    // Speech in WKWebView; typing remains the fallback when the
    // recorder is missing.
    return input.recorderAvailable ? "desktop_capture" : "text_only";
  }
  // Browser shells: Web Speech first (when it works), server STT when
  // Web Speech is unavailable OR has already failed this session.
  if (input.webSpeechAvailable && !input.serverSttPreferred) {
    return "web_speech";
  }
  if (input.recorderAvailable) return "server_stt";
  // Recorder missing but Web Speech exists (even though it failed
  // before) — it is still better than nothing; retrying it beats
  // silently losing voice.
  if (input.webSpeechAvailable) return "web_speech";
  return "text_only";
}

// WHAT: decide whether a Web Speech failure should trigger ONE automatic
//       switch to the server STT capture path.
// INPUT: shell, the raw SpeechRecognition error code, recorder capability,
//        and whether this surface already auto-fell-back this session.
// OUTPUT: true → start server STT capture now (once); false → show copy only.
// WHY: the "network" error means the browser's own speech service is
//      unreachable while the mic itself may be fine — exactly the case
//      the server transcription route exists for. We fall back at most
//      once per surface per session; afterwards decideSttPath (with
//      serverSttPreferred=true) routes to server STT directly, so the
//      two engines never flap.
export function shouldAutoFallbackToServerStt(input: {
  shell: VoiceShellMode;
  webSpeechError: string | null;
  recorderAvailable: boolean;
  alreadyFellBackThisSession: boolean;
}): boolean {
  if (input.shell === "tauri_webview") return false; // desktop never ran Web Speech
  if (input.webSpeechError !== "network") return false;
  if (!input.recorderAvailable) return false;
  return !input.alreadyFellBackThisSession;
}

/** Honest state note shown after a server transcription lands in the
 *  draft (browser fallback path — the user reviews before sending). */
export const SERVER_STT_TRANSCRIBED_NOTE =
  "Transcribed via server — review your words, then send.";

/**
 * Translate (shell, permission-state, STT-supported) → honest copy.
 * Never claims a path will work that we know will throw `not-allowed`.
 */
export function micCopyFor(
  shell: VoiceShellMode,
  perm: MicrophonePermissionState,
  sttSupported: boolean,
  /** P0G: true when the MediaRecorder→server transcription fallback can
   *  run in this shell (getUserMedia + MediaRecorder present). Optional
   *  so every pre-P0G call site keeps its exact behavior. */
  serverSttAvailable = false,
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
    // P0G: browsers without Web Speech (Firefox, Safari) can still speak
    // to Otzar — the mic records and Otzar transcribes on its secure
    // server. Only claim that when the recorder actually exists.
    if (serverSttAvailable) {
      return {
        headline: "Voice is ready in this browser",
        detail:
          "Click the microphone and talk. Otzar transcribes your words securely and puts the text here for you to review before sending.",
        showRequestButton: false,
        micButtonEnabled: true,
        tone: "ok",
      };
    }
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
      // P0G: this error means the browser's own speech service is
      // unreachable — Otzar automatically retries through its secure
      // server transcription when the mic can record.
      return "Your browser's speech service couldn't be reached over the network. Otzar will retry with secure server transcription — you can also type your message.";
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

/**
 * Phase 1264 / [OTZAR-V1-LIVE-4] — honest copy for the server-side
 * (MediaRecorder → Foundation → ElevenLabs Scribe) transcription path.
 * Closed-vocab failure codes from the Foundation /otzar/voice/transcribe
 * route + the client-side capture states. Never a raw provider/stack
 * message; never a fake "configured". Typing always remains available.
 */
export function transcribeErrorCopy(code: string): string {
  switch (code) {
    // [OTZAR-V1-LIVE-4] Foundation /otzar/voice/transcribe codes.
    case "VOICE_STT_PROVIDER_NOT_CONFIGURED":
      return "Voice transcription is not configured on this deployment yet. Text input remains available.";
    case "UNSUPPORTED_STT_PROVIDER":
      return "The configured speech provider isn't supported. An admin can set ElevenLabs in the deployment. Typing works today.";
    case "PROVIDER_ERROR":
      return "The speech provider couldn't transcribe that. Try again in a moment, or type your message.";
    case "INVALID_AUDIO_TYPE":
      return "That recording's format isn't supported. Try again, or type your message.";
    case "AUDIO_TOO_LARGE":
      return "That recording was too long. Try a shorter utterance, or type your message.";
    case "EMPTY_AUDIO":
      return "I didn't catch any audio. Try again, a little closer to the mic.";
    case "INVALID_REQUEST":
      return "That recording didn't come through. Try again, or type your message.";
    case "STT_NOT_CONFIGURED":
      return "Speech transcription isn't configured yet. An admin can add the provider key in Integrations — typing works fully today.";
    case "STT_PROVIDER_AUTH_FAILED":
      return "Speech transcription isn't authorized. An admin should check the OpenAI project/key. Typing works while this is fixed.";
    case "STT_PROVIDER_BILLING":
      return "Speech transcription needs OpenAI billing attention. Typing works while this is fixed.";
    case "STT_PROVIDER_RATE_LIMITED":
      return "Speech transcription is rate-limited right now. Try again shortly — typing works in the meantime.";
    case "STT_MODEL_UNAVAILABLE":
      return "The transcription model isn't available for this OpenAI project. An admin can check model access. Typing works today.";
    case "STT_BAD_AUDIO":
      return "That recording couldn't be read. Try again, a little closer to the mic.";
    case "STT_PROVIDER_UNAVAILABLE":
      return "The speech provider didn't respond. Try again in a moment, or type your message.";
    case "STT_NO_SPEECH":
      return "I didn't catch any speech. Try again, a little closer to the mic.";
    case "INVALID_AUDIO":
      return "That recording didn't come through. Try again, or type your message.";
    case "MIC_BLOCKED":
      return "Microphone access is blocked. Enable microphone access for Otzar in macOS Settings → Privacy & Security → Microphone.";
    case "MIC_UNSUPPORTED":
      return "This shell can't record audio. Type your message — Otzar routes it the same way.";
    case "NETWORK_ERROR":
      return "Otzar cannot reach the local Foundation API. Start the API or check the desktop API URL, then try again.";
    default:
      return `Voice transcription couldn't finish — try again or type your message. (ref: ${code})`;
  }
}

/**
 * [OTZAR-V1-LIVE-4] Honest disclosure shown when the server-side speech path is
 * the active transcription engine (i.e. not the in-browser Web Speech API).
 * Surfaces, in plain language, that audio leaves the browser to the configured
 * provider and that Otzar keeps only the transcript text — never raw audio.
 */
export const SERVER_STT_DISCLOSURE =
  "Audio is sent to the configured ElevenLabs speech provider for transcription. Otzar stores transcript text, not raw audio.";

/** Honest disclosure shown when the browser's own Web Speech API produces the
 *  transcript (no Otzar/provider key involved; the browser's vendor does STT). */
export const BROWSER_STT_DISCLOSURE =
  "Your browser provides speech recognition. Otzar receives transcript text.";

// WHAT: pick the right speech disclosure for the active transcription engine.
// INPUT: the provider label the bar recorded ("LOCAL_BROWSER" vs a server one).
// OUTPUT: honest one-line copy.
export function sttDisclosureCopy(provider: string | null): string {
  return provider === "LOCAL_BROWSER" || provider === null
    ? BROWSER_STT_DISCLOSURE
    : SERVER_STT_DISCLOSURE;
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
