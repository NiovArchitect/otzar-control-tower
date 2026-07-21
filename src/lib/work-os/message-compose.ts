// FILE: message-compose.ts
// PURPOSE: Intent-to-message transformation. Instructions to Otzar
//          ("Ping David for a status update") become professional
//          recipient-facing drafts — never the raw command verbatim.
//          Exact dictation ("Send David exactly: …") preserves wording.
// CONNECTS TO: ambient-outbound.ts, voice-action-runtime.ts,
//          AmbientOtzarBar.tsx, tests/unit/message-compose.test.ts.

import { sanitizeOutboundMessage } from "@/lib/work-os/message-sanitize";

export type MessageWordingMode = "INTENT" | "EXACT" | "USER_DRAFT";

export interface MessageComposeContext {
  /** Optional open item / project label the user already named. */
  topic?: string;
  /** Optional work dimensions to request (status updates). */
  statusDimensions?: string[];
  /** Greeting style. Default "hi". */
  greeting?: "hi" | "hey" | "none";
  /** Closing. Default "Thanks". Empty string omits. */
  closing?: string;
}

export interface ComposedMessage {
  mode: MessageWordingMode;
  recipient: string;
  /** Recipient-facing body only (no "Message →" chrome). */
  body: string;
  /** One-line purpose for draft preview chrome. */
  purpose: string;
  /** True when body was derived from intent, not user words. */
  transformed: boolean;
}

// Discourse markers users say *to Otzar* before the real instruction.
const LEADING_DISCOURSE =
  /^(?:yes|yeah|yep|yup|ok|okay|sure|please|alright|all\s+right|right|got\s+it|sounds\s+good|perfect|great)\s*[,.]?\s+/i;

// Explicit exact-wording cues (instruction still to Otzar, content dictated).
const EXACT_CUE =
  /\b(?:exactly(?:\s+this)?|use\s+these\s+words|quote\s+me|verbatim|word[\s-]for[\s-]word)\b/i;

// User-provided draft markers that usually wrap content to deliver.
const DRAFT_LEAD =
  /^(?:please\s+)?(?:tell|message|msg|text|write|say|send)\s+/i;

/**
 * Strip affirmations / discourse addressed to Otzar ("Yes, ping David…").
 */
export function stripDiscourseMarkers(text: string): string {
  let t = text.trim();
  // Repeat once or twice for "Yes, ok, ping…"
  for (let i = 0; i < 3; i++) {
    const next = t.replace(LEADING_DISCOURSE, "");
    if (next === t) break;
    t = next.trim();
  }
  return t;
}

/**
 * Detect whether the user dictated exact wording vs instructed Otzar to compose.
 */
