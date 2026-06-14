// FILE: tests/unit/voice-action-log.test.ts
// PURPOSE: Phase 1264 Addendum (Part N) — the voice-action audit log
//          records SAFE metadata only. URLs are reduced to host +
//          redacted path; query strings (which may carry tokens) are
//          dropped entirely. Internal routes keep their path but lose
//          any query.

import { describe, expect, it, beforeEach } from "vitest";
import {
  recordVoiceAction,
  redactTarget,
  getVoiceActionLog,
  clearVoiceActionLog,
} from "../../src/lib/voice/voice-action-log";

beforeEach(() => clearVoiceActionLog());

describe("redactTarget", () => {
  it("drops the query string of an external URL (token safety)", () => {
    expect(
      redactTarget("https://example.com/oauth/callback?token=SECRET&a=b"),
    ).toBe("example.com/oauth/callback");
  });

  it("keeps host with no path", () => {
    expect(redactTarget("https://niovlabs.com/")).toBe("niovlabs.com");
  });

  it("strips a query from an internal route", () => {
    expect(redactTarget("/connector-rails?provider=slack")).toBe(
      "/connector-rails",
    );
  });

  it("returns null for empty/missing targets", () => {
    expect(redactTarget(null)).toBeNull();
    expect(redactTarget("")).toBeNull();
  });
});

describe("recordVoiceAction", () => {
  it("redacts the target URL's query string (token safety)", () => {
    const entry = recordVoiceAction({
      at: "2026-06-12T00:00:00.000Z",
      transcript: "open the example callback link",
      actionType: "EXTERNAL_URL_OPEN",
      target: "https://example.com/x?token=abc",
      result: "success",
      voicePath: "premium_voice",
    });
    // The machine-actionable target is reduced to host + path; the
    // token-bearing query string is dropped.
    expect(entry.target).toBe("example.com/x");
    expect(entry.target).not.toContain("token=abc");
    expect(getVoiceActionLog()[0]?.action_type).toBe("EXTERNAL_URL_OPEN");
  });
});
