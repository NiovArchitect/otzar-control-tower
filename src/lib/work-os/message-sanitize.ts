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
  const body = sanitizeOutboundMessage(text.replace(re, ""));
  return body.length >= 2 ? body : undefined;
}
