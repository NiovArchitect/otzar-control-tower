// FILE: tests/unit/pending-clarification.test.ts
// PURPOSE: [OTZAR-LIVE-6] Pin the pure working-memory helpers that resume a
//          pending ambient action from a clarification answer — the founder
//          "David and Samiksha are the recipients" slot-fill, multi-recipient
//          continuity, cancel, body composition, and the guard that a non-answer
//          (a fresh command) is NOT mistaken for recipients.
// CONNECTS TO: src/lib/work-os/pending-clarification.ts.

import { describe, it, expect } from "vitest";
import {
  parseRecipientList,
  isCancelPhrase,
  composeRequestBody,
  formatRecipientList,
  isClarificationExpired,
  detectFirstTurnRecipients,
  CLARIFICATION_TTL_MS,
  type PendingClarification,
} from "@/lib/work-os/pending-clarification";

describe("parseRecipientList — recipient slot-fill", () => {
  it("fills the exact founder answer (lowercase, trailing frame)", () => {
    expect(parseRecipientList("david and samiksha are the recipients")).toEqual([
      "David",
      "Samiksha",
    ]);
  });

  it("handles a bare two-name answer", () => {
    expect(parseRecipientList("David and Samiksha")).toEqual(["David", "Samiksha"]);
  });

  it("handles 'the recipients are X and Y'", () => {
    expect(parseRecipientList("the recipients are David and Samiksha")).toEqual([
      "David",
      "Samiksha",
    ]);
  });

  it("handles three recipients with an Oxford comma", () => {
    expect(parseRecipientList("David, Samiksha, and William")).toEqual([
      "David",
      "Samiksha",
      "William",
    ]);
  });

  it("handles a single 'for William' / 'send it to David'", () => {
    expect(parseRecipientList("for William")).toEqual(["William"]);
    expect(parseRecipientList("send it to David")).toEqual(["David"]);
  });

  it("strips a leading 'both'", () => {
    expect(parseRecipientList("both David and Samiksha")).toEqual([
      "David",
      "Samiksha",
    ]);
  });

  it("does NOT mistake a fresh command for recipients", () => {
    // The continuity layer must abandon, not fan out, on a non-answer.
    expect(parseRecipientList("remind me to call the bank tomorrow")).toEqual([]);
    expect(parseRecipientList("what is blocked right now")).toEqual([]);
    expect(parseRecipientList("send me their updates")).toEqual([]);
  });

  it("returns [] for unresolvable pronoun answers ('them both')", () => {
    expect(parseRecipientList("them both")).toEqual([]);
    expect(parseRecipientList("both of them")).toEqual([]);
  });

  it("dedupes repeated names", () => {
    expect(parseRecipientList("David and David")).toEqual(["David"]);
  });
});

describe("detectFirstTurnRecipients — recognize both on the first turn", () => {
  it("recognizes the founder's two recipients + preserves the objective", () => {
    const r = detectFirstTurnRecipients(
      "I need David and Samiksha to send me their updates",
    );
    expect(r).not.toBeNull();
    expect(r!.recipients).toEqual(["David", "Samiksha"]);
    expect(r!.body).toBe("Please send me your updates.");
  });

  it("handles lowercase + a lead verb ('ask X and Y to …')", () => {
    const r = detectFirstTurnRecipients("ask david and samiksha to review the deck");
    expect(r!.recipients).toEqual(["David", "Samiksha"]);
    expect(r!.body).toBe("Please review the deck.");
  });

  it("handles the 'from X and Y' construction", () => {
    const r = detectFirstTurnRecipients("I need updates from David and Samiksha");
    expect(r!.recipients).toEqual(["David", "Samiksha"]);
  });

  it("handles three recipients", () => {
    const r = detectFirstTurnRecipients(
      "have David, Samiksha, and William send me their status",
    );
    expect(r!.recipients).toEqual(["David", "Samiksha", "William"]);
  });

  it("returns null when there is no recipient-directed construction", () => {
    expect(detectFirstTurnRecipients("what is blocked right now")).toBeNull();
    expect(detectFirstTurnRecipients("I need to send the report")).toBeNull();
    expect(detectFirstTurnRecipients("summarize the latest meeting")).toBeNull();
  });

  it("never hardcodes specific people (works for any names)", () => {
    const r = detectFirstTurnRecipients("ask Priya and Chen to confirm the rollout");
    expect(r!.recipients).toEqual(["Priya", "Chen"]);
  });
});

describe("isCancelPhrase", () => {
  it("recognizes calm cancels", () => {
    for (const p of ["cancel", "never mind", "forget it", "stop", "don't send", "actually never mind"]) {
      expect(isCancelPhrase(p)).toBe(true);
    }
  });
  it("does not treat a recipient answer as cancel", () => {
    expect(isCancelPhrase("David and Samiksha")).toBe(false);
  });
});

describe("composeRequestBody — preserve the objective, not the verbatim command", () => {
  it("derives the founder body and shifts to second person", () => {
    expect(composeRequestBody("I need David and Samiksha to send me their updates")).toBe(
      "Please send me your updates.",
    );
  });
  it("handles a 'get X to <predicate>' phrasing", () => {
    expect(composeRequestBody("can you get William to confirm the launch date")).toBe(
      "Please confirm the launch date.",
    );
  });
  it("falls back to a safe generic when no objective is extractable", () => {
    expect(composeRequestBody("David and Samiksha")).toBe("Please send me an update.");
  });
  it("never echoes a raw em/en dash", () => {
    const body = composeRequestBody("I need David to send me the report — by Friday");
    expect(body).not.toMatch(/[—–]/);
  });
});

describe("formatRecipientList — calm outcome copy", () => {
  it("joins one / two / three names naturally", () => {
    expect(formatRecipientList(["David"])).toBe("David");
    expect(formatRecipientList(["David", "Samiksha"])).toBe("David and Samiksha");
    expect(formatRecipientList(["David", "Samiksha", "William"])).toBe(
      "David, Samiksha, and William",
    );
  });
});

describe("isClarificationExpired — short-lived working memory", () => {
  const base: PendingClarification = {
    id: "c1",
    kind: "outbound_message",
    awaiting: "recipient",
    originalText: "I need David and Samiksha to send me their updates",
    draftMessage: "Please send me your updates.",
    recipients: [],
    createdAt: 1_000_000,
  };
  it("is fresh within the TTL", () => {
    expect(isClarificationExpired(base, base.createdAt + CLARIFICATION_TTL_MS - 1)).toBe(false);
  });
  it("expires past the TTL", () => {
    expect(isClarificationExpired(base, base.createdAt + CLARIFICATION_TTL_MS + 1)).toBe(true);
  });
});
