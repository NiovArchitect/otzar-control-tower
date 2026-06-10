// FILE: useSpeechSynthesis.ts
// PURPOSE: Wrapper around browser `window.speechSynthesis`. Lets
//          the AmbientOtzarBar + /app/voice page speak Otzar's
//          `speech_ready_text` back to the employee using the OS
//          TTS voice without requiring a Foundation-side provider.
//
// EMERGENCY LOOP GUARD (Phase 12e per [FOUNDER-AUTH — EMERGENCY FIX:
// OTZAR TTS CONTINUOUS LOOP]):
//   - speak() now takes an explicit `source` discriminator
//     ("auto" / "test" / "replay" / "manual"). Auto-speak callers
//     get hard dedupe against the last-spoken text hash; explicit
//     user actions (test / replay / manual) get `force: true` to
//     bypass dedupe.
//   - Every speak() first calls window.speechSynthesis.cancel() so
//     duplicate utterances cannot queue. The OS keeps a queue by
//     default; we never want that for this UI.
//   - On unmount, the hook cancels any in-flight utterance —
//     navigating away from the page no longer leaves Otzar talking.
//   - resetDedupe() lets callers re-arm auto-speak after an
//     explicit user action (e.g., logout).
//
// PRIVACY INVARIANT:
//   - The text passed to speak() is the SAFE speech_ready_text
//     projection Foundation already returns — markdown stripped,
//     no chain-of-thought, no private memory.
//   - speak() does NOT echo the text to any persistent store.
//   - Muted state is held in component memory only.

import { useCallback, useEffect, useRef, useState } from "react";

function getSynth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

/**
 * Fast, allocation-light string hash so we can dedupe auto-speak
 * calls without keeping the full text in a ref. Collisions are
 * extremely unlikely for our short response strings; collisions
 * would cause at most one missed auto-speak which is the SAFE
 * direction anyway.
 */
function hashText(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

export type SpeakSource = "auto" | "test" | "replay" | "manual";

export interface SpeakOptions {
  /** When true, bypass the auto-speak dedupe guard. Only set this
   *  on explicit user-triggered speech (Test / Replay / Speak). */
  force?: boolean;
  /** Discriminator used for telemetry + guard logic. */
  source?: SpeakSource;
}

export interface SpeechSynthesisHook {
  supported: boolean;
  /** True while an utterance is being spoken. */
  speaking: boolean;
  /** When true, speak() becomes a no-op. */
  muted: boolean;
  /** Speak the text. Default source is "manual"; the AUTO-speak
   *  effect in the parent passes `source: "auto"` and gets
   *  deduped against the last-spoken text hash. */
  speak: (text: string, options?: SpeakOptions) => void;
  /** Cancel the in-flight utterance. */
  stop: () => void;
  /** Toggle muted state. */
  setMuted: (muted: boolean) => void;
  /** Re-arm the auto-speak dedupe so the next response can speak
   *  automatically again. Called when the operator explicitly
   *  enables auto-speak or after logout. */
  resetDedupe: () => void;
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const synth = getSynth();
  const supported = synth !== null;
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMutedState] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Stable refs for guard state — NEVER include these in any
  // useEffect dep array; their identity is intentionally stable.
  const lastSpokenHashRef = useRef<string | null>(null);
  const speakingHashRef = useRef<string | null>(null);

  // Cancel any in-flight utterance when the component unmounts. This
  // is the load-bearing fix for "navigating away leaves Otzar
  // talking" + "the running tab still loops after the bundle is
  // replaced".
  useEffect(() => {
    return () => {
      try {
        synth?.cancel();
      } catch {
        // ignore — synth may already be torn down
      }
    };
  }, [synth]);

  // Listen for ESC anywhere as an emergency stop. Bound at the
  // window level so the operator can always silence Otzar without
  // hunting for a button.
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        try {
          synth?.cancel();
        } catch {
          // ignore
        }
        setSpeaking(false);
        utteranceRef.current = null;
        speakingHashRef.current = null;
      }
    }
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [synth]);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}): void => {
      if (synth === null) return;
      if (muted) return;
      if (text.length === 0) return;
      const source: SpeakSource = options.source ?? "manual";
      const force = options.force === true;
      const hash = hashText(text);

      // AUTO-speak dedupe — never queue the same response twice.
      if (source === "auto" && !force) {
        if (lastSpokenHashRef.current === hash) return;
        if (speakingHashRef.current === hash) return;
      }
      // Even forced calls dedupe against the IN-FLIGHT utterance —
      // repeated Test-voice clicks should not queue duplicates.
      if (speakingHashRef.current === hash) return;

      // Cancel any in-flight utterance first so the OS queue never
      // accumulates. This is the canonical browser-TTS pattern.
      try {
        synth.cancel();
      } catch {
        // ignore
      }
      const utterance = new SpeechSynthesisUtterance(text);
      // Set the in-flight hash IMMEDIATELY (not in onstart) so the
      // dedupe guard fires on rapid repeat clicks even when the
      // browser is slow to invoke onstart (and so jsdom tests can
      // assert the guard without faking onstart).
      speakingHashRef.current = hash;
      setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        lastSpokenHashRef.current = hash;
        speakingHashRef.current = null;
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setSpeaking(false);
        speakingHashRef.current = null;
        utteranceRef.current = null;
      };
      utteranceRef.current = utterance;
      synth.speak(utterance);
    },
    [synth, muted],
  );

  const stop = useCallback((): void => {
    if (synth === null) return;
    try {
      synth.cancel();
    } catch {
      // ignore
    }
    setSpeaking(false);
    speakingHashRef.current = null;
    utteranceRef.current = null;
  }, [synth]);

  const setMuted = useCallback(
    (next: boolean): void => {
      setMutedState(next);
      if (next) {
        try {
          synth?.cancel();
        } catch {
          // ignore
        }
        setSpeaking(false);
        speakingHashRef.current = null;
      }
    },
    [synth],
  );

  const resetDedupe = useCallback((): void => {
    lastSpokenHashRef.current = null;
    speakingHashRef.current = null;
  }, []);

  return {
    supported,
    speaking,
    muted,
    speak,
    stop,
    setMuted,
    resetDedupe,
  };
}
