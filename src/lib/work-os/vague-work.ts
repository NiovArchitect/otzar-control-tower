// FILE: vague-work.ts
// PURPOSE: [OTZAR-LIVE-6] Endpoint-clarity guard. A vague work instruction with
//          no clear owner/recipient ("Handle this", "Someone should follow up",
//          "Send this to them") must ask ONE focused question — never mint an
//          ownerless or contextless artifact, never fall to generic chat. This is
//          pure detection; the orb chooses the exact question from current
//          context state (no context → ask for context first).
// CONNECTS TO: AmbientOtzarBar (handleVagueWorkCommand), tests/unit/vague-work.test.ts.

export interface VagueWorkIntent {
  /** What is missing: an owner/endpoint, or a recipient to send to. */
  ask: "owner" | "target";
}

// WHAT: Detect a vague, endpoint-less work instruction. Returns null when the
//        text is not vague work (so real commands flow through untouched). Runs
//        AFTER the correction / transcript / tracking / outbound handlers, so a
//        recipient-directed ask ("Ask David to handle this") or a "follow up
//        WITH <name>" never reaches here.
export function detectVagueWorkIntent(text: string): VagueWorkIntent | null {
  const t = text.trim();

  // Needs a recipient — the target is an unresolved pronoun.
  if (
    /\bsend\s+(?:this|that|it)\s+to\s+them\b/i.test(t) ||
    /\bthey\s+(?:need|want)\s+(?:this|that|it)\b/i.test(t)
  ) {
    return { ask: "target" };
  }

  // Needs an owner / endpoint — "do something with this" with no owner.
  if (
    /^(?:please\s+)?handle\s+(?:this|that|it)\b/i.test(t) ||
    /^(?:please\s+)?take\s+care\s+of\s+(?:this|that|it)\b/i.test(t) ||
    /^(?:please\s+)?(?:can\s+you\s+)?deal\s+with\s+(?:this|that|it)\b/i.test(t) ||
    /\bmake\s+sure\s+(?:this|that|it)\s+gets?\s+done\b/i.test(t) ||
    /\bmake\s+(?:this|that|it)\s+(?:happen|actionable)\b/i.test(t) ||
    /\b(?:someone|somebody)\s+should\s+(?:follow\s+up|handle|take|do|own|deal|look)\b/i.test(t) ||
    /^(?:please\s+)?(?:we\s+(?:need\s+to|should)\s+)?follow\s+up\s+on\s+(?:this|that|it)\b/i.test(t) ||
    /\bpush\s+(?:this|that|it)\s+(?:forward|along|through)\b/i.test(t) ||
    /\bmove\s+(?:this|that|it)\s+(?:forward|along)\b/i.test(t) ||
    /\bget\s+(?:this|that|it)\s+(?:done|unblocked|moving)\b/i.test(t) ||
    /\bclose\s+the\s+loop\s+on\s+(?:this|that|it)\b/i.test(t)
  ) {
    return { ask: "owner" };
  }

  return null;
}

// WHAT: The one focused question to ask, given the missing piece and whether the
//        user has provided any current context yet. No context → ask for it
//        first (a deictic "this" has nothing to bind to); otherwise ask who.
export function vagueWorkQuestion(
  intent: VagueWorkIntent,
  hasContext: boolean,
): string {
  if (!hasContext) return "What should I use as the current context?";
  return intent.ask === "target"
    ? "Who should I send this to?"
    : "Who should own this?";
}
