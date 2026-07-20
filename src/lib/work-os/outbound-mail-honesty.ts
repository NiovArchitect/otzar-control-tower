// FILE: outbound-mail-honesty.ts
// PURPOSE: N-05 — Gmail/external mail honesty matrix: local draft vs
//          provider-accepted vs delivered. Never claim "sent" or
//          "delivered" when the message is only a draft or the send
//          bridge is not wired. Pure + deterministic for deep smoke.
// CONNECTS TO: AmbientOtzarBar executeMessageAction, WorkArtifactCard,
//          FOUNDER N-05.

/** Lifecycle of an outbound email (Gmail) or external mail-like channel. */
export type OutboundMailLifecycle =
  | "local_draft"
  | "not_wired"
  | "provider_rejected"
  | "provider_accepted"
  | "delivered";

export interface OutboundMailSignals {
  /** slack | email | gmail | internal | … */
  channel: string;
  /** True when CT has a live Gmail/email send bridge for this channel. */
  sendBridgeWired: boolean;
  /** Provider accepted the API call (e.g. 202 / message id returned). */
  providerAccepted?: boolean | null;
  /** End-to-end delivery confirmed (rarely known for email). */
  delivered?: boolean | null;
  /** User confirmed a local draft without a send attempt. */
  localDraftConfirmed?: boolean;
}

export function isExternalMailChannel(channel: string | undefined): boolean {
  if (channel === undefined) return false;
  const c = channel.toLowerCase();
  return c === "email" || c === "gmail" || c === "mail";
}

/**
 * Classify honesty state. Order matters: delivery > accepted > rejected >
 * not_wired > local_draft.
 */
export function classifyOutboundMailState(
  s: OutboundMailSignals,
): OutboundMailLifecycle {
  if (!isExternalMailChannel(s.channel) && s.channel !== "slack") {
    // Non-mail channels are out of scope; treat as draft for safety.
    return "local_draft";
  }
  if (s.delivered === true) return "delivered";
  if (s.providerAccepted === true) return "provider_accepted";
  if (s.providerAccepted === false) return "provider_rejected";
  if (!s.sendBridgeWired) return "not_wired";
  return "local_draft";
}

/** Short status badge for cards. */
export function outboundMailStatusLabel(state: OutboundMailLifecycle): string {
  switch (state) {
    case "local_draft":
      return "Local draft — not sent";
    case "not_wired":
      return "Local draft — external send not wired";
    case "provider_rejected":
      return "Provider rejected — not delivered";
    case "provider_accepted":
      return "Provider accepted — delivery not confirmed";
    case "delivered":
      return "Delivered";
  }
}

/** Calm runtime note — always ends with what is NOT true when incomplete. */
export function outboundMailRuntimeNote(state: OutboundMailLifecycle): string {
  switch (state) {
    case "local_draft":
      return "This is a local draft only. Nothing was sent to Gmail or the recipient.";
    case "not_wired":
      return (
        "External email (Gmail) send is not wired yet. This stays a local draft " +
        "until that bridge lands — it is never auto-sent and never claimed delivered."
      );
    case "provider_rejected":
      return (
        "The email provider did not accept the message. Nothing was delivered. " +
        "Keep or edit the draft; do not assume the recipient received it."
      );
    case "provider_accepted":
      return (
        "The provider accepted the message (accepted ≠ delivered). Delivery " +
        "confirmation is not available — do not treat this as proof the recipient read it."
      );
    case "delivered":
      return "Delivery was confirmed. Proof is recorded in the governed trail.";
  }
}

/** Spoken / outcome line after drafting external email. */
export function outboundMailOutcomeCopy(state: OutboundMailLifecycle): string {
  switch (state) {
    case "local_draft":
    case "not_wired":
      return "Draft created. External email is not sent. Nothing was delivered.";
    case "provider_rejected":
      return "The email provider rejected the message. Nothing was delivered.";
    case "provider_accepted":
      return "Provider accepted the message. Delivery is not confirmed.";
    case "delivered":
      return "Email delivered (confirmed).";
  }
}

/**
 * Detect false completion claims for a given lifecycle.
 * "No invite sent" / "not sent" / "not delivered" are honest, not false.
 */
export function claimsFalseMailCompletion(
  text: string,
  state: OutboundMailLifecycle,
): boolean {
  const t = text.toLowerCase();
  // Honest denials
  if (
    /\b(not sent|never (auto-)?sent|nothing (was )?(sent|delivered)|not delivered|stays a local draft|provider (did )?not accept|rejected)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  const claimsSent = /\b(sent|emailed|mail sent|message sent)\b/i.test(t);
  const claimsDelivered = /\b(delivered|recipient received|inbox delivery)\b/i.test(
    t,
  );
  if (state === "delivered") return false;
  if (state === "provider_accepted") {
    // Accepted may say "accepted" but not "delivered"
    return claimsDelivered;
  }
  // draft / not_wired / rejected: neither sent nor delivered claims
  return claimsSent || claimsDelivered;
}

/** Channels that currently have no CT→Gmail send bridge (N-05 honest residual). */
export function isMailSendBridgeWired(channel: string): boolean {
  // Gmail write is not live in CT (read-only gmail.messages.list). Slack has
  // a separate write path; treat email/gmail as not wired.
  const c = channel.toLowerCase();
  if (c === "email" || c === "gmail" || c === "mail") return false;
  return false;
}
