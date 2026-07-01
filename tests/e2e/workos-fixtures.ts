// FILE: tests/e2e/workos-fixtures.ts
// PURPOSE: The canonical Work OS transcripts for the deep live smoke suite. The
//          primary transcript deterministically exercises the whole governed
//          loop: named owners (David/Pratham/Shiney), a noisy tail to quarantine,
//          a GitHub connector gap, and a governed grant_tool_access org seed.
//          A second transcript compounds org memory (reuses the same people +
//          a different execution type) to prove cross-conversation behaviour.
// CONNECTS TO: otzar-live-workos-*.spec.ts, workos-helpers.ts.

/** Primary transcript — the one the whole suite reasons about. A trailing noisy
 *  tail ("you you…", dots) MUST be quarantined and MUST NOT become work. */
export function primaryTranscript(marker: string): string {
  return [
    `Sadeil: Let's confirm owners for the launch demo. [${marker}]`,
    "David owns the repo access work and will grant Pratham write access today.",
    "Pratham owns connecting Google sign-in to the WebA app using the admin console.",
    "Shiney owns implementing proactive agent tool access for the demo.",
    "Thank you.",
    "Thank you.",
    "you you you you you",
    "............",
  ].join("\n");
}

/** Second transcript — reuses the same people (memory compounding) and adds a
 *  ticket/status-update flavour, to prove work accrues to the SAME org record
 *  across conversations rather than starting a fresh silo each time. */
export function followUpTranscript(marker: string): string {
  return [
    `Sadeil: Quick follow-up on the launch demo. [${marker}]`,
    "David will update the GitHub access ticket once Pratham confirms write access.",
    "Pratham reports the Google sign-in is almost done and will share a status update.",
    "Annie will coordinate the communications once the demo is signed off.",
    "ok ok ok",
    ".....",
  ].join("\n");
}

/** A private, caller-owned item with a unique marker — used to prove per-user
 *  recall isolation: another user must NOT be able to recall this marker. */
export function privateTranscript(marker: string): string {
  return [
    `I will privately draft the internal planning memo codenamed ${marker}.`,
    "This is my own work item and no one else is involved.",
  ].join("\n");
}

/** Structural invariants asserted on the REAL default extraction path (no forced
 *  mode) — these must hold or Otzar has regressed. Kept as predicates, not exact
 *  counts, so LLM variance in phrasing doesn't cause false failures while real
 *  behavioural regressions (lost owner, missing GitHub gap, noisy-tail leak,
 *  missing seed) DO fail loudly. */
export const OWNER_DAVID = /david/i;
export const NOISY_TOKENS = /you you|^[.\s]+$|ok ok/i;
export const GITHUB_CONNECTOR = "GITHUB";
export const NOT_CONNECTED = /not_connected|missing|unavailable|required/i;
export const SEED_TOOL_ACCESS = /grant_tool_access|tool_access|connector|github/i;
