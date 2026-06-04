// FILE: useSpeechSynthesis.ts
// PURPOSE: Wrapper around browser `window.speechSynthesis`. Lets
//          the AmbientOtzarBar speak Otzar's `speech_ready_text`
//          back to the employee using the OS TTS voice without
//          requiring a Foundation-side TTS provider.
//
//          When `window.speechSynthesis` is missing (older
//          Tauri / WebView builds), the hook reports
//          `supported: false` and the bar falls back to showing
//          the speech-ready text on-screen.
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

export interface SpeechSynthesisHook {
  supported: boolean;
  /** True while an utterance is being spoken. */
  speaking: boolean;
  /** When true, speak() becomes a no-op. */
  muted: boolean;
  /** Speak the text immediately. No-op when muted or unsupported. */
  speak: (text: string) => void;
  /** Cancel the in-flight utterance. */
  stop: () => void;
  /** Toggle muted state. */
  setMuted: (muted: boolean) => void;
}

export function useSpeechSynthesis(): SpeechSynthesisHook {
  const synth = getSynth();
  const supported = synth !== null;
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMutedState] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cancel any in-flight utterance when the component unmounts.
  useEffect(() => {
    return () => {
      try {
        synth?.cancel();
      } catch {
        // ignore — synth may already be torn down
      }
    };
  }, [synth]);

  const speak = useCallback(
    (text: string): void => {
      if (synth === null) return;
      if (muted) return;
      if (text.length === 0) return;
      // Cancel any in-flight utterance first so we don't queue.
      try {
        synth.cancel();
      } catch {
        // ignore
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        utteranceRef.current = null;
      };
      utterance.onerror = () => {
        setSpeaking(false);
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
      }
    },
    [synth],
  );

  return { supported, speaking, muted, speak, stop, setMuted };
}
