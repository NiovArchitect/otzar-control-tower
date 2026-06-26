// FILE: person-name.ts
// PURPOSE: [OTZAR-LIVE-6] One safe person-name formatter so people read as
//          people in the UI — "david" → "David", "samiksha sharma" → "Samiksha
//          Sharma". Display names from the server are not always cased, and the
//          Today greeting only has an email to work with. This humanizes those
//          WITHOUT corrupting emails, raw ids/UUIDs, or all-caps acronyms.
// CONNECTS TO: canonical-entity.entityLabel (folded in), AmbientWorkSurface
//          greeting, AmbientNotificationStack, PeopleDirectory, PersonCockpit,
//          MyTwin, admin Members; tests/unit/person-name.test.ts.

// Capitalize ONE token: first character up, the rest preserved as-is. An
// all-caps acronym (NIOV, HR) is left untouched; mixed-case (McKay, O'Brien) is
// not force-lowercased. A token that doesn't start with a letter (a UUID
// fragment, a number) is returned unchanged.
function capToken(word: string): string {
  if (word.length === 0) return word;
  if (word === word.toUpperCase() && word.length > 1) return word; // acronym
  const first = word.charAt(0);
  const upper = first.toUpperCase();
  if (upper === first) return word; // not a lowercase letter (digit/symbol)
  return upper + word.slice(1);
}

// Format a person DISPLAY name (space-separated words). Never applied to a value
// that is an email (contains "@") — that is returned verbatim so we never
// title-case an address. Empty/blank → "" so the caller can fall back.
export function formatPersonName(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.includes("@")) return trimmed; // an email slipped through — leave it
  return trimmed.split(/\s+/).map(capToken).join(" ");
}

// Humanize an email local-part into a friendly name when no display name
// exists: "samiksha.sharma@x.com" → "Samiksha Sharma", "david@x.com" → "David".
// Splits the local-part on . _ - separators. Returns null when there is nothing
// usable (so the caller can decide a neutral fallback).
export function nameFromEmail(email: string | null | undefined): string | null {
  if (typeof email !== "string") return null;
  const local = email.trim().split("@")[0] ?? "";
  const tokens = local.split(/[._-]+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return null;
  return tokens.map(capToken).join(" ");
}
