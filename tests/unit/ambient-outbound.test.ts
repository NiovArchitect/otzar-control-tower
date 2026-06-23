// FILE: ambient-outbound.test.ts
// PURPOSE: Lock the general ambient OUTBOUND interpreter/composer — recipient-
//          directed natural language becomes a COMPOSED recipient-facing message
//          (never the raw command), for any teammate/team (not David-specific).
//          Also guards the task-planner against pronoun/verb "participants".
// CONNECTS TO: src/lib/work-os/ambient-outbound.ts, src/lib/work-os/command-planner.ts

import { describe, expect, it } from "vitest";
import { interpretAmbientOutboundWork } from "@/lib/work-os/ambient-outbound";
import { planWorkCommand } from "@/lib/work-os/command-planner";

describe("interpretAmbientOutboundWork — composes recipient-facing messages", () => {
  it("Message David and ask him to validate what he received", () => {
    const p = interpretAmbientOutboundWork(
      "Message David and ask him to validate what he received.",
    );
    expect(p).not.toBeNull();
    expect(p!.kind).toBe("INTERNAL_MESSAGE");
    expect(p!.recipient).toBe("David");
    expect(p!.recipientType).toBe("PERSON");
    expect(p!.recipientFacingMessage).toBe(
      "Hey David, can you validate what you received?",
    );
    expect(p!.recipientFacingMessage).not.toContain("Message David");
  });

  it("Ask David to review this client note and prepare the next action", () => {
    const p = interpretAmbientOutboundWork(
      "Ask David to review this client note and prepare the next action.",
    );
    expect(p!.recipient).toBe("David");
    expect(p!.recipientFacingMessage).toBe(
      "Hey David, can you review this client note and prepare the next action?",
    );
  });

  it("Tell Samiksha to summarize the transcript and send me blockers", () => {
    const p = interpretAmbientOutboundWork(
      "Tell Samiksha to summarize the transcript and send me blockers.",
    );
    expect(p!.recipient).toBe("Samiksha");
    expect(p!.recipientType).toBe("PERSON");
    expect(p!.recipientFacingMessage).toBe(
      "Hey Samiksha, can you summarize the transcript and send me blockers?",
    );
    // the sender reference "me" is preserved (not turned into "you").
    expect(p!.recipientFacingMessage).toContain("send me");
  });

  it("Ask Shweta to prepare a GTM note for the investor demo", () => {
    const p = interpretAmbientOutboundWork(
      "Ask Shweta to prepare a GTM note for the investor demo.",
    );
    expect(p!.recipient).toBe("Shweta");
    expect(p!.recipientFacingMessage).toBe(
      "Hey Shweta, can you prepare a GTM note for the investor demo?",
    );
  });

  it("David, can you confirm what you received? — direct address, not tasks", () => {
    const p = interpretAmbientOutboundWork(
      "David, can you confirm what you received on your side?",
    );
    expect(p).not.toBeNull();
    expect(p!.kind).toBe("INTERNAL_MESSAGE");
    expect(p!.recipient).toBe("David");
    expect(p!.recipientFacingMessage).toBe(
      "Hey David, can you confirm what you received on your side?",
    );
  });

  it("Ask David's Twin what he thinks — routes the question to David, second person", () => {
    const p = interpretAmbientOutboundWork("Ask David's Twin what he thinks.");
    expect(p).not.toBeNull();
    expect(p!.kind).toBe("INTERNAL_MESSAGE");
    expect(p!.recipient).toBe("David");
    expect(p!.recipientFacingMessage).toBe("Hey David, what do you think?");
    expect(p!.recipientFacingMessage.toLowerCase()).not.toContain("twin");
  });

  it("Tell the product team the approval flow needs to be simplified — TEAM", () => {
    const p = interpretAmbientOutboundWork(
      "Tell the product team the approval flow needs to be simplified.",
    );
    expect(p).not.toBeNull();
    expect(p!.recipientType).toBe("TEAM");
    expect(p!.recipient.toLowerCase()).toContain("product team");
    // a clean statement, never prefixed "Hey <Name>,", never the raw command.
    expect(p!.recipientFacingMessage).not.toMatch(/^Hey /);
    expect(p!.recipientFacingMessage.toLowerCase()).toContain(
      "approval flow needs to be simplified",
    );
  });

  it("never echoes the literal command for any of the above", () => {
    for (const input of [
      "Message David and ask him to validate what he received.",
      "Ask David to review this client note and prepare the next action.",
      "Tell Samiksha to summarize the transcript and send me blockers.",
    ]) {
      const p = interpretAmbientOutboundWork(input);
      expect(p!.recipientFacingMessage).not.toBe(input);
    }
  });

  it("returns null for non-recipient-directed input (normal chat/queries)", () => {
    expect(interpretAmbientOutboundWork("what is my schedule today?")).toBeNull();
    expect(interpretAmbientOutboundWork("summarize my open work")).toBeNull();
  });

  it("never emits em or en dashes", () => {
    for (const input of [
      "Message David and ask him to validate what he received.",
      "Tell the product team the approval flow needs to be simplified.",
    ]) {
      const p = interpretAmbientOutboundWork(input);
      expect(p!.recipientFacingMessage).not.toMatch(/[—–]/);
    }
  });
});

