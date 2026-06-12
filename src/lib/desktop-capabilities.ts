// FILE: desktop-capabilities.ts
// PURPOSE: Phase 1259C — honest desktop capability truth. The voice
//          bug proved Tauri/CSP can silently block real features;
//          this module is the single closed-vocab report every
//          surface (System Health first) renders so a blocked
//          desktop capability can never look green.
// CONNECTS TO: SystemHealth, native-mic.ts, premium-tts.ts,
//          src-tauri/tauri.conf.json (CSP locks),
//          tests/unit/desktop-capabilities.test.ts.

import { detectShellMode } from "@/lib/voice/diagnostics";

export type CapabilityStatus =
  | "WORKS"
  | "FALLBACK"
  | "NEEDS_NATIVE"
  | "NEEDS_PROVIDER"
  | "PLANNED";

export interface DesktopCapability {
  id: string;
  label: string;
  status: CapabilityStatus;
  note: string;
}

// WHAT: Customer-facing copy for each capability status.
// WHY: closed vocab — exhaustive Record so a new status can't render
//      as raw enum text (the no-fake-green/no-jargon lock).
export const capabilityStatusCopy: Record<CapabilityStatus, string> = {
  WORKS: "Working",
  FALLBACK: "Fallback in use",
  NEEDS_NATIVE: "Needs desktop plugin",
  NEEDS_PROVIDER: "Needs provider",
  PLANNED: "Planned",
};

// WHAT: The capability report for the current shell.
// WHY: detection where the platform exposes it; honest static truth
//      where it doesn't. No capability may claim WORKS unless the
//      runtime path actually exists.
export function getDesktopCapabilities(): DesktopCapability[] {
  const tauri = detectShellMode() === "tauri_webview";
  const mediaDevices =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";
  const displayMedia =
    typeof navigator !== "undefined" &&
    typeof (
      navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: unknown;
      }
    )?.getDisplayMedia === "function";
  const clipboard =
    typeof navigator !== "undefined" &&
    typeof navigator.clipboard?.writeText === "function";
  const osNotifications =
    typeof window !== "undefined" && "Notification" in window;
  return [
    {
      id: "audio_playback",
      label: "Premium voice playback",
      status: "WORKS",
      note: "Provider audio plays in-app (blob media allowed); device voice is a labeled fallback.",
    },
    {
      id: "microphone",
      label: "Microphone",
      status: mediaDevices ? "NEEDS_PROVIDER" : "FALLBACK",
      note: mediaDevices
        ? "Mic permission path is ready; live desktop speech needs a streaming voice provider connection."
        : "This shell exposes no microphone — typing routes through the same command layer.",
    },
    {
      id: "screen_capture",
      label: "Screen sharing (Observe)",
      status: displayMedia ? "NEEDS_PROVIDER" : "NEEDS_NATIVE",
      note: displayMedia
        ? "Screen capture is available; the governed Observe pipeline connects next."
        : "Live screen sharing needs the native capture plugin — pasted text and document reading work today.",
    },
    {
      id: "file_upload",
      label: "File upload",
      status: "WORKS",
      note: "Choosing files works; drag-and-drop onto the window is a planned refinement.",
    },
    {
      id: "clipboard",
      label: "Copy & paste",
      status: clipboard ? "WORKS" : "FALLBACK",
      note: clipboard
        ? "Copying summaries, proofs, and exports works."
        : "Use keyboard shortcuts to copy and paste.",
    },
    {
      id: "os_notifications",
      label: "Desktop notifications",
      status: tauri ? "NEEDS_NATIVE" : osNotifications ? "NEEDS_PROVIDER" : "FALLBACK",
      note: tauri
        ? "In-app notes and ambient cards work today; system-tray notifications need the native notification plugin."
        : "In-app notes and ambient cards carry notifications today.",
    },
    {
      id: "external_links",
      label: "Open provider/setup pages",
      status: "WORKS",
      note: "Setup and documentation links open in your browser.",
    },
    {
      id: "oauth_callbacks",
      label: "Connector sign-in (OAuth)",
      status: "PLANNED",
      note: "Connector sign-ins complete in your browser with a server callback; in-app deep-link return is planned.",
    },
    {
      id: "live_streams",
      label: "Live updates & realtime streams",
      status: "PLANNED",
      note: "Local realtime channels are allowed by the app shell; Work Comms presence and transcript streams arrive with the BEAM runtime.",
    },
  ];
}
