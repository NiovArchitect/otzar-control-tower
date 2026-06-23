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

export type AmbientOutboundKind = "INTERNAL_MESSAGE" | "CLARIFY";

// WHAT: A structured ambient-outbound plan. The execution layer reads
//        `recipient` + `recipientFacingMessage` and calls the governed rail.
export interface AmbientOutboundPlan {
  kind: AmbientOutboundKind;
  recipient: string;
  recipientType: "PERSON" | "TEAM" | "ROLE";
  userInstruction: string;
  recipientFacingMessage: string;
  requiresApproval: boolean;
  confidence: number;
  reason: string;
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

function plan(
  recipient: string,
  recipientType: AmbientOutboundPlan["recipientType"],
  userInstruction: string,
  recipientFacingMessage: string,
  confidence: number,
  reason: string,
): AmbientOutboundPlan {
  return {
    kind: "INTERNAL_MESSAGE",
    recipient,
    recipientType,
    userInstruction,
    recipientFacingMessage,
    requiresApproval: false,
    confidence,
    reason,
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
    return plan(
      recipient,
      recipientType,
      raw,
      composeFor(recipient, recipientType, body, isQuestion),
      0.82,
      `imperative:${verb}`,
    );
  }

  // (c) Direct address ("David, can you confirm what you received?").
  const da = parseDirectAddress(raw);
  if (da !== null && da.body !== undefined && da.body.trim().length > 0) {
    if (NON_RECIPIENT.has(da.recipient.toLowerCase())) return null;
    const body = toSecondPerson(da.body);
    return plan(
      da.recipient,
      "PERSON",
      raw,
      composeFor(da.recipient, "PERSON", body, isQuestionBody(body)),
      0.75,
      "direct-address",
    );
  }

  return null;
}
