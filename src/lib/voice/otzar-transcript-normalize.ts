// FILE: otzar-transcript-normalize.ts
// PURPOSE: Display-layer fix for common STT misspellings of "Otzar".
//          Does not invent other product names. Used on final transcripts
//          shown to the user and (lightly) on speak-back text.
// CONNECTS TO: AmbientOtzarBar, Voice page, STT finalization paths.

/** Variants seen in live STT for the product name Otzar. */
const OTZAR_VARIANT =
  /\b(?:O-T-S-A-R|O-T-Z-A-R|Otsar|Otzer|Ozar|Otser|Ozter|Otsarr|Otzaar|O\.T\.S\.A\.R\.?|O\.T\.Z\.A\.R\.?)\b/gi;

/**
 * Normalize spoken product-name variants to canonical "Otzar".
 * Word-boundary only; does not rewrite arbitrary substrings.
 */
export function normalizeOtzarInTranscript(text: string): string {
  if (text.length === 0) return text;
  return text.replace(OTZAR_VARIANT, "Otzar");
}

/**
 * Prefer spoken form for TTS when the browser mangles "Otzar".
 * Many engines pronounce it better when given as "Otsar" — we keep
 * displayed text as Otzar and only adjust when the engine is known weak.
 * Default: speak the displayed spelling (Otzar).
 */
export function otzarSpeakText(text: string): string {
  // Keep display spelling; engines that fail can use SSML later.
  return normalizeOtzarInTranscript(text);
}
