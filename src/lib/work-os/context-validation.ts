// FILE: context-validation.ts
// PURPOSE: [AIX-2] the pure copy + option model for in-context validation
//          of seeded background context ("Is this still current?"). One
//          targeted affordance rendered ONLY on seeded rows inside the
//          already-open View/Why detail — never a queue, never a review
//          dashboard, never an admin job. The internal states ride the
//          POST body; the UI renders customer labels only.
// CONNECTS TO: WorkLedgerItem.tsx (the affordance), api.workOs
//          .validateSeededContext, FND context-relevance.service.ts,
//          tests/unit/context-validation.test.tsx.

export const CONTEXT_VALIDATION_STATES = [
  "confirmed",
  "stale",
  "wrong_scope",
  "contradicted",
  "needs_clarifier",
] as const;
export type ContextValidationState = (typeof CONTEXT_VALIDATION_STATES)[number];

/** The one question the affordance asks — on seeded rows only. */
export const CONTEXT_VALIDATION_QUESTION =
  "This is seeded background context. Is it still current for this work?";

/** The five choices, in display order, with customer labels. */
export const CONTEXT_VALIDATION_OPTIONS: ReadonlyArray<{
  state: ContextValidationState;
  label: string;
}> = [
  { state: "confirmed", label: "Still current" },
  { state: "stale", label: "Outdated" },
  { state: "wrong_scope", label: "Wrong context" },
  { state: "contradicted", label: "Conflicts with newer work" },
  { state: "needs_clarifier", label: "Ask someone else" },
];

/** Honest post-action copy — records what happened, promises nothing more
 *  (validation informs Otzar; it does not retrain, delete, or purge). */
export const CONTEXT_VALIDATION_DONE: Record<ContextValidationState, string> = {
  confirmed: "Confirmed as current by your team.",
  stale: "Marked outdated. Otzar should use newer or live work instead.",
  wrong_scope: "Marked as wrong context for this work.",
  contradicted:
    "Marked as conflicting with newer work. Otzar should ask before acting on it.",
  needs_clarifier: "Otzar needs the right person to confirm this.",
};

/** Honest failure copy — nothing changed, and no invented authority. */
export const CONTEXT_VALIDATION_FAILED =
  "Otzar couldn't record this. Nothing was changed — this may need someone closer to the work or an admin.";
