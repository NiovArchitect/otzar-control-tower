// FILE: ambient-outbound.ts
// PURPOSE: General ambient OUTBOUND work interpreter/composer. Turns a natural
//          instruction a user gives their Twin ("Message David and ask him to
//          validate what he received") into a structured plan with a COMPOSED,
//          recipient-facing message ("Hey David, can you validate what you
//          received?") — never the raw command verbatim. Recipient resolution +
//          authority/policy/audit stay on the governed backend rail
//          (POST /work-os/internal-messages). This is intentionally NOT
//          person- or phrase-specific: any teammate / team / role flows through
//          the same path, and meetings/transcripts/tasks can extend the `kind`
//          union later.
// CONNECTS TO: src/lib/work-os/message-sanitize.ts (composer primitives),
//          src/lib/voice/voice-action-runtime.ts (parseDirectAddress /
//          parseRelationalMessage reuse), src/components/otzar/AmbientOtzarBar.tsx
//          (dispatch — runs BEFORE the task planner), tests/unit/ambient-outbound.test.ts.

import { sanitizeOutboundMessage } from "@/lib/work-os/message-sanitize";
import {
  parseDirectAddress,
  parseRelationalMessage,
} from "@/lib/voice/voice-action-runtime";

export type AmbientOutboundKind =
  | "INTERNAL_MESSAGE"
  | "COLLABORATION_REQUEST"
  | "SELF_NOTE"
  | "SELF_TASK"
  | "SELF_REMINDER"
  | "SELF_REFLECTION"
  | "TWIN_MEMORY"
  | "CLARIFY";

// Governed collaboration-request types (subset the orb produces) — match the
// Foundation TwinCollaborationRequestType closed vocab.
export type CollaborationRequestType =
  | "REVIEW_REQUEST"
  | "FOLLOW_UP"
  | "APPROVAL_REQUEST";

// WHAT: A structured ambient-outbound plan. The execution layer reads
//        `recipient` + `recipientFacingMessage` and calls the governed rail
//        chosen by `kind` (plain message / governed collaboration request /
//        self work / clarify).
export interface AmbientOutboundPlan {
  kind: AmbientOutboundKind;
  recipient: string;
  recipientType: "PERSON" | "TEAM" | "ROLE";
  userInstruction: string;
  recipientFacingMessage: string;
  // The SAME work phrased back to the user in FIRST person, used only if the
  // named recipient turns out to be the caller themselves (by-name self
  // reroute): "ask David to validate what he received" → "Validate what I
  // received." Never "Hey David". Absent for relational / team / question
  // phrasings where a self reroute is not meaningful.
  selfFacingMessage?: string;
  // Set only for COLLABORATION_REQUEST — selects the governed request_type.
  requestType?: CollaborationRequestType;
  requiresApproval: boolean;
  confidence: number;
  reason: string;
}

// SELF kinds route to the self-work / Twin-memory rail, never a teammate message.
const SELF_KINDS: ReadonlySet<AmbientOutboundKind> = new Set([
  "SELF_NOTE",
  "SELF_TASK",
  "SELF_REMINDER",
  "SELF_REFLECTION",
  "TWIN_MEMORY",
]);

export function isSelfKind(kind: AmbientOutboundKind): boolean {
  return SELF_KINDS.has(kind);
}

// Imperative lead verbs that address a teammate/team for outbound work.
// NOTE: "send" is deliberately EXCLUDED — "Send <Name> this/a message" is owned
// by the draft-until-Confirm flow (SEND_REQUIRES_APPROVAL / DRAFT_MESSAGE). The
// ambient one-shot cases are ask/tell/message/have/remind/check with/follow up with.
const LEAD_VERBS =
  "ask|tell|message|msg|have|remind|check\\s+with|follow\\s+up\\s+with";

// A team/role phrase ("the product team", "product team") OR a capitalized name.
const TARGET = "(the\\s+[a-z][a-z'’-]*\\s+team|[a-z][a-z'’-]*\\s+team|[A-Z][a-zA-Z'’-]+)";

