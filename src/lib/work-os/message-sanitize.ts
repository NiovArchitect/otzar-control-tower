// FILE: message-sanitize.ts
// PURPOSE: Phase 1284 Wave 2 — clean recipient-facing message text so Otzar
//          reads like natural workplace communication, not AI-written.
//          (1) Strip the command wrapper ("Tell David, …") from a direct
//          internal message so the recipient never sees the instruction.
//          (2) Remove spaced em/en dashes (the AI "tell" — punctuation) in
//          favor of plain periods/commas. Never touches dates/ranges/IDs
//          (dashes WITHOUT surrounding spaces, e.g. "9-5", "v1-2", "2026-07")
//          are preserved.
// CONNECTS TO: src/lib/voice/voice-action-runtime.ts (extractTellBody),
//          tests/unit/message-sanitize.test.ts.

// WHAT: Replace spaced em/en dashes with natural punctuation + tidy spacing
//        + sentence-case. Leaves unspaced dashes (ranges/IDs) alone.
export function sanitizeOutboundMessage(input: string): string {
  let out = (input ?? "").trim();
  if (out.length === 0) return out;
  // Spaced em/en dash → sentence break (". "). " — " / " – " / "—" with spaces.
  out = out.replace(/\s*[—–]\s+/g, ". ");
  // Collapse any double spaces / stray spaces before punctuation.
  out = out.replace(/\s{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
  // Sentence-case: capitalize the first letter and the letter after ". ".
  out = out.replace(/(^\s*[a-z])|([.!?]\s+[a-z])/g, (m) => m.toUpperCase());
  return out;
}

// Canonical casing for recognized greetings.
const GREETING_CANONICAL: Record<string, string> = {
  "good morning": "Good morning",
  "good afternoon": "Good afternoon",
  "good evening": "Good evening",
  "good night": "Good night",
  hello: "Hello",
  hi: "Hi",
  hey: "Hey",
};

// WHAT: When the body STARTS with a greeting, strip the speech-command glue
//        that follows it ("and that", "and tell him that", "and let her know
//        that", a bare leading "that") and canonicalize the greeting. This is
//        scoped to greeting-led bodies ONLY, so real content like "The policy
//        changed and that impacts the launch" is left untouched.
export function normalizeGreetingGlue(text: string): string {
  const m = text.match(
    /^\s*(good\s+(?:morning|afternoon|evening|night)|hello|hi|hey)\b[,.!]?\s*/i,
  );
  if (m === null) return text;
  const canonical = GREETING_CANONICAL[m[1]!.toLowerCase().replace(/\s+/g, " ")] ?? m[1]!;
  let rest = text.slice(m[0].length);
  // Strip the connector glue immediately after the greeting.
  rest = rest.replace(
    /^and\s+(?:tell\s+(?:him|her|them)\s+that\s+|let\s+(?:him|her|them)\s+know\s+that\s+|that\s+)/i,
    "",
  );
  // A bare leading "that " right after the greeting is also glue.
  rest = rest.replace(/^that\s+/i, "");
  rest = rest.trim();
  return rest.length === 0 ? `${canonical}.` : `${canonical}, ${rest}`;
}

// Command-wrapper prefixes for the "tell/message/let X know" family. Used to
// strip the instruction from the outbound body (so "Tell David, good
// afternoon" delivers "Good afternoon.").
const WRAPPER_LEADINS =
  "(?:know\\s+)?(?:that\\s+)?(?:i\\s+said\\s+)?(?:i\\s+wanted\\s+to\\s+say\\s+)?(?:this\\s+message\\s*[,:]?\\s*)?(?:to\\s+)?";

// WHAT: Strip "tell/message/remind/let/ping/notify/send/pass [this to] <name>
//        [, : know that i said …]" from the front of an utterance, returning
//        the human message body (sanitized). Handles the comma/colon after
//        the name ("Tell David, …" / "Message David: …").
// OUTPUT: the cleaned body, or undefined when nothing meaningful remains.
export function stripCommandWrapper(
  text: string,
  recipient: string,
): string | undefined {
  const escaped = recipient.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `^\\s*(?:tell|message|msg|remind|let|ping|notify|send|pass)\\s+(?:this\\s+to\\s+)?${escaped}\\s*[,:]?\\s*${WRAPPER_LEADINS}`,
    "i",
  );
  const stripped = text.replace(re, "");
  const body = sanitizeOutboundMessage(normalizeGreetingGlue(stripped));
  return body.length >= 2 ? body : undefined;
}
