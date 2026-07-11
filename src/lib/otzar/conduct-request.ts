// FILE: src/lib/otzar/conduct-request.ts
// PURPOSE: [OTZAR-CONTINUITY P5 Stage 1 §11-§12] The ONE builder for a governed Otzar
//          chat turn (POST /otzar/conversation/message). Every submission carries a
//          stable idempotency key (request_id) and the caller's live IANA timezone, so
//          the server request-processing spine can dedup a response-lost retry onto the
//          same durable USER turn / canonical assistant result instead of duplicating.
// CONTRACT: request_id MUST be minted ONCE per logical submission and REUSED verbatim
//           on every retry of that same submission (same message + thread). Do NOT mint
//           a fresh id on retry — that would defeat idempotency. Mint a new id only for
//           a genuinely new submission.
// CONNECTS TO: src/lib/types/foundation.ts (ConversationMessageRequest),
//              apps/api/src/routes/otzar.routes.ts (forwards request_id + client_timezone
//              to conductSession, which claims the OtzarConversationRequest).

import type { ConversationMessageRequest } from "../types/foundation";

/** The client-local IANA timezone (e.g. "America/New_York"), or undefined if the
 *  runtime can't resolve one (the server then falls back to its own resolution). */
export function clientTimezone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length > 0 ? tz : undefined;
  } catch {
    return undefined;
  }
}

/** Mint a fresh idempotency key for a NEW submission. Callers retain this across
 *  retries of the same submission (see the file contract). Uses the server-validated
 *  charset [A-Za-z0-9._:-]; crypto.randomUUID satisfies it, with a safe fallback. */
export function newRequestId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `ct-${crypto.randomUUID()}`;
    }
  } catch {
    // fall through to the non-crypto fallback
  }
  // Fallback: still charset-safe. Not cryptographically strong, but request_id only
  // needs to be unique-enough per client submission, and the server enforces the shape.
  const rand = Math.abs((Date.now() ^ (Math.random() * 1e9)) | 0).toString(36);
  return `ct-${Date.now().toString(36)}-${rand}`;
}

/** [OTZAR-CONTINUITY first-turn recovery] Mint a client-side conversation id so a CHAT
 *  thread's id is known BEFORE the first server response. If that first response is lost,
 *  the client can still reconcile by (conversation_id, client_request_id) — otherwise a
 *  first-turn loss is unrecoverable (the client never learned the server's id). The server
 *  treats a supplied-but-unknown id as create-if-missing under the caller's scope. */
export function newConversationId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  const rand = Math.abs((Date.now() ^ (Math.random() * 1e9)) | 0).toString(16).padStart(8, "0");
  return `00000000-0000-4000-8000-${Date.now().toString(16).slice(-4)}${rand}`.slice(0, 36);
}

export interface BuildConductRequestArgs {
  message: string;
  /** The server-authoritative thread id, when continuing an existing conversation. */
  conversationId?: string | null;
  /** The stable idempotency key for THIS submission (retained across retries). */
  requestId: string;
  /** Prior turn texts for L8 history (server-capped). */
  conversationHistory?: string[];
}

/** Build the ConversationMessageRequest body for one governed chat turn. The single
 *  place request_id + client_timezone are attached, so every CT surface is consistent. */
export function buildConductRequest(args: BuildConductRequestArgs): ConversationMessageRequest {
  const tz = clientTimezone();
  return {
    message: args.message,
    request_id: args.requestId,
    ...(args.conversationId != null && args.conversationId.length > 0
      ? { conversation_id: args.conversationId }
      : {}),
    ...(args.conversationHistory !== undefined
      ? { conversation_history: args.conversationHistory }
      : {}),
    ...(tz !== undefined ? { client_timezone: tz } : {}),
  };
}
