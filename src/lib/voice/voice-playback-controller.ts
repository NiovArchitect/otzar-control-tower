// FILE: voice-playback-controller.ts
// PURPOSE: Phase 1264 — THE single voice-output engine. Fixes the
//          "computer voice first, premium voice second", the
//          double-speaking, and the "quick re-prompt falls back to the
//          robot voice" bugs the Founder hit. Before this, every speak
//          site fired an UNTRACKED `new Audio()` (premium) plus a
//          SEPARATE, uncoordinated `speechSynthesis` (device) — so two
//          utterances could overlap and a slow/failed second premium
//          fetch dropped straight to the device voice.
//
// CONTRACT:
//   - ONE active utterance at a time. Each new speak() first cancels
//     the previous: aborts the in-flight premium fetch, stops the
//     playing premium <audio>, AND silences the global device
//     speechSynthesis.
//   - PREMIUM FIRST. The device voice fires ONLY after premium fails
//     or times out — and ONLY if this utterance is still the current
//     one (a newer prompt cancels the older's fallback so the robot
//     voice never speaks "second").
//   - INSTRUMENTED. getLastVoicePath() records which path actually
//     spoke: premium_voice / fallback_device_voice / muted / failed.
//     Diagnostics carry provider + byte count only — never the key,
//     never anything beyond the text the caller chose to speak.
// CONNECTS TO: premium-tts.ts (re-exports), AmbientOtzarBar,
//          VoiceProviders, tests/unit/voice-playback-controller.test.ts.

import { useAuthStore } from "@/lib/stores/auth";

const BASE =
  import.meta.env.VITE_FOUNDATION_API_URL ?? "http://localhost:3000/api/v1";

/** Premium fetch is abandoned after this long so a hung provider can
 *  never strand the user in silence — the device fallback takes over. */
const PREMIUM_TIMEOUT_MS = 7000;

export type PremiumSpeakOutcome =
  | { kind: "PREMIUM"; provider: string }
  | { kind: "FALLBACK_NEEDED"; reason: "NOT_CONFIGURED" | "UNAVAILABLE" };

/** Which path actually produced sound for the last utterance. */
export type VoicePlaybackPath =
  | "premium_voice"
  | "fallback_device_voice"
  | "muted"
  | "failed";

// ── Single-active-utterance module state ──────────────────────────
// Monotonic counter: every new utterance increments it. An in-flight
// premium fetch compares its captured value against the live counter
// after each await; a mismatch means a newer utterance superseded it,
// so it must not play stale audio or trigger a stale fallback.
let generation = 0;
let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;
let activeAbort: AbortController | null = null;
let lastPath: VoicePlaybackPath | null = null;

/** Cut all current playback: premium <audio>, the in-flight premium
 *  fetch, and the global device speechSynthesis. Safe to call when
 *  nothing is playing. Never throws. */
function teardownActive(): void {
  if (activeAudio !== null) {
    const a = activeAudio;
    activeAudio = null;
    try {
      a.onended = null;
      a.onerror = null;
    } catch {
      /* property assignment can't really throw, but stay defensive */
    }
    try {
      a.pause?.();
    } catch {
      /* stubbed/ended audio */
    }
  }
  if (activeUrl !== null) {
    try {
      URL.revokeObjectURL(activeUrl);
    } catch {
      /* URL may be stubbed in tests */
    }
    activeUrl = null;
  }
  if (activeAbort !== null) {
    try {
      activeAbort.abort();
    } catch {
      /* already aborted */
    }
    activeAbort = null;
  }
  // The device voice is a GLOBAL queue — silence it on every cut so a
  // half-spoken device utterance can never overlap the next one.
  try {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  } catch {
    /* speechSynthesis absent (jsdom / unsupported shell) */
  }
}

/** Stop everything Otzar is saying right now and invalidate any
 *  in-flight premium fetch. Bound to the orb's Stop control + the new
 *  prompt path so a follow-up never double-speaks. */
export function cancelVoicePlayback(): void {
  generation++;
  teardownActive();
}

/** The path that produced the last utterance — for the honest UI
 *  label ("Premium voice" vs "Device fallback"). */
export function getLastVoicePath(): VoicePlaybackPath | null {
  return lastPath;
}

