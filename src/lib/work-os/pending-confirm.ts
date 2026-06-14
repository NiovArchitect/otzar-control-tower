// FILE: pending-confirm.ts
// PURPOSE: Phase 1284 Wave 2 — natural-language confirmation of an ACTIVE
//          pending draft. When the user has a pending internal-message draft
//          and says "I approve" / "send it" / "confirm" / "go ahead" / "yes
//          send it", that applies to the draft — it must NOT be interpreted
//          as navigation to Action Center. Only an explicit "open Action
//          Center" / "show approvals" navigates. Pure + unit-tested so the
//          classification can't silently drift.
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx (handleSendText
//          intercept), tests/unit/pending-confirm.test.ts.

// WHAT: True when the utterance is a bare confirmation of the active draft.
// WHY: lets the ambient bar apply "I approve" to the pending draft instead
//      of routing it as a navigation/approvals-review intent.
export function isPendingConfirmPhrase(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[.!,\s]+$/, "");
  return [
    "i approve",
    "approve",
    "approve it",
    "approved",
    "yes send it",
    "yes, send it",
    "send it",
    "go ahead",
    "confirm",
    "confirm it",
    "do it",
    "yes send",
    "send",
  ].includes(t);
}

// WHAT: True only when the user EXPLICITLY asks to open the Action Center /
//        approvals surface (navigation intent), so a pending-confirm phrase
//        is never swallowed by navigation.
export function isExplicitActionCenterNav(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /\b(open|go to|show|take me to|view)\b[^?]*\b(action center|approvals?)\b/.test(t);
}
