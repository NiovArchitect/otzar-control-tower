// FILE: style-mirror.ts
// PURPOSE: [CS-4] The writing-style mirror — pure, deterministic, and
//          CLIENT-SIDE ONLY. The employee's raw sample NEVER leaves the
//          browser: this module (a) guards against company/sensitive
//          content with an honest refusal (token list + transcript-pattern
//          + document-length checks — guardrails, not a classifier
//          pretense), and (b) reflects purely MECHANICAL structure back
//          (sentence length, bullets, questions, greetings — counts, never
//          semantic classification). What gets proposed to memory is the
//          employee's OWN guidance words plus this mechanical structure
//          line — style shape, never facts, never the sample.
// CONNECTS TO: src/pages/app/WritingStyle.tsx, the CS-3 calibration route
//          (writing_style_text), Gap V doctrine lane 2 / CS-4.

export const SAMPLE_MAX_CHARS = 1200;

/** Broad client-side risky list (the server keeps a conservative subset). */
const RISKY_TOKENS = [
  "confidential", "nda", "contract", "roadmap", "revenue", "password",
  "api key", "api_key", "apikey", "secret", "access token", "bearer ",
  "social security", "ssn", "bank account", "routing number", "medical",
  "diagnosis", "attorney", "privileged",
];

export type SampleCheck =
  | { ok: true }
  | { ok: false; reason: "too_long" | "risky_token" | "transcript_like" | "empty"; message: string };

const REPAIR =
  "This looks like company or sensitive content. Use a short sample you wrote yourself, or describe your style in general terms.";

/** Deterministic guardrails — refuse, never save, never transmit. */
export function checkSample(sample: string): SampleCheck {
  const text = sample.trim();
  if (text.length === 0) {
    return { ok: false, reason: "empty", message: "Paste or write a short sample first." };
  }
  if (text.length > SAMPLE_MAX_CHARS) {
    return {
      ok: false,
      reason: "too_long",
      message: `Keep the sample under ${SAMPLE_MAX_CHARS} characters — a few paragraphs is plenty. ${REPAIR}`,
    };
  }
  const lower = text.toLowerCase();
  for (const token of RISKY_TOKENS) {
    if (lower.includes(token)) {
      return { ok: false, reason: "risky_token", message: REPAIR };
    }
  }
  // Transcript-like: several lines that open "Name:" — meeting-note shape.
  const speakerLines = text
    .split(/\r?\n/)
    .filter((l) => /^[A-Z][A-Za-z .'-]{1,30}:\s/.test(l.trim())).length;
  if (speakerLines >= 3) {
    return { ok: false, reason: "transcript_like", message: REPAIR };
  }
  return { ok: true };
}

/** Purely mechanical structure observations — counts, not judgments. */
export function mirrorStructure(sample: string): string[] {
  const text = sample.trim();
  const out: string[] = [];
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/[.!?]+\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length > 0) {
    const avgWords =
      sentences.reduce((n, s) => n + s.split(/\s+/).length, 0) / sentences.length;
    out.push(
      avgWords <= 10
        ? "short, punchy sentences"
        : avgWords <= 20
          ? "medium-length sentences"
          : "longer, flowing sentences",
    );
  }
  if (/^\s*[-*•]\s/m.test(text)) out.push("uses bullet lists");
  const questions = (text.match(/\?/g) ?? []).length;
  if (questions >= 2) out.push("asks questions");
  if ((text.match(/!/g) ?? []).length >= 2) out.push("expressive punctuation");
  if (/^(hi|hey|hello|dear)\b/i.test(text)) out.push("opens with a greeting");
  if (/(thanks|thank you|best|cheers|regards)[,!.\s]*$/i.test(text)) out.push("ends with thanks or a sign-off");
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length >= 3) out.push("breaks ideas into short paragraphs");
  return out;
}

/** The final proposed guidance: the employee's own words + the mechanical
 *  structure line. The sample itself is NEVER included. */
export function composeStyleGuidance(ownWords: string, structure: string[]): string {
  const parts: string[] = [];
  const words = ownWords.trim();
  if (words.length > 0) parts.push(words);
  if (structure.length > 0) parts.push(`Observed structure: ${structure.join("; ")}.`);
  return parts.join(" ").slice(0, 600);
}
