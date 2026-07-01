// FILE: owner-display.ts
// PURPOSE: PROD-UX-P2 — client-side owner-name display guard. The backend
//          (P0D, Foundation PR #516 `work-item-planner.ts` pronoun/non-name
//          guard) already refuses to persist a pronoun or non-name token as a
//          work-item owner, but the frontend must ALSO never render a
//          pronoun-ish owner string ("Owned by his") if an older row or an
//          unguarded path surfaces one. This is a tiny pure port of the
//          Foundation guard so both tiers agree on what counts as a name.
// CONNECTS TO: src/pages/app/Comms.tsx (ingest work-item owner line),
//              tests/unit/prod-ux-copy-gate.test.tsx.

// Pronoun / indirect-reference tokens that must never be shown as an owner.
// Mirrors Foundation apps/api/src/services/otzar/work-item-planner.ts
// PRONOUN_TOKENS verbatim so the two tiers cannot drift apart silently.
const PRONOUN_TOKENS: ReadonlySet<string> = new Set([
  "he", "she", "they", "him", "her", "them", "his", "hers", "their", "theirs",
  "it", "its", "we", "us", "our", "ours", "i", "me", "my", "mine", "you",
  "your", "yours", "someone", "somebody", "anyone", "everybody", "everyone",
  "himself", "herself", "themselves",
]);

// WHAT: True when `name` is a pronoun / indirect reference / non-name token
//       that must not be rendered as an owner display name.
// INPUT: any candidate owner string (may be empty / lowercase / a pronoun).
// OUTPUT: boolean — true means "do NOT show this as an owner".
// WHY: A real person-name token starts with an uppercase letter and is not a
//      pronoun; anything else reads as junk identity in the product.
export function isPronounOrNonNameOwner(name: string): boolean {
  const t = name.trim();
  if (t.length === 0) return true;
  if (PRONOUN_TOKENS.has(t.toLowerCase())) return true; // catches "His"/"THEY"
  const first = t.split(/\s+/)[0] ?? "";
  if (!/^[A-Za-z][A-Za-z'.-]*$/.test(first)) return true; // must look like a name
  if (!/^[A-Z]/.test(t)) return true; // a name starts capitalized
  return false;
}

/** The human line shown when an owner string cannot be trusted as a name. */
export const OWNER_NEEDS_REVIEW_COPY = "Owner needs review";

// WHAT: Compose the owner line for a work item ("Owned by Sarah" or the
//       needs-review copy when the owner string is a pronoun / non-name).
// INPUT: the raw owner_name string from the backend view.
// OUTPUT: a safe human sentence — never "Owned by his".
// WHY: P2 copy gate — the frontend must not depend on the backend guard alone.
export function formatOwnedByLine(ownerName: string): string {
  if (isPronounOrNonNameOwner(ownerName)) return OWNER_NEEDS_REVIEW_COPY;
  return `Owned by ${ownerName}`;
}
