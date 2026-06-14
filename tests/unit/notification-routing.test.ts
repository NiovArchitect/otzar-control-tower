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
