// FILE: tests/unit/notification-body.test.ts
// PURPOSE: P0-BUG-A — the internal-note summary must always satisfy
//          Foundation's 200-char body_summary bound (the mismatch that failed
//          valid follow-ups as INVALID_FIELD), while short drafts pass
//          through unchanged and long drafts clamp on a word boundary.
import { describe, expect, it } from "vitest";
import { summarizeNotificationBody, NOTIFICATION_SUMMARY_MAX } from "@/lib/work-os/notification-body";

describe("notification-body — summarizeNotificationBody", () => {
  it("passes a short draft through unchanged (trimmed)", () => {
    expect(summarizeNotificationBody("  Follow up with Shiney on the launch.  ")).toBe(
      "Follow up with Shiney on the launch.",
    );
  });

  it("a long draft is clamped within the 200-char bound (the bug that broke Send)", () => {
    const long =
      "Shiney, please follow up with the integration team about the launch decision — " +
      "we agreed not to enable Slack or email sending until the connector approval is " +
      "finished, and you own confirming the timeline with each channel owner before Friday.";
    expect(long.length).toBeGreaterThan(NOTIFICATION_SUMMARY_MAX);
    const out = summarizeNotificationBody(long);
    expect(out.length).toBeLessThanOrEqual(NOTIFICATION_SUMMARY_MAX);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/); // trimmed before the ellipsis
  });

  it("clamps on a word boundary when a reasonable one exists (no mid-word cut)", () => {
    const out = summarizeNotificationBody("word ".repeat(60));
    expect(out.length).toBeLessThanOrEqual(NOTIFICATION_SUMMARY_MAX);
    expect(out).toMatch(/word…$/);
  });

  it("a blank draft returns empty (caller/validator refuses honestly, no empty note)", () => {
    expect(summarizeNotificationBody("   ")).toBe("");
  });

  it("a single 200+ char token with no spaces still fits the bound", () => {
    const out = summarizeNotificationBody("x".repeat(500));
    expect(out.length).toBeLessThanOrEqual(NOTIFICATION_SUMMARY_MAX);
  });
});
