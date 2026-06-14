// FILE: thread-query.test.ts
// PURPOSE: Phase 1285 slice 1 — thread-aware answers are classified correctly
//          and composed from REAL thread records (no fabrication).
// CONNECTS TO: src/lib/work-os/thread-query.ts

import { describe, expect, it } from "vitest";
import { classifyThreadQuery, composeThreadAnswer } from "@/lib/work-os/thread-query";
import type { DirectThreadMessageView } from "@/lib/types/foundation";

function msg(over: Partial<DirectThreadMessageView>): DirectThreadMessageView {
  return {
    message_id: "m",
    sender_entity_id: "x",
    sender_display_name: "X",
    sender_role_title: null,
    body: "",
    created_at: "2026-06-14T00:00:00.000Z",
    from_me: false,
    ...over,
  };
}

describe("classifyThreadQuery", () => {
  it("RECEIVED_FROM", () => {
    expect(classifyThreadQuery("Did I receive a message from Sadeil?")).toEqual({
      type: "RECEIVED_FROM",
      person: "Sadeil",
    });
    expect(classifyThreadQuery("any messages from David")?.type).toBe("RECEIVED_FROM");
  });
  it("LATEST_FROM", () => {
    expect(classifyThreadQuery("What did David just say?")).toEqual({
      type: "LATEST_FROM",
      person: "David",
    });
    expect(classifyThreadQuery("what did Samiksha send")?.person).toBe("Samiksha");
  });
  it("LATEST_TO (checked before LATEST_FROM)", () => {
    expect(classifyThreadQuery("What did I ask David to do?")).toEqual({
      type: "LATEST_TO",
      person: "David",
    });
    expect(classifyThreadQuery("what did I tell Vishesh")?.type).toBe("LATEST_TO");
  });
  it("returns null for non-thread questions", () => {
    expect(classifyThreadQuery("what is the weather")).toBeNull();
    expect(classifyThreadQuery("open my work")).toBeNull();
  });
});

describe("composeThreadAnswer (grounded in real records)", () => {
  const thread = [
    msg({ body: "Good afternoon", from_me: false, sender_display_name: "David" }),
    msg({ body: "On it, thanks", from_me: true }),
    msg({ body: "Almost midnight here", from_me: false, sender_display_name: "David" }),
  ];
  it("RECEIVED_FROM yes → latest from them", () => {
    const a = composeThreadAnswer({ type: "RECEIVED_FROM", person: "David" }, "David Odie", thread);
    expect(a).toContain("Yes");
    expect(a).toContain("Almost midnight here");
  });
  it("RECEIVED_FROM no → honest no", () => {
    const a = composeThreadAnswer({ type: "RECEIVED_FROM", person: "David" }, "David Odie", []);
    expect(a.toLowerCase()).toContain("not received");
  });
  it("LATEST_FROM → their latest", () => {
    expect(
      composeThreadAnswer({ type: "LATEST_FROM", person: "David" }, "David Odie", thread),
    ).toContain("Almost midnight here");
  });
  it("LATEST_TO → my latest", () => {
    expect(
      composeThreadAnswer({ type: "LATEST_TO", person: "David" }, "David Odie", thread),
    ).toContain("On it, thanks");
  });
});
