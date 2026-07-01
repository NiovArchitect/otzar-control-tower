// FILE: tests/unit/connector-error-copy.test.ts
// PURPOSE: PROD-UX-P0F — lock the machine-failure → admin-actionable copy
//          contract: every recognized Slack vendor code and provider error
//          class maps to a sentence naming the NEXT STEP; unknown failures
//          get an honest generic line (never a fabricated diagnosis); no
//          output ever contains backend jargon or raw enum tokens.

import { describe, expect, it } from "vitest";
import { humanizeConnectorFailure } from "@/lib/connectors/connector-error-copy";

describe("connector-error-copy — Slack vendor codes", () => {
  it("missing_scope names the exact scope and the fix", () => {
    const out = humanizeConnectorFailure({
      summary: "slack_write: missing_scope:chat:write",
    });
    expect(out).toMatch(/chat:write/);
    expect(out).toMatch(/reinstall the Slack app/i);
  });

  it("not_in_channel says to invite the bot", () => {
    expect(
      humanizeConnectorFailure({ summary: "slack_write: not_in_channel" }),
    ).toMatch(/isn't in that channel yet — invite it/i);
  });

  it("channel_not_found points at the channel id", () => {
    expect(
      humanizeConnectorFailure({ summary: "slack_write: channel_not_found" }),
    ).toMatch(/couldn't be found/i);
  });

  it("is_archived says to pick an active channel", () => {
    expect(
      humanizeConnectorFailure({ summary: "slack_write: is_archived" }),
    ).toMatch(/archived/i);
  });

  it("credential failures (invalid_auth / token_revoked / account_inactive) point at the credential", () => {
    for (const code of ["invalid_auth", "token_revoked", "account_inactive"]) {
      expect(
        humanizeConnectorFailure({ summary: `slack_write: ${code}` }),
        code,
      ).toMatch(/credential/i);
    }
  });
});

describe("connector-error-copy — provider-agnostic error classes", () => {
  it("maps each error class to an actionable sentence (bare or CONNECTOR_-prefixed)", () => {
    expect(humanizeConnectorFailure({ error_class: "CONNECTOR_AUTH" })).toMatch(/credential/i);
    expect(humanizeConnectorFailure({ error_class: "AUTH" })).toMatch(/credential/i);
    expect(humanizeConnectorFailure({ error_class: "NOT_CONFIGURED" })).toMatch(/isn't set up/i);
    expect(humanizeConnectorFailure({ error_class: "DISABLED" })).toMatch(/turned off/i);
    expect(humanizeConnectorFailure({ error_class: "NETWORK" })).toMatch(/network problem/i);
    expect(humanizeConnectorFailure({ error_class: "TIMEOUT" })).toMatch(/too long/i);
    expect(humanizeConnectorFailure({ error_class: "RATE_LIMIT" })).toMatch(/rate-limiting/i);
    expect(humanizeConnectorFailure({ error_class: "VALIDATION" })).toMatch(/invalid/i);
    expect(humanizeConnectorFailure({ error_class: "PROVIDER_ERROR" })).toMatch(/temporary/i);
  });

  it("reads an error_class embedded in the summary line", () => {
    expect(
      humanizeConnectorFailure({ summary: "failed error_class=auth after 1 attempt" }),
    ).toMatch(/credential/i);
  });

  it("unknown failure → honest generic line pointing at Advanced details, no fabricated diagnosis", () => {
    const out = humanizeConnectorFailure({ summary: "something entirely new" });
    expect(out).toMatch(/didn't pass/i);
    expect(out).toMatch(/Advanced details/i);
  });

  it("empty input degrades to the generic line — never a crash", () => {
    expect(humanizeConnectorFailure({})).toMatch(/didn't pass/i);
    expect(humanizeConnectorFailure({ summary: null, error_class: null })).toMatch(/didn't pass/i);
  });

  it("no output leaks raw jargon tokens", () => {
    const samples = [
      humanizeConnectorFailure({ summary: "slack_write: not_in_channel" }),
      humanizeConnectorFailure({ error_class: "CONNECTOR_AUTH" }),
      humanizeConnectorFailure({}),
    ];
    for (const s of samples) {
      expect(s).not.toMatch(/error_class|binding_id|env-var|CONNECTOR_|slack_write/);
    }
  });
});
