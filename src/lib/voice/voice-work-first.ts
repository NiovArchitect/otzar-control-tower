// FILE: voice-work-first.ts
// PURPOSE: D-02 — Voice-first, text-second; voice drives WORK, not a
//          decorative demo page. Shared copy + classifiers for the Talk
//          orb and /app/voice so both surfaces prove the same contract:
//          mic is primary, type is fallback, outcomes hit the governed
//          work path (same as typed).
// CONNECTS TO: AmbientOtzarBar, pages/app/Voice, voice-action-runtime,
//          FOUNDER_REQUIREMENTS_REGISTER D-02.

import type { VoiceActionKind } from "@/lib/voice/voice-action-runtime";

/** Primary framing — speak first; type is always available as fallback. */
export const VOICE_FIRST_HEADLINE =
  "Speak to drive work — type when you prefer.";

/** Honest secondary line: one runtime, not a voice-only sandbox. */
export const VOICE_WORK_PATH_COPY =
  "Voice and text share the same governed work path — actions, Needs me, and approvals. No raw audio is stored.";

/** /app/voice page is the full Talk surface, not a mic test toy. */
export const VOICE_PAGE_TITLE = "Talk to Otzar";
export const VOICE_PAGE_DESCRIPTION =
  "Drive real work by voice. Type is secondary. Otzar uses the same governed path as the Talk dock.";

/** Text-input affordance when voice is primary. */
export const TEXT_SECONDARY_PLACEHOLDER = "Or type…";
export const TEXT_SECONDARY_LABEL = "Type (secondary)";

/**
 * VoiceAction kinds that count as work-driving (nav to real work,
 * governed chat, draft/approval, meeting→actions). Decorative or
 * blocked outcomes do not count as "drove work".
 */
const WORK_DRIVING_KINDS: ReadonlySet<VoiceActionKind> = new Set([
  "INTERNAL_NAVIGATION",
  "CONNECTOR_STATUS_NAVIGATION",
  "CONNECTOR_STATUS_SUMMARY",
  "APPROVALS_REVIEW",
  "DRAFT_MESSAGE",
  "SEND_REQUIRES_APPROVAL",
  "ASK_TWIN",
  "SCHEDULE_MEETING",
  "MEETING_NOTES_TO_ACTIONS",
  "WORKFLOW_START",
  "READ_ONLY_SUMMARY",
  "DRAFT_ONLY",
  "GOVERNED_CHAT",
]);

export function isWorkDrivingVoiceAction(kind: VoiceActionKind): boolean {
  return WORK_DRIVING_KINDS.has(kind);
}

/** UI priority order for D-02 composition rails. */
export type VoiceComposePriority = "voice_primary" | "text_secondary";

export function voiceComposePriority(
  modality: "mic" | "text",
): VoiceComposePriority {
  return modality === "mic" ? "voice_primary" : "text_secondary";
}

/**
 * Outcome strings that prove the shared work path responded (not a
 * decorative "I'm listening" only state).
 */
export function isWorkPathOutcomeCopy(copy: string): boolean {
  const t = copy.trim();
  if (t.length === 0) return false;
  // Decorative-only / empty listening states
  if (/^(listening|ready|speak now)\.?$/i.test(t)) return false;
  return (
    /proposed action|i found|sent|opened|needs me|approval|action center|what should|who should|blocker|follow-?up|decision|got it|using the|created|review request|track/i.test(
      t,
    ) || t.length >= 12
  );
}
