// FILE: useDesktopVoiceCapture.ts
// PURPOSE: Phase 1264 — the DESKTOP voice-input path. The Tauri macOS
//          WKWebView has no Web Speech API, but it DOES expose
//          getUserMedia + MediaRecorder (the Info.plist mic usage
//          description + audio-input entitlement are in place). This
//          hook records a short utterance, encodes it, and POSTs it to
//          Foundation's /otzar/voice/transcribe (OpenAI Whisper) — a
//          real provider-backed transcript, never a fixture. The
//          resulting STRING is handed to the SAME governed chat path
//          as typed input.
//
//          P0G: the hook is SHELL-AGNOSTIC — nothing in it is Tauri-
//          specific. Browser surfaces reuse this exact hook as the
//          server-STT FALLBACK when the Web Speech API fails (and as
//          the primary path when Web Speech is unavailable). The
//          decision of WHICH engine drives the mic lives in
//          decideSttPath (src/lib/voice/diagnostics.ts); this hook
//          only records + transcribes. MIME selection walks
//          RECORDER_MIME_CANDIDATES so Chromium records audio/webm
//          and Safari/WKWebView record audio/mp4 — all inside the
//          Foundation route's allowlist.
//
// PRIVACY INVARIANT:
//   - Audio bytes live in memory for the single request only and are
//     released immediately after transcription. Nothing is persisted
//     client-side; the mic stream tracks are stopped the moment
//     recording ends.
//   - Only the transcript string is surfaced; it is never written to
//     localStorage/IndexedDB.
// CONNECTS TO: src/lib/api.ts (otzar.voice.transcribe), AmbientOtzarBar
//          (desktop mic path), Foundation transcription.service.ts.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

export type DesktopCaptureState =
  | "idle"
  | "recording"
  | "transcribing"
  | "error";

export interface DesktopVoiceCaptureHook {
  /** True when this shell can record audio (getUserMedia + MediaRecorder). */
  supported: boolean;
  state: DesktopCaptureState;
  /** The latest provider transcript, or "" until one lands. */
  transcript: string;
  /** Which STT provider produced the latest transcript (e.g.
   *  "openai-whisper" / "deepgram"), or null until one lands. */
  provider: string | null;
  /** Closed-vocab error code for diagnostics.transcribeErrorCopy(). */
  errorCode: string | null;
  /** Begin recording (prompts for mic permission if needed). */
  start: () => Promise<void>;
  /** Stop recording → transcribe. Resolves the transcript via state. */
  stop: () => void;
  /** Abort recording WITHOUT transcribing. */
  cancel: () => void;
  /** Clear transcript + error. */
  reset: () => void;
}

/**
 * P0G — recorder MIME candidates, in preference order, all within the
 * Foundation /otzar/voice/transcribe allowlist (webm / ogg / wav / mp4 /
 * mpeg / m4a; codec parameters are stripped server-side). Chromium picks
 * audio/webm; Safari + macOS WKWebView pick audio/mp4.
 */
export const RECORDER_MIME_CANDIDATES: readonly string[] = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

// WHAT: pick the first supported recorder MIME type for this shell.
// INPUT: an isTypeSupported probe (injectable for tests; defaults to
//        MediaRecorder.isTypeSupported when present).
// OUTPUT: a MIME string to pass to `new MediaRecorder(stream, {mimeType})`,
//         or null → construct with no options (the pre-P0G behavior).
// WHY: keeps every recording inside the server allowlist across engines
//      without duplicating a second MediaRecorder implementation.
export function pickRecorderMimeType(
  isTypeSupported?: (type: string) => boolean,
): string | null {
  const probe =
    isTypeSupported ??
    (typeof MediaRecorder !== "undefined" &&
    typeof MediaRecorder.isTypeSupported === "function"
      ? (t: string) => MediaRecorder.isTypeSupported(t)
      : null);
  if (probe === null) return null;
  for (const candidate of RECORDER_MIME_CANDIDATES) {
    try {
      if (probe(candidate)) return candidate;
    } catch {
      /* a vendor probe throwing means "unsupported" — keep walking */
    }
  }
  return null;
}

