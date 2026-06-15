// FILE: thread-query.test.ts
// PURPOSE: Phase 1285 slice 1 — thread-aware answers are classified correctly
//          and composed from REAL thread records (no fabrication).
// CONNECTS TO: src/lib/work-os/thread-query.ts

import { describe, expect, it } from "vitest";
import { classifyThreadQuery, composeThreadAnswer, composeWaitingOnAnswer } from "@/lib/work-os/thread-query";
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
  it("WAITING_ON", () => {
    expect(classifyThreadQuery("What am I waiting on from David?")).toEqual({
      type: "WAITING_ON",
      person: "David",
    });
    expect(classifyThreadQuery("what does Samiksha owe me")?.type).toBe("WAITING_ON");
  });
  it("WAITING_ON — imperfect/natural human phrasing", () => {
    // The exact live-failure phrase (no "on") + the variants Sadeil may say.
    const cases: Array<[string, string]> = [
      ["what am I waiting from David", "David"],
      ["what work am I waiting from David", "David"],
      ["what work is waiting from David", "David"],
      ["what am I waiting on David for", "David"],
      ["what do I need from David", "David"],
      ["what does David owe me", "David"],
      ["what is David supposed to send me", "David"],
      ["what did I ask David for", "David"],
      ["what is pending from David", "David"],
      ["what is outstanding from David", "David"],
      ["what tasks are pending from David", "David"],
    ];
    for (const [q, person] of cases) {
      const r = classifyThreadQuery(q);
      expect(r, `"${q}" should be WAITING_ON`).not.toBeNull();
      expect(r!.type, `"${q}"`).toBe("WAITING_ON");
      expect(r!.person, `"${q}"`).toBe(person);
    }
  });
  it("'what did I ask David to do?' stays LATEST_TO (not WAITING_ON)", () => {
    // "ask X to do" is a sent-message lookup; only "ask X for" is waiting-on.
    expect(classifyThreadQuery("What did I ask David to do?")?.type).toBe("LATEST_TO");
  });
  it("returns null for non-thread questions", () => {
    expect(classifyThreadQuery("what is the weather")).toBeNull();
    expect(classifyThreadQuery("open my work")).toBeNull();
  });
});

describe("composeWaitingOnAnswer (durable, never faked)", () => {
  it("lists what you're waiting on", () => {
    const a = composeWaitingOnAnswer("David Odie", [
      { ledger_entry_id: "l1", ledger_type: "TASK", title: "Send proof-layer notes", status: "PROPOSED", due_at: null, source_message_id: "m1" },
    ]);
    expect(a).toContain("waiting on David Odie");
    expect(a).toContain("Send proof-layer notes");
  });
  it("honest empty", () => {
    expect(composeWaitingOnAnswer("David Odie", []).toLowerCase()).toContain("not waiting on anything");
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
