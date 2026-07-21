// FILE: mic-permission.ts
// PURPOSE: One shared microphone permission + stream owner for Talk bar
//          and full Voice surfaces (RC2 VOX-2). No second fake grant.
// CONNECTS TO: AmbientOtzarBar, Voice page, speech recognition hooks.

export type MicPermissionState =
  | "unknown"
  | "prompt"
  | "granted"
  | "denied"
  | "blocked"
  | "no_device"
  | "in_use"
  | "unsupported"
  | "insecure";

type Listener = (s: MicPermissionState) => void;

let state: MicPermissionState = "unknown";
let stream: MediaStream | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const l of listeners) l(state);
}

export function getMicPermissionState(): MicPermissionState {
  return state;
}

export function subscribeMicPermission(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => {
    listeners.delete(fn);
  };
}

export function micPermissionPlainCopy(s: MicPermissionState): string {
  switch (s) {
    case "granted":
      return "Microphone is ready.";
    case "prompt":
    case "unknown":
      return "Allow microphone access to speak with Otzar.";
    case "denied":
    case "blocked":
      return "Microphone access is blocked in your browser.";
    case "no_device":
      return "No microphone was found on this device.";
    case "in_use":
      return "Another app is using the microphone.";
    case "unsupported":
      return "This browser cannot use the microphone for voice.";
    case "insecure":
      return "Microphone needs a secure connection (HTTPS).";
    default:
      return "Allow microphone access to speak with Otzar.";
  }
}

/** Read Permissions API when available (does not prompt). */
export async function refreshMicPermissionFromBrowser(): Promise<MicPermissionState> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    state = "unsupported";
    emit();
    return state;
  }
  if (!window.isSecureContext) {
    state = "insecure";
    emit();
    return state;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    state = "unsupported";
    emit();
    return state;
  }
  try {
    const perms = navigator.permissions;
    if (perms?.query) {
      const status = await perms.query({
        name: "microphone" as PermissionName,
      });
      if (status.state === "granted") state = "granted";
      else if (status.state === "denied") state = "denied";
      else state = "prompt";
      emit();
      return state;
    }
  } catch {
    /* Safari often lacks microphone PermissionName */
  }
  // Fall back: if we already hold a live stream, granted.
  if (stream && stream.getTracks().some((t) => t.readyState === "live")) {
    state = "granted";
  } else if (state === "unknown") {
    state = "prompt";
  }
  emit();
  return state;
}

/**
 * Ensure mic access once. Reuses live stream. Surfaces share this owner.
 */
export async function ensureMicAccess(): Promise<{
  ok: boolean;
  state: MicPermissionState;
  stream: MediaStream | null;
  message: string;
}> {
  await refreshMicPermissionFromBrowser();
  if (state === "unsupported" || state === "insecure") {
    return {
      ok: false,
      state,
      stream: null,
      message: micPermissionPlainCopy(state),
    };
  }
  if (stream && stream.getTracks().some((t) => t.readyState === "live")) {
    state = "granted";
    emit();
    return { ok: true, state, stream, message: micPermissionPlainCopy(state) };
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state = "granted";
    emit();
    return { ok: true, state, stream, message: micPermissionPlainCopy(state) };
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      state = "denied";
    } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      state = "no_device";
    } else if (name === "NotReadableError" || name === "TrackStartError") {
      state = "in_use";
    } else {
      state = "denied";
    }
    emit();
    return {
      ok: false,
      state,
      stream: null,
      message: micPermissionPlainCopy(state),
    };
  }
}

/** Release owned stream (e.g. user signs out). Does not revoke browser permission. */
export function releaseMicStream(): void {
  if (stream) {
    for (const t of stream.getTracks()) t.stop();
    stream = null;
  }
}