export function detectWordingMode(text: string): MessageWordingMode {
  const raw = text.trim();
  if (raw.length === 0) return "INTENT";

  // Send/tell/message … exactly: "…"
  if (EXACT_CUE.test(raw)) return "EXACT";

  // Explicit colon + quotes after a message verb: Tell David: "…"
  if (
    /^(?:please\s+)?(?:tell|message|msg|text|write|say|send)\s+[A-Za-z][a-zA-Z'’-]*\s*:\s*["“'‘]/i.test(
      raw,
    )
  ) {
    return "EXACT";
  }

  // "Send this:" / "Send David this:" / "Message her:" with quoted body
  if (
    /\b(?:send|message|tell|write|say)\s+(?:this|these|it|him|her|them)\s*:\s*["“'‘]?/i.test(
      raw,
    ) ||
    /\b(?:send|message|tell)\s+\S+\s+(?:this|exactly)\s*:\s*/i.test(raw)
  ) {
    return "EXACT";
  }

  // "Tell David: bare content" without exact cue → user draft (preserve closely)
  if (
    /^(?:please\s+)?(?:tell|message|msg|write|say)\s+[A-Za-z][a-zA-Z'’-]*\s*:\s+\S/i.test(
      raw,
    )
  ) {
    return "USER_DRAFT";
  }

  // Quoted block after message verb
  if (
    DRAFT_LEAD.test(raw) &&
    /["“][^"”]{2,}["”]/.test(raw) &&
    /\b(?:exactly|this|these\s+words|quote)\b/i.test(raw)
  ) {
    return "EXACT";
  }

  return "INTENT";
}

function extractQuotedContent(text: string): string | undefined {
  const m = text.match(/["“]([^"”]{1,2000})["”]/);
  if (m?.[1] !== undefined && m[1].trim().length > 0) return m[1].trim();
  // After "exactly:" without quotes
  const exact = text.match(
    /\b(?:exactly(?:\s+this)?|this|these\s+words)\s*:\s*(.+)$/i,
  );
  if (exact?.[1] !== undefined) {
    return exact[1].trim().replace(/^["'“‘]|["'”’]$/g, "").trim();
  }
  return undefined;
}

function extractColonDraft(text: string): string | undefined {
  const m = text.match(
    /^(?:please\s+)?(?:tell|message|msg|write|say|send)\s+[A-Za-z][a-zA-Z'’-]*\s*:\s*(.+)$/is,
  );
  if (m?.[1] === undefined) return undefined;
  return m[1].trim().replace(/^["'“‘]|["'”’]$/g, "").trim();
}

/** Default dimensions for a status-update request. */
const DEFAULT_STATUS_DIMENSIONS = [
  "what is complete",
  "what is still blocked",
  "anything you need from me",
];

/**
 * Purpose-only residues that mean "compose a status request", not deliver these words.
 */
export function isPurposeOnlyClause(clause: string): boolean {
  const c = clause.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (c.length === 0) return true;
  return (
    /^(?:for\s+)?(?:a\s+)?(?:quick\s+)?(?:status\s+)?update(?:\s+on\s+.+)?$/.test(
      c,
    ) ||
    /^(?:for|about|regarding|on)\s+(?:a\s+)?(?:status\s+)?update(?:\s+on\s+.+)?$/.test(
      c,
    ) ||
    /^(?:for|about|regarding)\s+(?:progress|status)(?:\s+on\s+.+)?$/.test(c) ||
    /^an?\s+update(?:\s+on\s+.+)?$/.test(c) ||
    /^status(?:\s+update)?(?:\s+on\s+.+)?$/.test(c)
  );
}

/**
 * True when text still looks like an instruction *to Otzar* rather than a
 * message a recipient should read.
 */
export function looksLikeInstructionToOtzar(text: string): boolean {
  const t = stripDiscourseMarkers(text).trim();
  if (t.length === 0) return true;
  // Classic command leads
  if (
    /^(?:please\s+)?(?:ping|notify|message|msg|tell|ask|remind|send|draft|write|email|e-mail|dm|post|pass|share|follow\s+up\s+with|check\s+with)\b/i.test(
      t,
    )
  ) {
    return true;
  }
  // "Yes ping david for a status update" after weak strip
  if (/\bping\s+[A-Za-z]/i.test(t) && /\b(?:status\s+)?update\b/i.test(t)) {
    return true;
  }
  // Purpose-only
  if (isPurposeOnlyClause(t)) return true;
  return false;
}

function topicFromClause(clause: string): string | undefined {
  const c = clause.trim();
  const on = c.match(
    /(?:status\s+)?update\s+on\s+(.+)$/i,
  ) ?? c.match(/(?:for|about|regarding)\s+(?:a\s+)?(?:status\s+)?update\s+on\s+(.+)$/i);
  if (on?.[1] !== undefined) {
    return on[1].trim().replace(/[.!?]+$/, "");
  }
  const about = c.match(/^(?:for|about|regarding|on)\s+(.+)$/i);
  if (about?.[1] !== undefined) {
    const rest = about[1].trim().replace(/[.!?]+$/, "");
    // Skip pure "a status update"
    if (/^(?:a\s+)?(?:quick\s+)?(?:status\s+)?update$/i.test(rest)) return undefined;
    if (/^(?:a\s+)?(?:quick\s+)?(?:status\s+)?update\s+on\s+(.+)$/i.test(rest)) {
      return rest.replace(/^(?:a\s+)?(?:quick\s+)?(?:status\s+)?update\s+on\s+/i, "").trim();
    }
    if (!/^(?:a\s+)?status(?:\s+update)?$/i.test(rest)) return rest;
  }
  return undefined;
}

function isStatusUpdateIntent(text: string): boolean {
  return (
    /\b(?:status\s+update|progress\s+update)\b/i.test(text) ||
    /\b(?:for|about|regarding)\s+(?:a\s+)?(?:quick\s+)?(?:status\s+)?update\b/i.test(
      text,
    ) ||
    /\bping\b.+\bupdate\b/i.test(text) ||
    /\b(?:send|ask|get|request)\b.+\b(?:status|update)\b/i.test(text)
  );
}

/**
 * Compose a professional status-update request body.
 */
export function composeStatusUpdateBody(
  recipient: string,
  ctx: MessageComposeContext = {},
): string {
  const greeting = ctx.greeting ?? "hi";
  const topic = ctx.topic?.trim();
  const dims =
    ctx.statusDimensions && ctx.statusDimensions.length > 0
      ? ctx.statusDimensions
      : DEFAULT_STATUS_DIMENSIONS;
  const closing = ctx.closing !== undefined ? ctx.closing : "Thanks";

  const ask = topic
    ? `Can you send me a quick update on ${topic}?`
    : "Can you send me a quick status update?";

  const bullets = dims.map((d) => `• ${d}`).join("\n");
  const lines: string[] = [];
  if (greeting === "hi") lines.push(`Hi ${recipient},`, "");
  else if (greeting === "hey") lines.push(`Hey ${recipient},`, "");
  lines.push(ask, "", "Please include:", bullets);
  if (closing.length > 0) {
    lines.push("", closing);
  }
  return lines.join("\n");
}

/**
 * Compose a short natural request (non-status) from a work clause.
 */
export function composeNaturalRequestBody(
  recipient: string,
  clause: string,
  greeting: "hi" | "hey" | "none" = "hey",
): string {
  let body = clause.trim().replace(/[.!?]+$/, "").trim();
  // Strip residual "to " / "for " leads that are still instruction glue
  body = body.replace(/^(?:to|for|that|about)\s+/i, "").trim();
  // Third → second person lightly
  body = body
    .replace(/\bhe\b/gi, "you")
    .replace(/\bhim\b/gi, "you")
    .replace(/\bshe\b/gi, "you")
    .replace(/\bthey\b/gi, "you")
    .replace(/\bthem\b/gi, "you")
    .replace(/\bhis\b/gi, "your")
    .replace(/\btheir\b/gi, "your");

  if (body.length === 0) {
    return composeStatusUpdateBody(recipient, { greeting: greeting === "none" ? "hi" : greeting });
  }

  const alreadyQ =
    /^(?:can|could|would|will)\s+you\b|^did\s+you\b|^do\s+you\b|^please\b/i.test(
      body,
    );
  const inner = alreadyQ
    ? body.charAt(0).toUpperCase() + body.slice(1)
    : `Can you ${body.charAt(0).toLowerCase()}${body.slice(1)}?`;

  if (greeting === "none") {
    return sanitizeOutboundMessage(inner.endsWith("?") ? inner : `${inner.replace(/[.!?]+$/, "")}?`);
  }
  const g = greeting === "hi" ? "Hi" : "Hey";
  const terminal = /[?]$/.test(inner) ? inner : `${inner.replace(/[.!?]+$/, "")}?`;
  return sanitizeOutboundMessage(`${g} ${recipient}, ${terminal.charAt(0).toLowerCase()}${terminal.slice(1)}`);
}

export interface ComposeFromInstructionInput {
  instruction: string;
  recipient: string;
  /** Body already stripped by stripCommandWrapper / extractTellBody, if any. */
  extractedBody?: string;
  context?: MessageComposeContext;
}

/**
 * Core contract: turn an instruction (or extracted residue) into a safe draft body.
 * Never returns the raw Otzar instruction as the recipient-facing message.
 */
export function composeMessageFromInstruction(
  input: ComposeFromInstructionInput,
): ComposedMessage {
  const recipient = input.recipient.trim() || "there";
  const cleaned = stripDiscourseMarkers(input.instruction);
  const mode = detectWordingMode(cleaned);

  if (mode === "EXACT") {
    const quoted =
      extractQuotedContent(cleaned) ??
      extractColonDraft(cleaned) ??
      input.extractedBody?.trim();
    if (quoted !== undefined && quoted.length > 0 && !looksLikeInstructionToOtzar(quoted)) {
      return {
        mode: "EXACT",
        recipient,
        body: sanitizeOutboundMessage(quoted),
        purpose: `Exact message to ${recipient}`,
        transformed: false,
      };
    }
  }

  if (mode === "USER_DRAFT") {
    const draft = extractColonDraft(cleaned) ?? input.extractedBody?.trim();
    if (draft !== undefined && draft.length > 0 && !looksLikeInstructionToOtzar(draft)) {
      // Light naturalization: "we need the update today" → polite request
      const natural = composeNaturalRequestBody(recipient, draft, "hi");
      return {
        mode: "USER_DRAFT",
        recipient,
        body: natural,
        purpose: `Message ${recipient}`,
        transformed: true,
      };
    }
  }

  // INTENT path
  const residue = (input.extractedBody ?? "").trim();
  const topic =
    input.context?.topic ??
    topicFromClause(residue) ??
    topicFromClause(cleaned) ??
    undefined;

  const wantsStatus =
    isStatusUpdateIntent(cleaned) ||
    isStatusUpdateIntent(residue) ||
    isPurposeOnlyClause(residue);

  // Empty residue after "ping David" / purpose-only / clear status intent
  if (
    wantsStatus ||
    (residue.length === 0 &&
      /\b(?:ping|notify|message|ask|tell|remind)\b/i.test(cleaned))
  ) {
    const body = composeStatusUpdateBody(recipient, {
      ...input.context,
      ...(topic !== undefined ? { topic } : {}),
    });
    return {
      mode: "INTENT",
      recipient,
      body,
      purpose: topic
        ? `Request a status update on ${topic}`
        : "Request a status update",
      transformed: true,
    };
  }

  // Non-status intent with a useful extracted clause that isn't still a command
  if (
    residue.length > 0 &&
    !looksLikeInstructionToOtzar(residue) &&
    !isPurposeOnlyClause(residue)
  ) {
    const body = composeNaturalRequestBody(recipient, residue, "hey");
    return {
      mode: "INTENT",
      recipient,
      body,
      purpose: `Message ${recipient}`,
      transformed: true,
    };
  }

  // Fall through: try to pull a clause after the name from the instruction
  const afterName = cleaned.match(
    new RegExp(
      `\\b(?:ping|notify|message|msg|tell|ask|remind|send|let)\\s+${escapeRe(recipient)}\\b[\\s,:-]*(?:know\\s+)?(?:that\\s+)?([\\s\\S]+)$`,
      "i",
    ),
  );
  const clause = (afterName?.[1] ?? residue).trim();
  if (
    clause.length > 0 &&
    !isPurposeOnlyClause(clause) &&
    !looksLikeInstructionToOtzar(clause)
  ) {
    const body = composeNaturalRequestBody(recipient, clause, "hey");
    return {
      mode: "INTENT",
      recipient,
      body,
      purpose: `Message ${recipient}`,
      transformed: true,
    };
  }

  // Last resort: generic professional status request (never echo the command)
  const body = composeStatusUpdateBody(recipient, {
    ...input.context,
    ...(topic !== undefined ? { topic } : {}),
  });
  return {
    mode: "INTENT",
    recipient,
    body,
    purpose: topic
      ? `Request a status update on ${topic}`
      : "Request a status update",
    transformed: true,
  };
}

/**
 * Resolve the body for a draft card: never use raw `heard` as outbound content.
 */
export function resolveDraftBody(opts: {
  heard: string;
  recipient?: string;
  draftPayload?: string;
  context?: MessageComposeContext;
}): { body: string; purpose: string; mode: MessageWordingMode } {
  const recipient = (opts.recipient ?? "there").trim() || "there";
  const payload = opts.draftPayload?.trim();

  // If payload already looks like a professional message, keep it.
  if (
    payload !== undefined &&
    payload.length > 0 &&
    !looksLikeInstructionToOtzar(payload) &&
    !isPurposeOnlyClause(payload)
  ) {
    // Still reject if payload ≈ heard (literal relay)
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    if (norm(payload) !== norm(opts.heard) && norm(payload) !== norm(stripDiscourseMarkers(opts.heard))) {
      return {
        body: sanitizeOutboundMessage(payload),
        purpose: `Message ${recipient}`,
        mode: detectWordingMode(opts.heard),
      };
    }
  }

  const composed = composeMessageFromInstruction({
    instruction: opts.heard,
    recipient,
    ...(payload !== undefined ? { extractedBody: payload } : {}),
    ...(opts.context !== undefined ? { context: opts.context } : {}),
  });
  return {
    body: composed.body,
    purpose: composed.purpose,
    mode: composed.mode,
  };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
