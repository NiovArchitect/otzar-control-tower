// FILE: tests/unit/work-os-bridges.test.ts
// PURPOSE: Phase 1266 — locks the Work-OS bridge primitives: the
//          conversation thread store (persist/scroll), notification
//          routing (real destinations, safe fallback), and target
//          resolution (real roster, no fabricated people/ids).

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  useConversationStore,
  appendConversationEntry,
} from "../../src/lib/work-os/conversation-store";
import { notificationRoute } from "../../src/lib/work-os/notification-routing";
import { matchRoster } from "../../src/lib/work-os/target-resolution";
import type { Entity } from "../../src/lib/types/foundation";

function entity(over: Partial<Entity>): Entity {
  return {
    entity_id: "e0",
    entity_type: "PERSON",
    display_name: "",
    email: null,
    status: "ACTIVE",
    clearance_level: 1,
    public_key: "",
    failed_auth_attempts: 0,
    suspended_at: null,
    created_at: "",
    updated_at: "",
    deleted_at: null,
    ...over,
  };
}

describe("conversation-store", () => {
  beforeEach(() => useConversationStore.getState().clear());
  afterEach(() => useConversationStore.getState().clear());

  it("appends and preserves prior messages in order", () => {
    appendConversationEntry({ role: "user", text: "What's connected?", at: "t1" });
    appendConversationEntry({ role: "otzar", text: "Google: Verified.", at: "t2" });
    appendConversationEntry({ role: "user", text: "Take me to connectors.", at: "t3" });
    const entries = useConversationStore.getState().entries;
    expect(entries.map((e) => e.text)).toEqual([
      "What's connected?",
      "Google: Verified.",
      "Take me to connectors.",
    ]);
    expect(entries.map((e) => e.role)).toEqual(["user", "otzar", "user"]);
  });

  it("skips empty text and supports clear", () => {
    appendConversationEntry({ role: "otzar", text: "   ", at: "t1" });
    expect(useConversationStore.getState().entries.length).toBe(0);
    appendConversationEntry({ role: "user", text: "hi", at: "t2" });
    expect(useConversationStore.getState().entries.length).toBe(1);
    useConversationStore.getState().clear();
    expect(useConversationStore.getState().entries.length).toBe(0);
  });
});

describe("notificationRoute — real destinations, safe fallback", () => {
  it("an action-linked notification → Action Center focused on the action", () => {
    expect(
      notificationRoute({ action_id: "act-123", notification_class: "ACTION_PROPOSED" }),
    ).toBe("/app/action-center?focus=act-123");
  });
  it("connector class → employee Connector Health (not admin Connector Rails)", () => {
    // Phase OTZAR-RETURN-1 — the employee chrome must never route a normal
    // employee into the admin-only Control Tower (AuthGuard → "Access Denied").
    expect(
      notificationRoute({ action_id: null, notification_class: "CONNECTOR_ISSUE" }),
    ).toBe("/app/connector-health");
  });
  it("collaboration class → Collaboration", () => {
    expect(
      notificationRoute({ action_id: null, notification_class: "COLLABORATION_REQUEST" }),
    ).toBe("/app/collaboration");
  });
  it("unknown class with no action → safe Action Center fallback (never null)", () => {
    expect(
      notificationRoute({ action_id: null, notification_class: "MYSTERY_THING" }),
    ).toBe("/app/action-center");
  });
});

describe("matchRoster — resolve real people, never invent", () => {
  const roster: Entity[] = [
    entity({ entity_id: "ent-david", display_name: "David Kim", email: "david@niovlabs.com" }),
    entity({ entity_id: "ent-sam", display_name: "Samiksha Rao", email: "samiksha@niovlabs.com" }),
    entity({ entity_id: "ent-ai", entity_type: "AI_AGENT", display_name: "Project Manager Agent" }),
  ];

  it("resolves a known human by first name", () => {
    const r = matchRoster("David", roster);
    expect(r.kind).toBe("RESOLVED_HUMAN");
    expect(r.entityId).toBe("ent-david");
  });
  it("resolves an AI agent by title", () => {
    const r = matchRoster("Project Manager Agent", roster);
    expect(r.kind).toBe("RESOLVED_AI_AGENT");
    expect(r.entityId).toBe("ent-ai");
  });
  it("returns NOT_FOUND for an unknown name (no fabrication)", () => {
    expect(matchRoster("Nobody", roster).kind).toBe("NOT_FOUND");
  });
  it("returns AMBIGUOUS when multiple match", () => {
    const dupes: Entity[] = [
      entity({ entity_id: "d1", display_name: "David Kim" }),
      entity({ entity_id: "d2", display_name: "David Stone" }),
    ];
    const r = matchRoster("David", dupes);
    expect(r.kind).toBe("AMBIGUOUS");
    expect(r.candidates?.length).toBe(2);
  });
});
