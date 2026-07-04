// FILE: clarity-phrases.ts
// PURPOSE: [CE-AMBIENT] Deterministic recognizer for clarity questions asked
//          in the ambient bar about the CURRENTLY SELECTED work item ("this").
//          Deliberately tight: only deictic clarity phrasings match, so
//          person-scoped thread queries, outbound commands, and corrections
//          keep their existing routes. The matched text is sent verbatim to
//          the read-only GET /work-os/ledger/:id/clarity-answer — the FND
//          classifier owns intent; this only decides "is this a clarity
//          question about the selected item?".
// CONNECTS TO: AmbientOtzarBar.tsx (dispatch intercept),
//          api.workOs.ledgerClarityAnswer, current-surface-context.ts.

// DEICTIC phrases name "this/it" — they are about a specific item even when
// nothing is selected, so a missing selection gets the honest "open or
// select" copy rather than a guess.
const DEICTIC_PHRASES: ReadonlyArray<RegExp> = [
  /why is (this|it|that) (here|assigned|mine)/i,
  /why (do|did) i (have|get) this/i,
  /where (did|does|is) (this|it|that) come from/i,
  /where('s| is) (this|it|that) from/i,
  /who can clarify (this|it)\??$/i,
  /who (knows|can help|can explain) about (this|it)\??$/i,
  /what('s| is) (the )?next( step)? for this\??$/i,
  /why does (this|it) need (an )?approval/i,
  /what happened (to|with) (my |the )?clarification/i,
  /who (asked for|requested|owns?) (this|it)\??$/i,
];

// CONTEXTUAL phrases are item-clarity ONLY when a work item is selected —
// bare "what should I do next?" with nothing selected is a day-level Twin
// question and must keep its existing route (locked behavior).
const CONTEXTUAL_PHRASES: ReadonlyArray<RegExp> = [
  /what should i do next/i,
  /what('s| is) (the )?next step\??$/i,
  /who can clarify\??$/i,
];

export type ClarityPhraseKind = "deictic" | "contextual";

/** Classify a clarity question about the selected work item. Deictic phrases
 *  always classify; contextual ones only matter when a selection exists (the
 *  caller decides). Null = not a clarity phrase — keep existing routes. */
export function classifyClarityPhrase(text: string): ClarityPhraseKind | null {
  const t = text.trim();
  if (t.length === 0 || t.length > 300) return null;
  if (DEICTIC_PHRASES.some((re) => re.test(t))) return "deictic";
  if (CONTEXTUAL_PHRASES.some((re) => re.test(t))) return "contextual";
  return null;
}