describe("interpretAmbientOutboundWork — self-directed work routes to the self rail", () => {
  it("Remind me to validate what I received → SELF_REMINDER, first person, no Hey", () => {
    const p = interpretAmbientOutboundWork("Remind me to validate what I received.");
    expect(p).not.toBeNull();
    expect(p!.kind).toBe("SELF_REMINDER");
    expect(p!.recipientFacingMessage).not.toMatch(/^Hey /);
    expect(p!.recipientFacingMessage.toLowerCase()).toContain("what i received");
    // capitalized, self-facing, NOT "Hey David".
    expect(p!.recipientFacingMessage.charAt(0)).toBe("V");
  });

  it("Message myself and ask me to validate what I received → SELF_TASK (never Hey <Name>)", () => {
    const p = interpretAmbientOutboundWork(
      "Message myself and ask me to validate what I received.",
    );
    expect(p!.kind).toBe("SELF_TASK");
    expect(p!.recipientFacingMessage).not.toMatch(/^Hey /);
    expect(p!.recipientFacingMessage.toLowerCase()).toContain(
      "validate what i received",
    );
  });

  it("Note to self: follow up with the investor → SELF_NOTE", () => {
    const p = interpretAmbientOutboundWork("Note to self: follow up with the investor.");
    expect(p!.kind).toBe("SELF_NOTE");
    expect(p!.recipientFacingMessage.toLowerCase()).toContain(
      "follow up with the investor",
    );
  });

  it("Remember that the demo is on Friday → TWIN_MEMORY", () => {
    const p = interpretAmbientOutboundWork("Remember that the demo is on Friday.");
    expect(p!.kind).toBe("TWIN_MEMORY");
    expect(p!.recipientFacingMessage.toLowerCase()).toContain("demo is on friday");
  });

  it("ask my twin / ask Otzar → null (defers to governed chat, not a self note)", () => {
    expect(interpretAmbientOutboundWork("ask my twin why this matters")).toBeNull();
    expect(interpretAmbientOutboundWork("Ask Otzar to summarize my day")).toBeNull();
  });
});

describe("interpretAmbientOutboundWork — work asks route to the governed collaboration rail", () => {
  it("Ask David to review this client note → COLLABORATION_REQUEST / REVIEW_REQUEST", () => {
    const p = interpretAmbientOutboundWork("Ask David to review this client note.");
    expect(p!.kind).toBe("COLLABORATION_REQUEST");
    expect(p!.requestType).toBe("REVIEW_REQUEST");
    expect(p!.recipient).toBe("David");
    expect(p!.recipientFacingMessage).toBe("Hey David, can you review this client note?");
  });

  it("Ask David to approve the budget → COLLABORATION_REQUEST / APPROVAL_REQUEST", () => {
    const p = interpretAmbientOutboundWork("Ask David to approve the budget.");
    expect(p!.kind).toBe("COLLABORATION_REQUEST");
    expect(p!.requestType).toBe("APPROVAL_REQUEST");
  });

  it("Ask Shweta to prepare the GTM deck → COLLABORATION_REQUEST / FOLLOW_UP", () => {
    const p = interpretAmbientOutboundWork("Ask Shweta to prepare the GTM deck.");
    expect(p!.kind).toBe("COLLABORATION_REQUEST");
    expect(p!.requestType).toBe("FOLLOW_UP");
  });

  it("a plain validate/confirm ask stays a plain message (INTERNAL_MESSAGE)", () => {
    const p = interpretAmbientOutboundWork(
      "Message David and ask him to validate what he received.",
    );
    expect(p!.kind).toBe("INTERNAL_MESSAGE");
    expect(p!.requestType).toBeUndefined();
  });
});

describe("command-planner — never treats pronouns/verbs as participants", () => {
  it('does not produce a participant "you" or "sent" for a confirm-message', () => {
    const plan = planWorkCommand(
      "David, can you confirm what you received? I asked my Twin to ask you to review a note. The system should have sent you a message.",
    );
    const targets = plan.actions
      .map((a) => (a.target_name ?? "").toLowerCase())
      .filter((t) => t.length > 0);
    expect(targets).not.toContain("you");
    expect(targets).not.toContain("sent");
  });
});