function hasRecorder(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { MediaRecorder?: unknown }).MediaRecorder !==
      "undefined" &&
    typeof navigator !== "undefined" &&
    navigator.mediaDevices !== undefined &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

/** Encode a Blob to base64 (no data: prefix) via FileReader — safe for
 *  large buffers (spread/btoa over a big Uint8Array overflows the
 *  call stack). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

export function useDesktopVoiceCapture(): DesktopVoiceCaptureHook {
  const supported = hasRecorder();
  const [state, setState] = useState<DesktopCaptureState>("idle");
  const [transcript, setTranscript] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cancelledRef = useRef(false);

  const stopTracks = useCallback((): void => {
    if (streamRef.current !== null) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          /* track may already be stopped */
        }
      }
      streamRef.current = null;
    }
  }, []);

  // Always release the mic if the component unmounts mid-capture.
  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      stopTracks();
    };
  }, [stopTracks]);

  const start = useCallback(async (): Promise<void> => {
    if (!supported) {
      setErrorCode("MIC_UNSUPPORTED");
      setState("error");
      return;
    }
    setErrorCode(null);
    setTranscript("");
    setProvider(null);
    cancelledRef.current = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // getUserMedia rejects with NotAllowedError when the OS / user
      // blocked the mic. Map to honest, actionable copy.
      setErrorCode("MIC_BLOCKED");
      setState("error");
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      // P0G: prefer an allowlist-compatible MIME (audio/webm on
      // Chromium, audio/mp4 on Safari/WKWebView). If the constructor
      // rejects the hint, fall back to the shell default — exactly the
      // pre-P0G behavior.
      const preferredMime = pickRecorderMimeType();
      try {
        recorder =
          preferredMime !== null
            ? new MediaRecorder(stream, { mimeType: preferredMime })
            : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }
    } catch {
      stopTracks();
      setErrorCode("MIC_UNSUPPORTED");
      setState("error");
      return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const mimeType = recorder.mimeType || "audio/webm";
      stopTracks();
      recorderRef.current = null;
      if (cancelledRef.current) {
        setState("idle");
        return;
      }
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      if (blob.size === 0) {
        setErrorCode("STT_NO_SPEECH");
        setState("error");
        return;
      }
      setState("transcribing");
      void (async () => {
        try {
          const base64 = await blobToBase64(blob);
          const result = await api.otzar.voice.transcribe({
            audio_base64: base64,
            mime_type: mimeType,
          });
          if (result.ok) {
            setProvider(result.data.provider);
            setTranscript(result.data.transcript);
            setState("idle");
          } else {
            setErrorCode(result.code);
            setState("error");
          }
        } catch {
          setErrorCode("NETWORK_ERROR");
          setState("error");
        }
      })();
    };
    try {
      recorder.start();
      setState("recording");
    } catch {
      stopTracks();
      recorderRef.current = null;
      setErrorCode("MIC_UNSUPPORTED");
      setState("error");
    }
  }, [supported, stopTracks]);

  const stop = useCallback((): void => {
    const recorder = recorderRef.current;
    if (recorder === null || recorder.state === "inactive") return;
    cancelledRef.current = false;
    try {
      recorder.stop();
    } catch {
      stopTracks();
      setState("idle");
    }
  }, [stopTracks]);

  const cancel = useCallback((): void => {
    cancelledRef.current = true;
    const recorder = recorderRef.current;
    if (recorder !== null && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
    }
    stopTracks();
    setState("idle");
  }, [stopTracks]);

  const reset = useCallback((): void => {
    setTranscript("");
    setProvider(null);
    setErrorCode(null);
    if (state === "error") setState("idle");
  }, [state]);

  return {
    supported,
    state,
    transcript,
    provider,
    errorCode,
    start,
    stop,
    cancel,
    reset,
  };
}
