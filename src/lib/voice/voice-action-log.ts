// FILE: voice-action-log.ts
// PURPOSE: Phase 1264 (Addendum, Part N) — a small, SAFE audit trail
//          for voice navigation/actions. Records what was heard, the
//          interpreted action, the target (route, or URL hostname +
//          redacted path only — never query strings that may carry
//          tokens), the result, and which voice path spoke. Emits a
//          structured console.info line and keeps a short in-memory
//          ring the UI can surface. NEVER logs secrets, full URLs with
//          queries, raw audio, or anything beyond the transcript the
//          user chose to speak.
// CONNECTS TO: AmbientOtzarBar (records each voice action),
//          tests/unit/voice-action-log.test.ts.

export type VoiceActionResult =
  | "success"
  | "blocked"
  | "failed"
  | "needs_confirmation";

export interface VoiceActionLogEntry {
  /** ISO timestamp (caller-supplied so it stays deterministic/testable). */
  at: string;
  transcript: string;
  action_type: string;
  /** Internal route OR a redacted external target ("example.com/path"). */
  target: string | null;
  result: VoiceActionResult;
  voice_path: string | null;
}

const RING_MAX = 25;
const ring: VoiceActionLogEntry[] = [];

/** Reduce a URL to hostname + redacted path. Query + fragment (which
 *  may carry tokens) are dropped entirely. Returns the raw string for
 *  non-URLs (internal routes) unchanged. */
export function redactTarget(target: string | null | undefined): string | null {
  if (target === null || target === undefined || target.length === 0) return null;
  if (/^https?:\/\//i.test(target)) {
    try {
      const u = new URL(target);
      const path = u.pathname === "/" ? "" : u.pathname;
      return `${u.host}${path}`;
    } catch {
      return "(invalid-url)";
    }
  }
  // Internal route — strip any query string defensively.
  const q = target.indexOf("?");
  return q >= 0 ? target.slice(0, q) : target;
}

export function recordVoiceAction(input: {
  at: string;
  transcript: string;
  actionType: string;
  target?: string | null;
  result: VoiceActionResult;
  voicePath?: string | null;
}): VoiceActionLogEntry {
  const entry: VoiceActionLogEntry = {
    at: input.at,
    transcript: input.transcript,
    action_type: input.actionType,
    target: redactTarget(input.target),
    result: input.result,
    voice_path: input.voicePath ?? null,
  };
  ring.push(entry);
  if (ring.length > RING_MAX) ring.shift();
  // Safe structured diagnostic — no secrets, no full query strings.
  console.info("[otzar-voice-action]", entry);
  return entry;
}

/** Most-recent-first snapshot of the in-memory action log. */
export function getVoiceActionLog(): VoiceActionLogEntry[] {
  return [...ring].reverse();
}

export function clearVoiceActionLog(): void {
  ring.length = 0;
}
