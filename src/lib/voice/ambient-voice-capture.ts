// FILE: ambient-voice-capture.ts
// PURPOSE: Phase OTZAR-RETURN-3 — the ambient voice capture READINESS layer.
//          A small, local, deterministic model that describes Otzar's honest
//          voice-capture state today and prepares the routing shape for future
//          ambient devices (earphones / glasses / lenses / goggles / desktop
//          tray). This is Otzar PRODUCT infrastructure — NOT AVP², not a
//          protocol artifact, not a network contract.
//
// HONESTY INVARIANTS (load-bearing — see docs/ambient-voice-readiness.md):
//   - Otzar receives the TRANSCRIPT TEXT ONLY. It never receives raw audio.
//     `audio_sent_to_otzar` is always false; `otzar_receives` is always
//     "transcript_text_only".
//   - Browser STT may be performed by the browser's own vendor speech service.
//     This model NEVER claims on-device-only / local STT.
//   - No always-on / background listening is implemented or claimed.
//   - Earphones / glasses / lenses / goggles are FUTURE device modes only.
//     This model never claims a wearable is connected or supported today.
//   - No raw-audio fields, no persistence fields, no AVP²/Federation Cloud
//     references appear in any model output.

export type AmbientVoiceDeviceMode =
  | "desktop_browser"
  | "desktop_app"
  | "earphones_future"
  | "glasses_future"
  | "lenses_future"
  | "goggles_future";

export type AmbientVoiceCaptureMode =
  | "text_only"
  | "push_to_talk"
  | "browser_stt"
  | "desktop_mic_future"
  | "wearable_future";

export type AmbientVoiceCaptureStatus =
  | "ready"
  | "blocked"
  | "unsupported"
  | "provider_blocked"
  | "future_device_not_connected";

export type AmbientVoiceIntentRoute =
  | "chat"
  | "ask_twin"
  | "comms"
  | "approval"
  | "action_runtime"
  | "note_capture"
  | "reminder"
  | "unknown";

/** A structured, transcript-only record of one ambient voice capture. Carries
 *  NO raw audio and no persistence fields — it is a routing/telemetry hint. */
export interface AmbientVoiceCaptureEvent {
  event_schema: "OTZAR_AMBIENT_VOICE_CAPTURE_EVENT";
  schema_version: "0.1";
  device_mode: AmbientVoiceDeviceMode;
  capture_mode: AmbientVoiceCaptureMode;
  status: AmbientVoiceCaptureStatus;
  transcript_text: string;
  transcript_present: boolean;
  /** Always false. Otzar's boundary receives text, never microphone audio. */
  audio_sent_to_otzar: false;
  /** Always the literal contract: Otzar receives the transcript string only. */
  otzar_receives: "transcript_text_only";
  provider_note: string | null;
  intended_route: AmbientVoiceIntentRoute;
  confidence: "deterministic_local_hint";
  created_at: string;
}

const WEARABLE_DEVICE_MODES: ReadonlySet<AmbientVoiceDeviceMode> = new Set([
  "earphones_future",
  "glasses_future",
  "lenses_future",
  "goggles_future",
]);

// ── describeAmbientVoiceMode ────────────────────────────────────────────────
// Returns honest, user-facing copy for the current voice state. Decision order
// is deliberate: a provider block and a future device both override the generic
// "ready"/"text only" copy.

export interface DescribeAmbientVoiceInput {
  device_mode: AmbientVoiceDeviceMode;
  capture_mode: AmbientVoiceCaptureMode;
  status: AmbientVoiceCaptureStatus;
  browserRecognitionSupported?: boolean;
  desktopCaptureEnabled?: boolean;
  providerBlocked?: boolean;
}

const COPY = {
  BROWSER_STT_READY:
    "Browser speech capture is available. Otzar receives transcript text only, never raw audio. Some browsers may use their own speech provider.",
  TEXT_ONLY: "Voice capture is unavailable here. Text mode is active.",
  PROVIDER_BLOCKED:
    "Voice capture is blocked by the speech provider or account configuration. Text mode is active.",
  WEARABLE_FUTURE:
    "Wearable capture modes are planned for earphones, glasses, lenses, and goggles. This build prepares the routing model, but no wearable device is connected.",
  DESKTOP_MIC_FUTURE:
    "Desktop microphone capture is planned for tray/app mode. This build prepares the routing model without enabling background listening.",
} as const;

export function describeAmbientVoiceMode(input: DescribeAmbientVoiceInput): string {
  if (input.providerBlocked === true || input.status === "provider_blocked") {
    return COPY.PROVIDER_BLOCKED;
  }
  if (WEARABLE_DEVICE_MODES.has(input.device_mode) || input.capture_mode === "wearable_future") {
    return COPY.WEARABLE_FUTURE;
  }
  if (input.capture_mode === "desktop_mic_future") {
    return COPY.DESKTOP_MIC_FUTURE;
  }
  if (
    input.capture_mode === "browser_stt" &&
    input.status === "ready" &&
    input.browserRecognitionSupported !== false
  ) {
    return COPY.BROWSER_STT_READY;
  }
  return COPY.TEXT_ONLY;
}

