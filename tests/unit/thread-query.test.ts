// FILE: thread-query.test.ts
// PURPOSE: Phase 1285 slice 1 — thread-aware answers are classified correctly
//          and composed from REAL thread records (no fabrication).
// CONNECTS TO: src/lib/work-os/thread-query.ts

import { describe, expect, it } from "vitest";
import {
  classifyThreadQuery,
  composeThreadAnswer,
  composeWaitingOnAnswer,
  composeRelationshipAnswer,
  replyStatusNote,
} from "@/lib/work-os/thread-query";
import type {
  DirectThreadMessageView,
  RelationshipItemView,
  RelationshipWorkResponse,
} from "@/lib/types/foundation";

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

describe("[OTZAR-LIVE-6] RESPONSE_STATUS — did they respond / are they ready", () => {
  it("classifies natural response-status questions", () => {
    for (const q of [
      "Did David respond?",
      "Did David reply?",
      "Has David confirmed?",
      "Any update from David?",
      "Is David ready?",
      "What did David reply?",
      "What was David's response?",
      "Did David get the message?",
      "Did David get back to me?",
      "What's the status of David's request?",
    ]) {
      const r = classifyThreadQuery(q);
      expect(r?.type, q).toBe("RESPONSE_STATUS");
      expect(r?.person, q).toBe("David");
    }
  });

  it("does not swallow canonical thread/tracking questions (regression)", () => {
    expect(classifyThreadQuery("What did David just say?")?.type).toBe("LATEST_FROM");
    expect(classifyThreadQuery("What did I ask David to do?")?.type).toBe("LATEST_TO");
    expect(classifyThreadQuery("What am I waiting on from David?")?.type).toBe("WAITING_ON");
    expect(classifyThreadQuery("What is blocked?")).toBeNull();
    expect(classifyThreadQuery("good morning")).toBeNull();
  });

  it("composes the exact founder scenario: time + confirmed read (not 'I don't see it')", () => {
    const now = Date.parse("2026-06-14T00:04:00.000Z");
    const ans = composeThreadAnswer(
      { type: "RESPONSE_STATUS", person: "David" },
      "David Odie",
      [msg({ body: "I validate what I received and I will be ready for todays meeting happening in 1 hour.", from_me: false, created_at: "2026-06-14T00:00:00.000Z" })],
      now,
    );
    expect(ans).toMatch(/David Odie replied 4 minutes ago/);
    expect(ans).toMatch(/will be ready/);
    expect(ans).toMatch(/treat that as confirmed/i);
    expect(ans).not.toMatch(/don'?t see/i);
  });

  it("honest no-reply state when only the caller's outbound exists", () => {
    const ans = composeThreadAnswer(
      { type: "RESPONSE_STATUS", person: "David" },
      "David",
      [msg({ body: "Tell David to get ready", from_me: true })],
    );
    expect(ans).toMatch(/don'?t see a reply from David yet/i);
  });

  it("replyStatusNote reads blocked / declined / question / confirmed", () => {
    expect(replyStatusNote("I'm blocked on the API keys")).toMatch(/blocked/i);
    expect(replyStatusNote("I can't make it")).toMatch(/can'?t take it|reassign/i);
    expect(replyStatusNote("Which one?")).toMatch(/question/i);
    expect(replyStatusNote("Done, reviewed it")).toMatch(/confirmed/i);
    expect(replyStatusNote("ok")).toBe("");
  });
});

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

  it("relationship work-graph queries (Phase 1285-M)", () => {
    const cases: Array<[string, string, string]> = [
      ["what did David complete?", "COMPLETED_BY", "David"],
      ["what has David finished", "COMPLETED_BY", "David"],
      ["what blockers involve David", "BLOCKERS_WITH", "David"],
      ["what is blocking Samiksha", "BLOCKERS_WITH", "Samiksha"],
      ["what decisions did David and I make", "DECISIONS_WITH", "David"],
      ["what did David and I decide", "DECISIONS_WITH", "David"],
      ["what is David waiting on me for", "WAITING_ON_ME", "David"],
      ["what does David need from me", "WAITING_ON_ME", "David"],
      ["what tasks are overdue from David", "OVERDUE_FROM", "David"],
      ["what changed since yesterday with David", "CHANGED_SINCE", "David"],
      ["show my work with David", "RELATIONSHIP_SUMMARY", "David"],
    ];
    for (const [q, type, person] of cases) {
      const r = classifyThreadQuery(q);
      expect(r, `"${q}" should classify`).not.toBeNull();
      expect(r!.type, `"${q}"`).toBe(type);
      expect(r!.person, `"${q}"`).toBe(person);
    }
  });
});

describe("composeRelationshipAnswer (durable, never faked)", () => {
  function item(over: Partial<RelationshipItemView>): RelationshipItemView {
    return {
      ledger_entry_id: "l1",
      ledger_type: "TASK",
      title: "Send the proof-layer notes",
      status: "EXECUTED",
      requester_entity_id: "sadeil",
      owner_entity_id: "david",
      requester_display_name: "Sadeil",
      owner_display_name: "David Odie",
      due_at: null,
      updated_at: "2026-06-16T00:00:00.000Z",
      source_message_id: "m1",
      ...over,
    };
  }
  const NOW = Date.parse("2026-06-16T12:00:00.000Z");
  function rel(over: Partial<RelationshipWorkResponse>): RelationshipWorkResponse {
    return { ok: true, other_display_name: "David Odie", ...over };
  }

  it("COMPLETED_BY lists completed titles; empty → durable empty", () => {
    expect(
      composeRelationshipAnswer("COMPLETED_BY", "David Odie", rel({ completed: [item({})] }), NOW),
    ).toContain("Send the proof-layer notes");
    expect(
      composeRelationshipAnswer("COMPLETED_BY", "David Odie", rel({ completed: [] }), NOW).toLowerCase(),
    ).toContain("don't see anything");
  });

  it("BLOCKERS_WITH / DECISIONS_WITH / WAITING_ON_ME render or give honest empty", () => {
    expect(composeRelationshipAnswer("BLOCKERS_WITH", "David Odie", rel({ blockers: [] }), NOW).toLowerCase()).toContain("don't see any blockers");
    expect(composeRelationshipAnswer("DECISIONS_WITH", "David Odie", rel({ decisions: [item({ title: "Ship Friday" })] }), NOW)).toContain("Ship Friday");
    expect(composeRelationshipAnswer("WAITING_ON_ME", "David Odie", rel({ pending_from_them: [item({ title: "Approve PR" })] }), NOW)).toContain("waiting on you for");
  });

  it("OVERDUE_FROM only counts past-due items", () => {
    const overdue = item({ title: "Overdue task", due_at: "2026-06-15T00:00:00.000Z" });
    const future = item({ title: "Future task", due_at: "2026-06-20T00:00:00.000Z" });
    const a = composeRelationshipAnswer("OVERDUE_FROM", "David Odie", rel({ waiting_on_them: [overdue, future] }), NOW);
    expect(a).toContain("Overdue task");
    expect(a).not.toContain("Future task");
  });

  it("RELATIONSHIP_SUMMARY summarizes counts; fully empty → durable empty", () => {
    const a = composeRelationshipAnswer(
      "RELATIONSHIP_SUMMARY",
      "David Odie",
      rel({ waiting_on_them: [item({})], completed: [item({})], blockers: [item({})] }),
      NOW,
    );
    expect(a).toContain("Your work with David Odie");
    expect(
      composeRelationshipAnswer("RELATIONSHIP_SUMMARY", "David Odie", rel({}), NOW).toLowerCase(),
    ).toContain("don't see any tracked work");
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

describe("[OTZAR-LIVE-6] inbound message lookup — subject-sender frame", () => {
  it("routes the founder's 'did david send me anything' to RECEIVED_FROM, not an outbound draft", () => {
    const r = classifyThreadQuery("did david send me anything");
    expect(r?.type).toBe("RECEIVED_FROM");
    expect(r?.person).toBe("david");
  });

  it("covers send/message/text/ping/reach-out subject-sender phrasings", () => {
    for (const q of [
      "did David send me anything",
      "has David messaged me",
      "did David text me",
      "did David ping me yet",
      "has David reached out to me",
      "did Samiksha email me",
    ]) {
      expect(classifyThreadQuery(q)?.type, q).toBe("RECEIVED_FROM");
    }
  });

  it("covers the founder's exact awkward 'Im asking if david messaged me'", () => {
    const r = classifyThreadQuery("Im asking if david messaged me");
    expect(r?.type).toBe("RECEIVED_FROM");
    expect(r?.person).toBe("david");
  });

  it("covers 'anything new from David'", () => {
    expect(classifyThreadQuery("anything new from David")?.type).toBe("RECEIVED_FROM");
  });

  it("does NOT swallow IMPERATIVE outbound — 'send David an update' stays unclassified", () => {
    expect(classifyThreadQuery("send David an update")).toBeNull();
    expect(classifyThreadQuery("message David that the launch is delayed")).toBeNull();
    expect(
      classifyThreadQuery("I need David and Samiksha to send me their updates"),
    ).toBeNull();
  });

  it("still routes 'did David respond?' to RESPONSE_STATUS (not inbound)", () => {
    expect(classifyThreadQuery("did David respond?")?.type).toBe("RESPONSE_STATUS");
  });
});
