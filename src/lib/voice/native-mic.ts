// FILE: native-mic.ts
// PURPOSE: Phase 1256A — the native desktop microphone capability
//          bridge. Detects, without ever prompting or capturing,
//          what the current shell can do with a microphone, in a
//          closed vocabulary the whole app shares:
//
//            AVAILABLE        mic granted; hardware reachable
//            PERMISSION_NEEDED mediaDevices exists; OS prompt pending
//            DENIED           the person (or OS policy) said no
//            UNSUPPORTED      this shell exposes no media devices
//            SETUP_REQUIRED   mic OK but no speech engine yet (keys)
//            ERROR            detection itself failed
//
//          requestNativeMicAccess() triggers the one OS prompt via
//          getUserMedia and IMMEDIATELY stops every track — it asks
//          permission, it never records. Paired with the Info.plist
//          NSMicrophoneUsageDescription (src-tauri/Info.plist) this
//          is the real native voice substrate; live desktop
//          speech-to-text then only needs a streaming STT provider
//          key (Deepgram / OpenAI Realtime).
// CONNECTS TO: diagnostics.micCopyFor (copy), AmbientOtzarBar,
//          SystemHealth (desktop mic row), presence store,
//          tests/unit/native-mic.test.ts.

export type NativeMicStatus =
  | "AVAILABLE"
  | "PERMISSION_NEEDED"
  | "DENIED"
  | "UNSUPPORTED"
  | "SETUP_REQUIRED"
  | "ERROR";

export interface NativeMicCapability {
  status: NativeMicStatus;
  /** True when getUserMedia exists at all in this shell. */
  media_devices_present: boolean;
  /** True when at least one audio input device is enumerable. */
  input_device_seen: boolean;
}

// WHAT: Non-prompting capability detection.
// INPUT: optional sttEngineReady — whether a streaming speech engine
//        is configured (provider keys); decides AVAILABLE vs
//        SETUP_REQUIRED when permission is granted.
// OUTPUT: NativeMicCapability.
// WHY: every surface (orb copy, System Health, readiness) must agree
//      on the same truth without triggering an OS prompt.
export async function detectNativeMicCapability(
  sttEngineReady = false,
): Promise<NativeMicCapability> {
  const md =
    typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (md === undefined || typeof md.getUserMedia !== "function") {
    return {
      status: "UNSUPPORTED",
      media_devices_present: false,
      input_device_seen: false,
    };
  }
  let inputSeen = false;
  try {
    if (typeof md.enumerateDevices === "function") {
      const devices = await md.enumerateDevices();
      inputSeen = devices.some((d) => d.kind === "audioinput");
    }
    // Permissions API is the non-prompting state source where present.
    const permissions = (
      navigator as Navigator & {
        permissions?: { query?: (d: { name: string }) => Promise<{ state: string }> };
      }
    ).permissions;
    if (permissions?.query) {
      try {
        const res = await permissions.query({ name: "microphone" });
        if (res.state === "denied") {
          return {
            status: "DENIED",
            media_devices_present: true,
            input_device_seen: inputSeen,
          };
        }
        if (res.state === "granted") {
          return {
            status: sttEngineReady ? "AVAILABLE" : "SETUP_REQUIRED",
            media_devices_present: true,
            input_device_seen: inputSeen,
          };
        }
      } catch {
        // Permissions API exists but doesn't know "microphone" —
        // fall through to PERMISSION_NEEDED.
      }
    }
    return {
      status: "PERMISSION_NEEDED",
      media_devices_present: true,
      input_device_seen: inputSeen,
    };
  } catch {
    return {
      status: "ERROR",
      media_devices_present: true,
      input_device_seen: inputSeen,
    };
  }
}

// WHAT: Trigger the single OS permission prompt — and nothing else.
// OUTPUT: the resulting status (granted → SETUP_REQUIRED/AVAILABLE,
//         refused → DENIED).
// WHY: asks permission; NEVER records. Every track is stopped the
//      instant the promise resolves.
export async function requestNativeMicAccess(
  sttEngineReady = false,
): Promise<NativeMicStatus> {
  const md =
    typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
  if (md === undefined || typeof md.getUserMedia !== "function") {
    return "UNSUPPORTED";
  }
  try {
    const stream = await md.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return sttEngineReady ? "AVAILABLE" : "SETUP_REQUIRED";
  } catch {
    return "DENIED";
  }
}

/** Calm, jargon-free copy for each status (no "browser microphone
 *  API", no provider codes). */
export function nativeMicCopy(status: NativeMicStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "Microphone is ready. Just talk to Otzar.";
    case "PERMISSION_NEEDED":
      return "Voice is almost ready. Allow microphone access to speak to Otzar.";
    case "DENIED":
      return "Microphone access was declined. You can re-enable it in System Settings → Privacy & Security → Microphone — or just type; Otzar routes it the same way.";
    case "UNSUPPORTED":
      return "Voice is in text fallback right now. Type naturally — Otzar routes it the same way.";
    case "SETUP_REQUIRED":
      return "Microphone is connected. Live desktop speech arrives with your organization's voice provider keys — typing works fully today.";
    case "ERROR":
      return "Couldn't check the microphone just now. Typing works — try voice again in a moment.";
  }
}