const LEAD_RE = new RegExp(
  `^(?:please\\s+)?(?:(?:can|could|would|will)\\s+(?:you\\s+)?(?:please\\s+)?)?(${LEAD_VERBS})\\s+${TARGET}\\b([\\s\\S]*)$`,
  "i",
);

// Tokens that must NEVER be treated as a recipient (pronouns / verbs).
const NON_RECIPIENT = new Set([
  "you", "your", "yours", "he", "him", "his", "she", "her", "hers", "they",
  "them", "their", "it", "me", "my", "mine", "i", "us", "we", "this", "that",
]);

// WHAT: Rewrite third-person references to the RECIPIENT into second person.
//        "ask him to validate what he received" → "validate what you received".
//        Leaves sender references ("me"/"I") intact. "her" is intentionally
//        left untouched (object vs possessive is ambiguous deterministically).
function toSecondPerson(s: string): string {
  return s
    .replace(/\bhe\b/gi, "you")
    .replace(/\bhim\b/gi, "you")
    .replace(/\bshe\b/gi, "you")
    .replace(/\bthey\b/gi, "you")
    .replace(/\bthem\b/gi, "you")
    .replace(/\bhis\b/gi, "your")
    .replace(/\btheir\b/gi, "your");
}

// WHAT: Re-phrase an already-second-person body into FIRST person, for the
//        by-name self reroute (the named recipient is the caller). Operates on
//        the second-person form ("validate what you received") so it only needs
//        you/your → I/my: "validate what you received" → "validate what I
//        received"; "confirm what you received on your side" → "…on my side".
//        EDGE (v1, acceptable): a rare object-position "you" after a preposition
//        ("send to you") maps via the preposition rule; any residual subject
//        "you" → "I". Not a general NLG rewriter — the canonical work clauses
//        ("validate/confirm/review what you …") resolve correctly.
function toFirstPersonSelf(s: string): string {
  return s
    .replace(/\byourself\b/gi, "myself")
    .replace(/\byours\b/gi, "mine")
    .replace(/\byour\b/gi, "my")
    .replace(/\b(to|with|for|at|by|from|of)\s+you\b/gi, "$1 me")
    .replace(/\byou\b/gi, "I");
}

// WHAT: Convert a relayed question from third person to a direct question.
//        "what he thinks" → "what do you think"; "how she wants to proceed" →
//        "how do you want to proceed". Falls back to plain he/she/they→you.
function toSecondPersonQuestion(s: string): string {
  const out = s.replace(
    /^(what|how|when|where|why|whether|which|who)\s+(?:he|she|they)\s+([a-z]+)\b/i,
    (_m, q: string, verb: string) => {
      const base =
        verb.toLowerCase() === "has"
          ? "have"
          : verb.toLowerCase() === "does"
            ? "do"
            : verb.replace(/s$/i, "");
      return `${q.toLowerCase()} do you ${base}`;
    },
  );
  return toSecondPerson(out);
}

