// FILE: notification-routing.test.ts
// PURPOSE: Phase 1284 Wave 2 — a direct internal message opens the real
//          message THREAD (/app/inbox/:id), never the generic Comms capture
//          page. Other classes keep their destinations.
// CONNECTS TO: src/lib/work-os/notification-routing.ts

import { describe, expect, it } from "vitest";
import { notificationRoute } from "@/lib/work-os/notification-routing";

describe("notificationRoute — direct messages open the thread", () => {
  it("DIRECT_MESSAGE → /app/inbox/:id (NOT Comms)", () => {
    const r = notificationRoute({
      action_id: null,
      notification_class: "DIRECT_MESSAGE",
      notification_id: "notif-123",
    });
    expect(r).toBe("/app/inbox/notif-123");
    expect(r).not.toContain("/comms");
  });

  it("a message-class notification with an id opens the thread", () => {
    expect(
      notificationRoute({ action_id: null, notification_class: "message", notification_id: "n9" }),
    ).toBe("/app/inbox/n9");
  });

  it("a linked governed Action still focuses Action Center", () => {
    expect(
      notificationRoute({ action_id: "act-1", notification_class: "approval" }),
    ).toBe("/app/action-center?focus=act-1");
  });

  it("a capture/comms draft still opens Comms", () => {
    expect(
      notificationRoute({ action_id: null, notification_class: "comms_draft" }),
    ).toBe("/app/comms");
  });

  it("falls back safely when a message has no id", () => {
    // No notification_id → cannot open a thread; safe fallback (not a crash).
    const r = notificationRoute({ action_id: null, notification_class: "DIRECT_MESSAGE" });
    expect(r.startsWith("/app/")).toBe(true);
  });
});

describe("notificationRoute — Phase 1304-A review + marketplace routing", () => {
  // Test 11 — a review notification opens Review Center, not Action Center.
  it("HIGH_SENSITIVITY_REVIEW → /review-center (NOT Action Center)", () => {
    const r = notificationRoute({
      action_id: null,
      notification_class: "HIGH_SENSITIVITY_REVIEW",
    });
    expect(r).toBe("/review-center");
    expect(r).not.toContain("action-center");
  });

  it("a review-class notification routes to Review Center even with an action_id", () => {
    // A review is a distinct governed object; it must win over the action_id
    // default so it never lands in Action Center.
    expect(
      notificationRoute({ action_id: "act-9", notification_class: "review_decision" }),
    ).toBe("/review-center");
  });

  // Test 12 — a marketplace notification opens the Marketplace shell.
  it("MARKETPLACE_LISTING → /marketplace", () => {
    expect(
      notificationRoute({ action_id: null, notification_class: "MARKETPLACE_LISTING" }),
    ).toBe("/marketplace");
  });

  it("a federation-cloud notification opens the Marketplace shell", () => {
    expect(
      notificationRoute({ action_id: null, notification_class: "federation_cloud_update" }),
    ).toBe("/marketplace");
  });

  // Test 13 — an unknown/missing-object class still resolves to a safe real
  // in-app route (never a dead page, never a throw).
  it("an unknown class falls back to a safe real route", () => {
    const r = notificationRoute({ action_id: null, notification_class: "something_unmapped" });
    expect(r.startsWith("/app/")).toBe(true);
  });

  // Regression: a plain approval action is unaffected by the new mappings.
  it("a plain approval action still focuses Action Center (unchanged)", () => {
    expect(
      notificationRoute({ action_id: "act-1", notification_class: "approval" }),
    ).toBe("/app/action-center?focus=act-1");
  });
});