// WHAT: Fetch premium provider audio for `text` and play it through the
//       single controlled <audio>, honoring cancellation.
// INPUT: text + the generation this call owns.
// OUTPUT: PREMIUM when provider audio actually started; FALLBACK_NEEDED
//         otherwise. Never throws.
// WHY: kept private so speakPremium + speakWithOtzarVoice share exactly
//      one premium path with one timeout and one cancellation model.
async function playPremium(
  text: string,
  myGen: number,
  events?: PlaybackEvents,
): Promise<PremiumSpeakOutcome> {
  const token = useAuthStore.getState().token;
  if (token === null || token.length === 0)
    return { kind: "FALLBACK_NEEDED", reason: "UNAVAILABLE" };
  const abort = new AbortController();
  activeAbort = abort;
  const timer = setTimeout(() => {
    try {
      abort.abort();
    } catch {
      /* already aborted */
    }
  }, PREMIUM_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/otzar/voice/tts-preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: abort.signal,
    });
    // A newer utterance superseded us mid-fetch — abandon quietly.
    if (myGen !== generation)
      return { kind: "FALLBACK_NEEDED", reason: "UNAVAILABLE" };
    if (!res.ok) {
      let reason: "NOT_CONFIGURED" | "UNAVAILABLE" = "UNAVAILABLE";
      try {
        const body = (await res.json()) as { code?: string };
        if (body.code === "TTS_NOT_CONFIGURED") reason = "NOT_CONFIGURED";
      } catch {
        /* non-JSON error body */
      }
      return { kind: "FALLBACK_NEEDED", reason };
    }
    const provider = res.headers.get("X-Voice-Provider") ?? "PROVIDER";
    const blob = await res.blob();
    if (myGen !== generation)
      return { kind: "FALLBACK_NEEDED", reason: "UNAVAILABLE" };
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    activeAudio = audio;
    activeUrl = url;
    const cleanup = (): void => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* stubbed */
      }
      if (activeAudio === audio) {
        activeAudio = null;
        activeUrl = null;
      }
      try {
        events?.onPremiumEnd?.();
      } catch {
        /* listener must never break teardown */
      }
    };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    await audio.play();
    try {
      events?.onPremiumStart?.();
    } catch {
      /* listener must never break playback */
    }
    // Safe diagnostic: provider + size only — never the key, never
    // user text beyond what the caller chose to speak.
    console.info("[otzar-voice]", {
      voice_playback_provider: provider,
      route_called: "tts-preview",
      fallback_used: false,
      audio_bytes: blob.size,
    });
    return { kind: "PREMIUM", provider };
  } catch {
    return { kind: "FALLBACK_NEEDED", reason: "UNAVAILABLE" };
  } finally {
    clearTimeout(timer);
    if (activeAbort === abort) activeAbort = null;
  }
}

// WHAT: Premium-only speak (no device fallback). Cancels any prior
//       utterance first. Backward-compatible with the Phase 1259
//       contract used by VoiceProviders "Hear it".
// OUTPUT: PREMIUM or FALLBACK_NEEDED — the caller owns the fallback.
export async function speakPremium(
  text: string,
): Promise<PremiumSpeakOutcome> {
  const myGen = ++generation;
  teardownActive();
  const outcome = await playPremium(text, myGen);
  if (myGen === generation) {
    lastPath = outcome.kind === "PREMIUM" ? "premium_voice" : "failed";
  }
  return outcome;
}

/** Optional premium-playback lifecycle hooks so a UI can reflect an
 *  honest "Speaking…" state for premium audio (the device voice has
 *  its own reactive `speaking` flag in useSpeechSynthesis). */
export interface PlaybackEvents {
  onPremiumStart?: () => void;
  onPremiumEnd?: () => void;
}

export interface SpeakOptions extends PlaybackEvents {
  /** When true, do not speak at all (premium OR device). */
  muted?: boolean;
}

// WHAT: THE voice-output utility. Premium provider audio first; the
//       device voice ONLY as an explicit, caller-supplied fallback —
//       and only when this utterance is still the current one.
// INPUT: text + the device-voice fallback the caller owns + options.
// OUTPUT: what the premium path returned (so callers can label), with
//         the device fallback already invoked when appropriate.
// WHY: one queue, one active utterance, premium-first, no robot-voice
//      race. Every speak site routes through here.
export async function speakWithOtzarVoice(
  text: string,
  deviceFallback: (text: string) => void,
  options: SpeakOptions = {},
): Promise<PremiumSpeakOutcome> {
  const myGen = ++generation;
  teardownActive();
  if (options.muted === true) {
    lastPath = "muted";
    return { kind: "FALLBACK_NEEDED", reason: "UNAVAILABLE" };
  }
  const outcome = await playPremium(text, myGen, {
    ...(options.onPremiumStart ? { onPremiumStart: options.onPremiumStart } : {}),
    ...(options.onPremiumEnd ? { onPremiumEnd: options.onPremiumEnd } : {}),
  });
  // Superseded by a newer utterance — do NOT fire a stale device
  // fallback (this is the fix for "robot voice speaks second").
  if (myGen !== generation) return outcome;
  if (outcome.kind === "PREMIUM") {
    lastPath = "premium_voice";
    return outcome;
  }
  lastPath = "fallback_device_voice";
  console.info("[otzar-voice]", {
    voice_playback_provider: "device",
    route_called: "tts-preview",
    fallback_used: true,
    reason: outcome.reason,
  });
  deviceFallback(text);
  return outcome;
}
