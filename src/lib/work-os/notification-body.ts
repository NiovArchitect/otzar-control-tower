// FILE: notification-body.ts
// PURPOSE: P0-BUG-A — the recipient-visible internal-note summary is bounded
//          at Foundation's NOTIFICATION_BODY_SUMMARY_MAX_CHARS (200); a draft
//          longer than that was rejected as INVALID_FIELD ("request shape is
//          invalid"). This clamps the summary to a safe length on a word
//          boundary; the FULL draft is preserved separately in
//          body_redacted.body, so nothing is lost.
// CONNECTS TO: src/lib/api.ts (sendInternalNotification),
//              tests/unit/notification-body.test.ts.

/** Mirror of Foundation's NOTIFICATION_BODY_SUMMARY_MAX_CHARS (200). Kept
 *  slightly conservative so the "…" fits within the bound. */
export const NOTIFICATION_SUMMARY_MAX = 200;

// WHAT: clamp a draft to a valid body_summary — trimmed, and if longer than
//       the bound, cut on the last word boundary with a trailing ellipsis.
// INPUT: the full draft text.
// OUTPUT: a non-empty string ≤ NOTIFICATION_SUMMARY_MAX (assuming non-blank
//         input; a blank draft returns "" and the caller/validator rejects it
//         honestly rather than sending an empty note).
export function summarizeNotificationBody(draft: string): string {
  const text = draft.trim();
  if (text.length <= NOTIFICATION_SUMMARY_MAX) return text;
  const budget = NOTIFICATION_SUMMARY_MAX - 1; // leave room for the ellipsis
  const slice = text.slice(0, budget);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > budget * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
}
