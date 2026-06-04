// FILE: useSpeechRecognition.ts
// PURPOSE: Wrapper around the browser Web Speech API
//          (SpeechRecognition / webkitSpeechRecognition). Detects
//          capability at runtime, manages listen/stop lifecycle,
//          surfaces the captured transcript via React state.
//
//          Used by AmbientOtzarBar so the employee can speak to
//          Otzar from anywhere in /app. When the API is
//          unavailable (Firefox, non-supporting Tauri webviews,
//          etc.) the hook reports `supported: false` and the bar
//          falls back to push-to-talk text entry.
//
// PRIVACY INVARIANT:
//   - No audio is streamed off the client. The browser performs
//     STT locally (or via the OS speech service); only the final
//     transcript string ever crosses an HTTP boundary.
//   - The hook does NOT save the transcript to localStorage,
//     IndexedDB, or any persistent client storage. The transcript
//     lives in component state only.
//   - No raw audio retention. No raw waveform. No fingerprint.

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API browser typings vary across vendors. We declare
// the minimal subset we use to avoid pulling in the `dom-speech-
// recognition` ambient package.
interface MinimalSpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface MinimalSpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<MinimalSpeechRecognitionResult>;
}
interface MinimalSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionHookOptions {
  /** Default browser locale for STT. Most browsers accept BCP-47. */
  lang?: string;
  /** Whether to keep accumulating interim chunks (default true). */
  interim?: boolean;
}

export interface SpeechRecognitionHook {
  /** True when the browser exposes SpeechRecognition / webkitSpeechRecognition. */
  supported: boolean;
  /** True between start() and the recognition end event. */
  listening: boolean;
  /** Latest accumulated transcript across all interim + final chunks. */
  transcript: string;
  /**
   * Closed-vocab error code from the last `onerror` event, or null.
   * The browser already maps mic-denied / network errors to a
   * small set of strings (no-speech, audio-capture, not-allowed,
   * etc.) — we surface them verbatim for the UI to map.
   */
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(
  options: SpeechRecognitionHookOptions = {},
): SpeechRecognitionHook {
  const Ctor = getSpeechRecognitionCtor();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const supported = Ctor !== null;

  // Tear down any in-flight recognition when the component unmounts.
  useEffect(() => {
    return () => {
      if (recognitionRef.current !== null) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore — recognition may already have ended
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const start = useCallback((): void => {
    if (Ctor === null) return;
    if (recognitionRef.current !== null) return;
    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = options.interim ?? true;
    recognition.lang = options.lang ?? "en-US";
    recognition.onresult = (event) => {
      let accumulated = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r === undefined) continue;
        accumulated += r[0].transcript;
      }
      setTranscript((prev) => {
        // The Web Speech API emits cumulative results when
        // continuous=false, so we just take the latest value for
        // a clean transcript.
        return accumulated.length > 0 ? accumulated : prev;
      });
    };
    recognition.onerror = (e) => {
      setError(e.error);
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    setError(null);
    setListening(true);
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      // Some browsers throw if start() is called twice in quick
      // succession; surface the error class to the UI.
      const message = err instanceof Error ? err.name : "start-error";
      setError(message);
      setListening(false);
      recognitionRef.current = null;
    }
  }, [Ctor, options.interim, options.lang]);

  const stop = useCallback((): void => {
    if (recognitionRef.current === null) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore — recognition may already have ended
    }
  }, []);

  const reset = useCallback((): void => {
    setTranscript("");
    setError(null);
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