function lowerFirst(s: string): string {
  if (s.length === 0) return s;
  // Keep the pronoun "I" / "I'm …" capitalized; otherwise lower the first char
  // so it reads naturally after "Hey <Name>, ".
  if (/^I\b|^I'/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function ensureTerminal(s: string, isQuestion: boolean): string {
  const t = s.trim().replace(/[.?!]+$/, "");
  return isQuestion ? `${t}?` : `${t}.`;
}

function isQuestionBody(s: string): boolean {
  return /^(?:can|could|would|will)\s+you\b|^did\s+you\b|^do\s+you\b/i.test(
    s.trim(),
  );
}

// WHAT: Re-phrase a bare work clause as a first-person self artifact, for the
//        by-name self reroute. Returns "" when nothing meaningful remains.
function composeSelfFacing(clause: string): string {
  const first = toFirstPersonSelf(sanitizeOutboundMessage(clause).trim());
  if (first.length === 0) return "";
  return ensureTerminal(first.charAt(0).toUpperCase() + first.slice(1), false);
}

function plan(
  recipient: string,
  recipientType: AmbientOutboundPlan["recipientType"],
  userInstruction: string,
  recipientFacingMessage: string,
  confidence: number,
  reason: string,
  kind: AmbientOutboundKind = "INTERNAL_MESSAGE",
  requestType?: CollaborationRequestType,
  selfFacingMessage?: string,
): AmbientOutboundPlan {
  return {
    kind,
    recipient,
    recipientType,
    userInstruction,
    recipientFacingMessage,
    ...(selfFacingMessage !== undefined && selfFacingMessage.length > 0
      ? { selfFacingMessage }
      : {}),
    ...(requestType !== undefined ? { requestType } : {}),
    requiresApproval: false,
    confidence,
    reason,
  };
}

// WHAT: Classify the WORK INTENT of a teammate-directed ask by its core verb,
//        so a governed work/approval request routes to the collaboration rail
//        instead of a plain internal message.
// INPUT: the ask clause (the part after "ask X to …" / the direct-address body).
// OUTPUT: the kind + (for collaboration) the governed request_type.
function intentFor(ask: string): {
  kind: AmbientOutboundKind;
  requestType?: CollaborationRequestType;
} {
  const l = ask.toLowerCase();
  if (/\b(approve|sign[\s-]?off|authori[sz]e|give\s+the\s+go[\s-]?ahead|ok\s+this)\b/.test(l)) {
    return { kind: "COLLABORATION_REQUEST", requestType: "APPROVAL_REQUEST" };
  }
  if (/\b(review|look\s+over|check\s+over)\b/.test(l)) {
    return { kind: "COLLABORATION_REQUEST", requestType: "REVIEW_REQUEST" };
  }
  if (
    /\b(prepare|draft|complete|finish|handle|take\s+care\s+of|work\s+on|build|fix|deliver|coordinate|put\s+together|follow\s+up\s+on|summari[sz]e|analy[sz]e|extract|recap|digest|look\s+into)\b/.test(
      l,
    )
  ) {
    return { kind: "COLLABORATION_REQUEST", requestType: "FOLLOW_UP" };
  }
  return { kind: "INTERNAL_MESSAGE" };
}

// WHAT: Detect a SELF-directed instruction ("remind me…", "note to self…",
//        "message myself…") so it becomes a self note/task/reminder instead of
//        a "Hey <Name>" teammate message. "ask my twin <question>" is NOT self
//        here — it returns null so the existing governed-chat path answers it.
// OUTPUT: { kind, body } when self-directed; null otherwise.
function detectSelf(raw: string): { kind: AmbientOutboundKind; body: string } | null {
  // "ask my twin / my own twin / my agent / otzar <…>" → defer to governed chat.
  if (/^(?:please\s+)?ask\s+(?:my\s+(?:own\s+)?twin|my\s+agent|otzar)\b/i.test(raw)) {
    return null;
  }
  let m: RegExpMatchArray | null;
  if ((m = raw.match(/^(?:please\s+)?remind\s+me\b\s*(?:to|that|about)?\s*(.*)$/i)) !== null) {
    return { kind: "SELF_REMINDER", body: m[1]!.trim() };
  }
  if (
    (m = raw.match(
      /^(?:please\s+)?(?:note\s+to\s+self|make\s+a\s+note|write\s+(?:myself\s+)?a\s+note|jot\s+(?:this\s+)?down)\b[:,]?\s*(?:to\s+|that\s+|about\s+)?(.*)$/i,
    )) !== null
  ) {
    return { kind: "SELF_NOTE", body: m[1]!.trim() };
  }
  if (
    (m = raw.match(/^(?:please\s+)?(?:remember|keep\s+in\s+mind|don'?t\s+forget)\b\s*(?:to|that|about)?\s*(.*)$/i)) !== null
  ) {
    return { kind: "TWIN_MEMORY", body: m[1]!.trim() };
  }
  if ((m = raw.match(/^(?:i\s+(?:need|have|ought)\s+to|i\s+should)\b\s*(.*)$/i)) !== null) {
    return { kind: "SELF_TASK", body: m[1]!.trim() };
  }
  // "message/tell myself [and ask me] to <X>" — explicit "myself"/"self" only
  // (NOT bare "tell me <question>", which is a query for the chat path).
  if ((m = raw.match(/^(?:please\s+)?(?:message|msg|tell|note)\s+(?:myself|self)\b(.*)$/i)) !== null) {
    const rest = (m[1] ?? "")
      .trim()
      .replace(/^(?:[,:]\s*)?and\s+(?:ask|tell|remind|let)\s+(?:me)?\s*/i, " ")
      .replace(/^\s*(?:to|that|if|about)\b\s*/i, "")
      .replace(/^\s*[,:—–-]\s*/, "")
      .trim();
    return { kind: "SELF_TASK", body: rest };
  }
  return null;
}

// WHAT: Build a SELF plan — the recipient-facing message is the self content
//        kept in FIRST person (it is about the user), capitalized + terminated.
function selfPlan(
  kind: AmbientOutboundKind,
  userInstruction: string,
  body: string,
): AmbientOutboundPlan {
  const clean = sanitizeOutboundMessage(body).trim();
  if (clean.length === 0) {
    return clarify(userInstruction, "Do you want this as a reminder, note, or task?");
  }
  const msg = ensureTerminal(clean.charAt(0).toUpperCase() + clean.slice(1), false);
  return {
    kind,
    recipient: "yourself",
    recipientType: "PERSON",
    userInstruction,
    recipientFacingMessage: msg,
    requiresApproval: false,
    confidence: 0.78,
    reason: "self",
  };
}

function clarify(userInstruction: string, message: string): AmbientOutboundPlan {
  return {
    kind: "CLARIFY",
    recipient: "",
    recipientType: "PERSON",
    userInstruction,
    recipientFacingMessage: message,
    requiresApproval: false,
    confidence: 0.3,
    reason: "ambiguous-or-empty",
  };
}

// WHAT: Build the final PERSON-facing message: "Hey <Name>, <body>" with a
//        clean terminal punctuation. TEAM/ROLE get the bare composed body.
function composeFor(
  recipient: string,
  recipientType: AmbientOutboundPlan["recipientType"],
  body: string,
  isQuestion: boolean,
): string {
  const clean = sanitizeOutboundMessage(body).trim();
  if (recipientType === "PERSON") {
    const inner = ensureTerminal(lowerFirst(clean), isQuestion);
    return sanitizeOutboundMessage(`Hey ${recipient}, ${inner}`);
  }
  return ensureTerminal(sanitizeOutboundMessage(clean), isQuestion);
}

// WHAT: Interpret a natural instruction into a recipient-directed outbound plan.
// INPUT: the raw user instruction.
// OUTPUT: an AmbientOutboundPlan (INTERNAL_MESSAGE / CLARIFY), or null when the
//         utterance is NOT recipient-directed (so normal chat/tasks/queries flow
//         through their existing paths untouched).
export function interpretAmbientOutboundWork(
  text: string,
): AmbientOutboundPlan | null {
  const raw = text.trim();
  if (raw.length === 0) return null;

  // SELF-directed work ("remind me…", "note to self…", "message myself…") —
  // route to the self note/task/reminder rail, NEVER a "Hey <Name>" message.
  const self = detectSelf(raw);
  if (self !== null) {
    return selfPlan(self.kind, raw, self.body);
  }

  // "ask my twin / my own twin / my agent / otzar <…>" is a reflective question
  // to the user's OWN Twin — defer to the governed-chat path (return null),
  // never compose it as a teammate message. ("ask David's Twin …" is unaffected.)
  if (/^(?:please\s+)?ask\s+(?:my\s+(?:own\s+)?twin|my\s+agent|otzar)\b/i.test(raw)) {
    return null;
  }

  // (d) Relational social message ("thank/congrats/apologize/welcome X …").
  const rel = parseRelationalMessage(raw);
  if (rel !== null) {
    return plan(
      rel.recipient,
      "PERSON",
      raw,
      composeFor(rel.recipient, "PERSON", rel.body, false),
      0.7,
      "relational",
    );
  }

  // (a)/(b) Imperative or modal lead + target ("ask David to …", "Tell the
  //          product team …", "can you message Shweta about …").
  const m = raw.match(LEAD_RE);
  if (m !== null) {
    const verb = m[1]!.toLowerCase().replace(/\s+/g, " ");
    // Strip a trailing possessive so "David's" → "David"; the recipient is the
    // PERSON behind any "<Name>'s Twin/agent".
    const recipient = m[2]!
      .trim()
      .replace(/^the\s+/i, "")
      .replace(/['’]s$/i, "");
    const isTeam = /\bteam$/i.test(recipient);
    let rest = (m[3] ?? "").trim();

    // "<Name>'s Twin/agent …" — drop the twin/agent word so we message the
    // PERSON (we route the question to them; we never answer for their Twin).
    rest = rest.replace(/^(?:['’]s\s+)?(?:ai\s+)?(?:twin|agent)\b/i, "").trim();

    // Compound framing: "Message David and ask him to validate …" — drop the
    // second directive verb + optional pronoun so only the ask clause remains.
    rest = rest.replace(
      /^(?:[,:]\s*)?and\s+(?:ask|tell|message|remind|let)\s+(?:him|her|them)?\s*/i,
      " ",
    );

    const recipientType: AmbientOutboundPlan["recipientType"] = isTeam
      ? "TEAM"
      : "PERSON";

    // A relayed question ("…what he thinks", "…how she wants to proceed") is
    // FORWARDED as a direct question, not wrapped as "can you …".
    const questionClause = rest.trim();
    if (/^(?:what|how|when|where|why|whether|which|who)\b/i.test(questionClause)) {
      const q = toSecondPersonQuestion(questionClause.replace(/[?.!]+$/, ""));
      if (q.length === 0 || NON_RECIPIENT.has(recipient.toLowerCase())) {
        return clarify(raw, `Who should I send that to, and what should it say?`);
      }
      return plan(
        recipient,
        recipientType,
        raw,
        composeFor(recipient, recipientType, q, true),
        0.8,
        `imperative-question:${verb}`,
      );
    }

    // A "to <clause>" connector (or an "ask" lead) marks an actionable request;
    // a bare clause after "tell X …" is an informational statement.
    const isRequest = verb === "ask" || /^\s*to\b/i.test(rest);
    rest = rest
      .replace(/^\s*(?:to|that|if|about|know\s+that)\b\s*/i, "")
      .replace(/^\s*[,:—–-]\s*/, "")
      .trim();

    if (rest.length === 0 || NON_RECIPIENT.has(recipient.toLowerCase())) {
      return clarify(
        raw,
        `Who should I send that to, and what should it say?`,
      );
    }

    const second = toSecondPerson(rest);
    const alreadyQuestion = isQuestionBody(second);
    const body = alreadyQuestion
      ? second
      : isRequest
        ? `can you ${second}`
        : second;
    const isQuestion = alreadyQuestion || isRequest;
    // Intent: a work/approval ask routes to the governed collaboration rail;
    // a plain ask (validate/confirm/tell) stays a plain internal message.
    const it = intentFor(rest);
    return plan(
      recipient,
      recipientType,
      raw,
      composeFor(recipient, recipientType, body, isQuestion),
      0.82,
      `imperative:${verb}`,
      it.kind,
      it.requestType,
      // First-person form for the by-name self reroute (derive from the bare
      // clause, not the "can you …"/"Hey <Name>" wrapper).
      composeSelfFacing(second),
    );
  }

  // (c) Direct address ("David, can you confirm what you received?").
  const da = parseDirectAddress(raw);
  if (da !== null && da.body !== undefined && da.body.trim().length > 0) {
    if (NON_RECIPIENT.has(da.recipient.toLowerCase())) return null;
    const body = toSecondPerson(da.body);
    const it = intentFor(da.body);
    return plan(
      da.recipient,
      "PERSON",
      raw,
      composeFor(da.recipient, "PERSON", body, isQuestionBody(body)),
      0.75,
      "direct-address",
      it.kind,
      it.requestType,
      composeSelfFacing(body),
    );
  }

  return null;
}
