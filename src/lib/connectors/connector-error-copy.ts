// FILE: connector-error-copy.ts
// PURPOSE: PROD-UX-P0F — translate a connector test-invocation failure into
//          the human meaning an admin can act on. The Foundation Action
//          pipeline surfaces failures as an error_class (e.g. CONNECTOR_AUTH)
//          plus a short machine summary (e.g. "slack_write: missing_scope:
//          chat:write", "slack_write: not_in_channel"). This module is the
//          single place those machine strings become admin-readable copy —
//          "The Slack bot isn't in that channel yet — invite it and re-test."
//          Pure + deterministic; never invents an explanation it can't ground
//          in the error text.
// CONNECTS TO: src/components/ConnectorInvokeDialog.tsx (result rendering),
//              src/pages/ConnectorsAdmin.tsx (last-test line),
//              tests/unit/connector-error-copy.test.ts.

export interface ConnectorFailureInput {
  /** Foundation attempt error_class, e.g. "CONNECTOR_AUTH" (may be absent). */
  error_class?: string | null;
  /** Machine summary, e.g. "slack_write: missing_scope:chat:write". */
  summary?: string | null;
}

// WHAT: Map a connector failure (error_class + machine summary) to the human
//       meaning + the next step the admin should take.
// INPUT: whatever the Action detail / attempt view surfaced — both fields
//        optional because failed Actions can carry either or both.
// OUTPUT: a single human sentence. Falls back to an honest generic line when
//         the failure isn't one we recognize (never a fabricated diagnosis).
// WHY: P0F doctrine — admins operate tools from the UI; raw vendor error
//      codes are Advanced-details material, not the primary explanation.
export function humanizeConnectorFailure(input: ConnectorFailureInput): string {
  const summary = (input.summary ?? "").toLowerCase();
  const errorClass = (input.error_class ?? "").toUpperCase();

  // ── Slack-specific vendor codes (surfaced verbatim in the summary) ──
  if (summary.includes("missing_scope")) {
    // The provider appends the needed scope when Slack reports it:
    // "slack_write: missing_scope:chat:write".
    const m = summary.match(/missing_scope:([a-z0-9_.:-]+)/);
    const scope = m?.[1] ?? "chat:write";
    return `Missing permission: ${scope} — reinstall the Slack app with the write scope, then re-test.`;
  }
  if (summary.includes("not_in_channel")) {
    return "The Slack bot isn't in that channel yet — invite it to the channel and re-test.";
  }
  if (summary.includes("channel_not_found")) {
    return "That Slack channel couldn't be found — check the channel ID (the bot must be able to see it), then re-test.";
  }
  if (summary.includes("is_archived")) {
    return "That Slack channel is archived — pick an active channel and re-test.";
  }
  if (summary.includes("invalid_auth") || summary.includes("token_revoked") || summary.includes("account_inactive")) {
    return "Slack rejected the credential — the token may be revoked or expired. Update the credential on your deployment and re-test.";
  }

  // ── Error-class tier (provider-agnostic) ────────────────────────────
  // error_class arrives either bare ("AUTH") or prefixed ("CONNECTOR_AUTH");
  // the summary may also carry "error_class=AUTH" from the result line.
  const cls =
    errorClass.replace(/^CONNECTOR_/, "") ||
    (summary.match(/error_class=([a-z_]+)/)?.[1] ?? "").toUpperCase();

  switch (cls) {
    case "AUTH":
      return "The tool rejected the credential — check that the credential on your deployment is valid, then re-test.";
    case "NOT_CONFIGURED":
      return "The credential isn't set up on your deployment yet — ask your host to add it, then re-test.";
    case "DISABLED":
      return "This connection is turned off — enable it and re-test.";
    case "NETWORK":
      return "Couldn't reach the tool — a network problem, not a setup problem. Try again in a moment.";
    case "TIMEOUT":
      return "The tool took too long to answer — try again in a moment.";
    case "RATE_LIMIT":
      return "The tool is rate-limiting requests right now — wait a minute and re-test.";
    case "VALIDATION":
      return "The tool rejected the request as invalid — check the connection's settings (for Slack: the channel) and re-test.";
    case "PROVIDER_ERROR":
      return "The tool reported an internal error — this is usually temporary. Try again, and check the tool's status page if it persists.";
    default:
      return "The test didn't pass. Try again; if it keeps failing, open Advanced details for the technical result.";
  }
}
