// FILE: presence.ts
// PURPOSE: Phase 1251 — the Otzar edge-presence state model. One
//          store of raw ambient SIGNALS (voice activity, quiet mode,
//          attention counts, blockers, transient outcomes) and one
//          pure derivation into the nine-state presence language the
//          edge glow + orb + ambient cards all speak:
//
//            IDLE · LISTENING · THINKING · RECOMMENDATION ·
//            APPROVAL_REQUIRED · SUCCESS · BLOCKED · QUIET · FAILURE
//
//          Signals in, one calm state out — so every ambient surface
//          agrees about what Otzar is doing without prop-drilling.
// CONNECTS TO: AmbientOtzarBar (publishes voice/quiet signals),
//          NotificationBell (publishes unread count),
//          AmbientEdgeGlow + AmbientNotificationStack (consume),
//          tests/unit/ambient-edge-presence.test.tsx.

import { create } from "zustand";

export type OtzarPresenceState =
  | "IDLE"
  | "LISTENING"
  | "THINKING"
  | "RECOMMENDATION"
  | "APPROVAL_REQUIRED"
  | "SUCCESS"
  | "BLOCKED"
  | "QUIET"
  | "FAILURE";

export interface PresenceSignals {
  /** Mic is actively capturing. */
  listening: boolean;
  /** A request to Otzar is in flight. */
  thinking: boolean;
  /** Quiet mode (manual or calendar-driven). */
  quiet: boolean;
  /** Why quiet, when Otzar decided it (null = manual / not quiet). */
  quietReason: "IN_MEETING" | "FOCUS_TIME" | "OTHER" | null;
  /** Items waiting on the user's decision (proposed actions). */
  approvalsCount: number;
  /** Total unread notes for the user (includes FYI). Drives the bell badge. */
  unreadCount: number;
  /**
   * Unread notes that ACTUALLY need the user to do something — total unread
   * minus calm FYI classes (e.g. CALENDAR_EVENT_CREATED/CANCELLED, which say
   * "no action needed"). "Needs you" surfaces read THIS, so a scheduled-meeting
   * FYI never nags as action-required. [ORG-AUTONOMY]
   */
  actionUnreadCount: number;
  /** Voice cannot work right now (no mic permission / unsupported). */
  voiceBlocked: boolean;
  /** Millisecond timestamps of the last transient outcomes. */
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
}

const INITIAL_SIGNALS: PresenceSignals = {
  listening: false,
  thinking: false,
  quiet: false,
  quietReason: null,
  approvalsCount: 0,
  unreadCount: 0,
  actionUnreadCount: 0,
  voiceBlocked: false,
  lastSuccessAt: null,
  lastFailureAt: null,
};

/** Transient states stop tinting the edge after these windows. */
export const SUCCESS_GLOW_MS = 4_000;
export const FAILURE_GLOW_MS = 8_000;

// WHAT: Fold raw signals into the single presence state.
// WHY: Priority is a design decision, not an accident — live voice
//      activity always wins (the user must SEE when Otzar listens or
//      thinks); fresh outcomes flash briefly; quiet mode mutes
//      attention states (a meeting is not the moment for pulses);
//      then attention (approvals before recommendations); then
//      blockers; then calm idle.
export function derivePresenceState(
  s: PresenceSignals,
  now: number = Date.now(),
): OtzarPresenceState {
  if (s.listening) return "LISTENING";
  if (s.thinking) return "THINKING";
  if (s.lastFailureAt !== null && now - s.lastFailureAt < FAILURE_GLOW_MS) {
    return "FAILURE";
  }
  if (s.lastSuccessAt !== null && now - s.lastSuccessAt < SUCCESS_GLOW_MS) {
    return "SUCCESS";
  }
  if (s.quiet) return "QUIET";
  if (s.approvalsCount > 0) return "APPROVAL_REQUIRED";
  if (s.unreadCount > 0) return "RECOMMENDATION";
  if (s.voiceBlocked) return "BLOCKED";
  return "IDLE";
}

interface PresenceStore extends PresenceSignals {
  setSignals: (patch: Partial<PresenceSignals>) => void;
  markSuccess: () => void;
  markFailure: () => void;
  reset: () => void;
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  ...INITIAL_SIGNALS,
  setSignals: (patch) => set(patch),
  markSuccess: () => set({ lastSuccessAt: Date.now(), lastFailureAt: null }),
  markFailure: () => set({ lastFailureAt: Date.now() }),
  reset: () => set({ ...INITIAL_SIGNALS }),
}));

/** Convenience selector used by glow/orb/cards. */
export function usePresenceState(): OtzarPresenceState {
  return usePresenceStore((s) =>
    derivePresenceState({
      listening: s.listening,
      thinking: s.thinking,
      quiet: s.quiet,
      quietReason: s.quietReason,
      approvalsCount: s.approvalsCount,
      unreadCount: s.unreadCount,
      actionUnreadCount: s.actionUnreadCount,
      voiceBlocked: s.voiceBlocked,
      lastSuccessAt: s.lastSuccessAt,
      lastFailureAt: s.lastFailureAt,
    }),
  );
}

// ────────────────────────────────────────────────────────────────────
// [OTZAR-LIVE-6] Presence-intensity model — presence must be KNOWN but
// CALIBRATED. Every ambient surface (glow, bloom, chip, cards, edges)
// scales its visual intensity by HUMAN NEED, not by decoration. Four
// tiers:
//   ambient   — idle / available / background; barely-there. "I'm here if
//               you need me."
//   working   — listening / thinking / routing / drafting / tracking;
//               softly noticeable, alive. "I'm working on this."
//   attention — needs one answer / approval / a reply came / a blocker
//               appeared; clearly visible but still non-blocking. "I need
//               you, or something changed."
//   critical  — failure / denial / unable to send; contained, never
//               alarming. "I know exactly what's blocked and what to do."
// This is the single mapping the whole interface reads from so intensity
// is consistent, not scattered per-component.
// ────────────────────────────────────────────────────────────────────
export type PresenceIntensity = "ambient" | "working" | "attention" | "critical";

export function presenceIntensity(state: OtzarPresenceState): PresenceIntensity {
  switch (state) {
    case "IDLE":
    case "QUIET":
      return "ambient";
    case "LISTENING":
    case "THINKING":
    case "RECOMMENDATION":
    case "SUCCESS":
      return "working";
    case "APPROVAL_REQUIRED":
    case "BLOCKED":
      return "attention";
    case "FAILURE":
      return "critical";
  }
}