// ── inferVoiceIntentRoute ───────────────────────────────────────────────────
// Deterministic LOCAL hint only (no model call, no network). Priority order is
// load-bearing: "remind me" must win over the generic action_runtime "remind",
// and "ask twin" must win over the chat default. An empty transcript is
// unknown. This is intentionally separate from src/lib/voice/command-router.ts
// (which navigates to admin SURFACES); this hints the WORK route.

interface RouteRule {
  route: Exclude<AmbientVoiceIntentRoute, "chat" | "unknown">;
  keywords: ReadonlyArray<string>;
}

// Ordered by priority — first matching rule wins.
const ROUTE_RULES: ReadonlyArray<RouteRule> = [
  { route: "ask_twin", keywords: ["ask twin", "ask my twin", "what do i know", "what does my twin know"] },
  { route: "reminder", keywords: ["remind me", "set a reminder", "later today", "tomorrow"] },
  { route: "approval", keywords: ["approve", "approval", "deny", "decline", "sign off"] },
  { route: "action_runtime", keywords: ["task", "complete", "follow up", "follow-up", "remind", "todo", "to do"] },
  { route: "note_capture", keywords: ["note", "capture this", "remember this", "write this down"] },
  { route: "comms", keywords: ["message", "reply", "send", "tell", "text", "email"] },
];

export function inferVoiceIntentRoute(transcript: string): AmbientVoiceIntentRoute {
  const text = transcript.trim().toLowerCase();
  if (text.length === 0) return "unknown";
  for (const rule of ROUTE_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) return rule.route;
  }
  return "chat";
}

// ── createAmbientVoiceCaptureEvent ──────────────────────────────────────────

export interface CreateAmbientVoiceCaptureEventInput {
  transcript: string;
  device_mode: AmbientVoiceDeviceMode;
  capture_mode: AmbientVoiceCaptureMode;
  status: AmbientVoiceCaptureStatus;
  route_hint?: AmbientVoiceIntentRoute;
  created_at?: string;
  provider_note?: string;
}

export function createAmbientVoiceCaptureEvent(
  input: CreateAmbientVoiceCaptureEventInput,
): AmbientVoiceCaptureEvent {
  const trimmed = input.transcript.trim();
  const transcript_present = trimmed.length > 0;
  // No transcript → no route. Otherwise an explicit hint wins over inference.
  const intended_route: AmbientVoiceIntentRoute = !transcript_present
    ? "unknown"
    : (input.route_hint ?? inferVoiceIntentRoute(trimmed));
  return {
    event_schema: "OTZAR_AMBIENT_VOICE_CAPTURE_EVENT",
    schema_version: "0.1",
    device_mode: input.device_mode,
    capture_mode: input.capture_mode,
    status: input.status,
    transcript_text: trimmed,
    transcript_present,
    audio_sent_to_otzar: false,
    otzar_receives: "transcript_text_only",
    provider_note: input.provider_note ?? null,
    intended_route,
    confidence: "deterministic_local_hint",
    created_at: input.created_at ?? new Date().toISOString(),
  };
}

// ── ambientVoiceDeviceOptions ───────────────────────────────────────────────
// The device matrix for honest UI: what works now vs. what is planned. The
// wearable rows are ALWAYS "planned" and never claim a connected device.

export interface AmbientVoiceDeviceOption {
  label: string;
  mode: AmbientVoiceDeviceMode;
  availability: "current" | "planned";
  honest_status: string;
}

export function ambientVoiceDeviceOptions(): ReadonlyArray<AmbientVoiceDeviceOption> {
  return [
    {
      label: "Desktop browser",
      mode: "desktop_browser",
      availability: "current",
      honest_status:
        "Available now. Browser speech capture; Otzar receives transcript text only.",
    },
    {
      label: "Desktop app / tray",
      mode: "desktop_app",
      availability: "current",
      honest_status:
        "Desktop app shell is available. Background microphone capture is planned, not active.",
    },
    {
      label: "Earphones",
      mode: "earphones_future",
      availability: "planned",
      honest_status: "Planned. Earphones are not connected.",
    },
    {
      label: "Glasses",
      mode: "glasses_future",
      availability: "planned",
      honest_status: "Planned. Glasses are not connected.",
    },
    {
      label: "Lenses",
      mode: "lenses_future",
      availability: "planned",
      honest_status: "Planned. Lenses are not connected.",
    },
    {
      label: "Goggles",
      mode: "goggles_future",
      availability: "planned",
      honest_status: "Planned. Goggles are not connected.",
    },
  ];
}

/** UI label for an intent route (used by the "Intent route: …" hint). */
export function ambientVoiceRouteLabel(route: AmbientVoiceIntentRoute): string {
  switch (route) {
    case "ask_twin":
      return "Ask Twin";
    case "comms":
      return "Comms";
    case "approval":
      return "Approval";
    case "action_runtime":
      return "Action Runtime";
    case "note_capture":
      return "Note Capture";
    case "reminder":
      return "Reminder";
    case "chat":
      return "Chat";
    case "unknown":
    default:
      return "Unknown";
  }
}
