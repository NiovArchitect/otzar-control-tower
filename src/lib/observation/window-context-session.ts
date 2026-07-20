// FILE: window-context-session.ts
// PURPOSE: D-04 — selected-window context with explicit permission only.
//          Pure trust + session model. No covert capture: browser
//          getDisplayMedia is the permission prompt; indicator must show
//          while a stream is live; frames are never retained by this model.
// CONNECTS TO: WindowContextShare, desktop-capabilities, FOUNDER D-04.

export type WindowContextState =
  | "unsupported" // browser has no getDisplayMedia
  | "idle" // ready; nothing shared
  | "active" // user picked a window/screen; stream live
  | "ended"; // stream stopped; frames discarded

export interface WindowContextSession {
  state: WindowContextState;
  /** Mandatory while a live stream exists — never silent capture. */
  indicatorVisible: boolean;
  /** Human label of what was shared (surface kind if known). */
  scopeLabel: string | null;
  /** Last error for honest UX (permission denied, etc.). */
  lastError: string | null;
}

export function initialWindowContextSession(
  displayMediaAvailable: boolean,
): WindowContextSession {
  return {
    state: displayMediaAvailable ? "idle" : "unsupported",
    indicatorVisible: false,
    scopeLabel: null,
    lastError: null,
  };
}

export function canStartWindowShare(session: WindowContextSession): boolean {
  return session.state === "idle" || session.state === "ended";
}

/** After the browser grants a selected surface (user gesture required). */
export function activateWindowShare(
  session: WindowContextSession,
  input: { scopeLabel: string },
): WindowContextSession {
  if (session.state === "unsupported") return session;
  if (!canStartWindowShare(session)) return session;
  return {
    state: "active",
    indicatorVisible: true,
    scopeLabel: input.scopeLabel,
    lastError: null,
  };
}

export function failWindowShare(
  session: WindowContextSession,
  error: string,
): WindowContextSession {
  if (session.state === "unsupported") return session;
  return {
    state: session.state === "active" ? "ended" : "idle",
    indicatorVisible: false,
    scopeLabel: null,
    lastError: error,
  };
}

/** Stop share — frames discarded; indicator off immediately. */
export function endWindowShare(session: WindowContextSession): WindowContextSession {
  if (session.state !== "active") return session;
  return {
    state: "ended",
    indicatorVisible: false,
    scopeLabel: null,
    lastError: null,
  };
}

export function hasDisplayMedia(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    typeof (
      navigator.mediaDevices as MediaDevices & {
        getDisplayMedia?: unknown;
      }
    )?.getDisplayMedia === "function"
  );
}

export const WINDOW_CONTEXT_PROMISE =
  "Otzar only sees a window you choose in the browser permission dialog. Nothing is shared until you pick one. A live indicator stays visible while sharing. Frames are not stored.";

export const WINDOW_CONTEXT_NEVER = [
  "Background or full-desktop surveillance without your choice",
  "Sharing while this indicator is off",
  "Keeping screen frames after you stop",
] as const;
