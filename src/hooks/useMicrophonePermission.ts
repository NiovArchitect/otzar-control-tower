// FILE: useMicrophonePermission.ts
// PURPOSE: Wrap the browser Permissions API for the microphone so the
//          AmbientOtzarBar can render an honest permission state
//          (unknown / prompt / granted / denied / unsupported) and
//          explicitly ASK for permission when the operator clicks the
//          mic — rather than silently failing when SpeechRecognition
//          starts.
//
//          Browsers that don't expose `navigator.permissions` (or
//          don't recognize the 'microphone' name) report
//          `state: "unsupported"`. The bar still falls back to a
//          typed-only path in that case.
//
// PRIVACY INVARIANT:
//   - No audio is captured by this hook. We use getUserMedia ONLY to
//     trigger the permission prompt, then immediately stop every
//     track on the resulting MediaStream. No audio data ever leaves
//     the browser.
//   - We never store the permission state to disk; it lives in
//     React state.

import { useCallback, useEffect, useState } from "react";

export type MicrophonePermissionState =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "unsupported";

export interface MicrophonePermissionHook {
  state: MicrophonePermissionState;
  /** True while a getUserMedia prompt is in flight. */
  requesting: boolean;
  /**
   * Explicitly ask the browser to prompt the operator for mic
   * permission. Resolves to the resulting state. Safe to call
   * even when the browser already granted permission — in that
   * case the function is a no-op that returns "granted".
   */
  request: () => Promise<MicrophonePermissionState>;
  /** Re-read the Permissions API value without prompting. */
  refresh: () => Promise<void>;
}

async function readPermissionState(): Promise<MicrophonePermissionState> {
  if (typeof navigator === "undefined") return "unsupported";
  const perms = navigator.permissions;
  if (
    perms === undefined ||
    typeof perms.query !== "function"
  ) {
    return "unsupported";
  }
  try {
    // The Permissions API "microphone" name is supported by Chromium
    // + WebKit; Firefox returns "unsupported" historically. We catch
    // the rejection below and report "unsupported".
    const status = await perms.query({
      name: "microphone" as PermissionName,
    });
    if (status.state === "granted") return "granted";
    if (status.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

export function useMicrophonePermission(): MicrophonePermissionHook {
  const [state, setState] = useState<MicrophonePermissionState>("unknown");
  const [requesting, setRequesting] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const next = await readPermissionState();
    setState(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const request = useCallback(async (): Promise<MicrophonePermissionState> => {
    if (typeof navigator === "undefined" || navigator.mediaDevices === undefined) {
      setState("unsupported");
      return "unsupported";
    }
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't need the audio — we only wanted the permission
      // prompt. Stop every track immediately so no mic indicator
      // stays lit and no audio is buffered.
      for (const track of stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      setState("granted");
      return "granted";
    } catch (err) {
      // NotAllowedError → denied; NotFoundError → no mic device.
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setState("denied");
        return "denied";
      }
      setState("unsupported");
      return "unsupported";
    } finally {
      setRequesting(false);
    }
  }, []);

  return { state, requesting, request, refresh };
}
