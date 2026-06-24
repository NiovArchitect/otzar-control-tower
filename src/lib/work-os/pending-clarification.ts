// FILE: pending-clarification.ts
// PURPOSE: [OTZAR-LIVE-6] Lightweight, EPHEMERAL conversational working memory
//          for the current ambient flow. When Otzar asks one focused question
//          ("Who should receive this?"), the next user turn ("David and Samiksha
//          are the recipients") must bind to that awaited slot and RESUME the
//          pending action — not be re-classified from scratch. Before this, a
//          clarification answer fell through the whole dispatch cascade and the
//          original intent was lost (founder live failure).
//
//          This is SHORT-LIVED, in-session working memory only — NOT durable
//          memory, NOT the DMW, NOT a transcript store, NOT global learning.
//          It records just enough to finish the immediate workflow: the awaited
//          slot, the preserved draft message, and the recipients gathered so
//          far. It expires (TTL) and is abandoned the moment the next turn is
//          not an answer to the question, so a stale ask can never bind a later
//          unrelated name.
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx (handleSendText —
//          set at clarification sites, consumed after classifyThreadQuery),
//          tests/unit/pending-clarification.test.ts.

// The kind of pending work the clarification is gathering a slot for. Mirrors
// the governed rails the resume path will drive (plain teammate message today;
// collaboration request reuses the same recipient gathering).
export type PendingClarificationKind =
  | "outbound_message"
  | "collaboration_request";

// The slot Otzar is waiting for the user to supply on the next turn.
export type ClarificationSlot = "recipient" | "confirm";

export interface PendingClarification {
  /** Opaque id (caller-supplied; only for keying the UI chip). */
  id: string;
  kind: PendingClarificationKind;
  /** What we asked for and expect the next answer to fill. */
  awaiting: ClarificationSlot;
  /** The user's original command, preserved so intent is never lost. */
  originalText: string;
  /** The COMPOSED, recipient-facing body to deliver once recipients resolve
   *  ("Please send me your updates."). Never the raw command verbatim. */
  draftMessage: string;
  /** Recipient names gathered so far (across turns) — display-cased. Lets a
   *  partial multi-recipient set carry forward when one name didn't resolve. */
  recipients: string[];
  /** Epoch ms when created — drives the TTL. */
  createdAt: number;
}

// Short-lived: a clarification answer is expected on the immediately following
// turn(s); after this it's stale and ignored.
export const CLARIFICATION_TTL_MS = 5 * 60_000;

export function isClarificationExpired(
  c: PendingClarification,
  now: number,
): boolean {
  return now - c.createdAt > CLARIFICATION_TTL_MS;
}

// Tokens that are never a recipient name (pronouns / framing words).
const NON_RECIPIENT = new Set([
  "i", "me", "my", "mine", "we", "us", "you", "your", "yours", "he", "him",
  "his", "she", "her", "hers", "they", "them", "their", "it", "this", "that",
  "the", "a", "an", "both", "of", "recipient", "recipients", "people",
  "everyone", "anyone", "someone", "team", "all", "and", "to", "for",
]);

// Framing prefixes a user puts before the actual names when answering "who?".
// "the recipients are X and Y" / "send it to X" / "for X" / "it's X".
const RECIPIENT_FRAME =
  /^\s*(?:the\s+)?(?:recipients?\s+(?:are|is)|recipients?\s*:|send\s+(?:it\s+)?to|deliver\s+(?:it\s+)?to|message|to|for|it'?s\s+for|it'?s|its)\s+/i;
// Trailing framing the user appends ("… are the recipients").
const RECIPIENT_FRAME_TAIL = /\s+(?:are|is)\s+the\s+recipients?\.?$/i;

// WHAT: Extract recipient name(s) from a clarification answer.
// INPUT: a user turn that is expected to answer "who should receive this?".
// OUTPUT: display-cased names (["David", "Samiksha"]), or [] if the text is not
//         a recipient-shaped answer (a fresh command, a long sentence, etc.) —
//         so a non-answer never gets mistaken for recipients.
// WHY: multi-recipient continuity ("David and Samiksha") plus single ("for
//      William") through ONE path, recipient-count-agnostic. Handles lowercase
//      names (the founder typed "david and samiksha are the recipients").
export function parseRecipientList(text: string): string[] {
  let t = text.trim();
  if (t.length === 0) return [];
  // Strip a trailing "?" / "." so shapes match.
  t = t.replace(/[?.!]+$/, "").trim();
  // Peel framing so "the recipients are X and Y" → "X and Y".
  t = t.replace(RECIPIENT_FRAME_TAIL, "").trim();
  const framed = RECIPIENT_FRAME.test(t);
  t = t.replace(RECIPIENT_FRAME, "").trim();
  // Drop a leading "both" ("both David and Samiksha").
  t = t.replace(/^both\s+/i, "").trim();

  // Split on conjunctions / commas. The remaining tokens must each look like a
  // single name word; anything with a verb-y/long token disqualifies the whole
  // parse (we don't want "remind me to call mom" read as recipients).
  const parts = t
    .split(/\s*(?:,|&|\band\b|\bplus\b)\s*/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return [];

  const names: string[] = [];
  for (const part of parts) {
    // A name part is one or two simple word tokens (e.g. "David", "Mary Jane"),
    // letters/apostrophes/hyphens only.
    if (!/^[A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*)?$/.test(part)) {
      return []; // not a clean recipient list — abandon the parse
    }
    const tokens = part.split(/\s+/);
    if (tokens.every((tok) => NON_RECIPIENT.has(tok.toLowerCase()))) continue;
    // If ANY token is a framing/stopword mixed with a name we keep the name
    // tokens only; but a lone stopword part is skipped above.
    const kept = tokens.filter((tok) => !NON_RECIPIENT.has(tok.toLowerCase()));
    if (kept.length === 0) continue;
    names.push(kept.map(capitalize).join(" "));
  }
  // Guardrail: without explicit framing, require the WHOLE input to be just
  // names+conjunctions (already enforced by the per-part regex) — and cap the
  // count so a runaway parse can't fan out.
  void framed;
  const deduped = dedupe(names);
  return deduped.slice(0, 8);
}

// "okay never mind" / "cancel" / "forget it" / "stop" / "don't send" — abandon
// the pending action calmly.
export function isCancelPhrase(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  return (
    /^(?:cancel|never\s*mind|nevermind|forget\s+it|forget\s+that|stop|drop\s+it|don'?t\s+send|do\s+not\s+send|scrap\s+it|no\s+thanks?|leave\s+it)$/.test(
      t,
    ) || /^(?:actually,?\s+)?(?:never\s*mind|forget\s+it|cancel\s+that)\b/.test(t)
  );
}

// WHAT: Compose a clean, recipient-facing request body from the user's original
//       command, preserving the objective ("send me their updates" → "Please
//       send me your updates.").
// WHY: the outbound CLARIFY/draft paths discard the body; we re-derive it so the
//      resumed send isn't the raw command verbatim.
export function composeRequestBody(originalText: string): string {
  const raw = originalText.trim();
  // "(I) need/want/'d like/would like X (and Y) to <predicate>" → predicate.
  // "(can you / please) get/have X to <predicate>" → predicate.
  let predicate = "";
  const needMatch = raw.match(
    /\b(?:need|want|'?d like|would like|get|have|ask|tell|remind|like)\b.*?\bto\s+([\s\S]+)$/i,
  );
  if (needMatch && needMatch[1]) {
    predicate = needMatch[1];
  } else {
    // "send X this message: <body>" / "tell X that <body>".
    const colon = raw.match(/(?::|—|,)\s*([\s\S]+)$/);
    const that = raw.match(/\bthat\s+([\s\S]+)$/i);
    if (colon && colon[1]) predicate = colon[1];
    else if (that && that[1]) predicate = that[1];
  }
  predicate = predicate.trim().replace(/[.!]+$/, "").trim();
  if (predicate.length === 0) {
    return "Please send me an update.";
  }
  // Third-person possessives referring to the recipients become second person:
  // "send me their updates" → "send me your updates".
  const second = predicate
    .replace(/\btheir\b/gi, "your")
    .replace(/\bthem\b/gi, "you")
    .replace(/\bthey\b/gi, "you")
    // Avoid em/en dashes per the ambient copy rules — normalize to a comma.
    .replace(/\s*[—–]\s*/g, ", ");
  // Imperative + polite.
  const body = `Please ${second}.`;
  return body.charAt(0).toUpperCase() + body.slice(1);
}

// "David and Samiksha" / "David, Samiksha, and William" for calm outcome copy.
export function formatRecipientList(names: string[]): string {
  const n = names.filter((s) => s.trim().length > 0);
  if (n.length === 0) return "";
  if (n.length === 1) return n[0]!;
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n.slice(0, -1).join(", ")}, and ${n[n.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function dedupe(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const k = n.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(n);
    }
  }
  return out;
}
