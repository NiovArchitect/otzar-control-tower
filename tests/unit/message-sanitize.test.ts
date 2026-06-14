// FILE: message-sanitize.test.ts
// PURPOSE: Phase 1284 Wave 2 — the delivered direct-message body must NOT
//          contain the command wrapper ("Tell David,") and must NOT use em
//          dashes; dates/ranges/IDs are preserved.
// CONNECTS TO: src/lib/work-os/message-sanitize.ts

import { describe, expect, it } from "vitest";
import {
  sanitizeOutboundMessage,
  stripCommandWrapper,
} from "@/lib/work-os/message-sanitize";

describe("stripCommandWrapper — command instruction is never delivered", () => {
  it("the EXACT failing phrase strips 'Tell David,' and keeps the message", () => {
    const body = stripCommandWrapper(
      "Tell David, Good Afternoon and that the 4th of July is very near.",
      "David",
    );
    expect(body).toBeDefined();
    expect(body!.toLowerCase()).not.toContain("tell david");
    expect(body!.toLowerCase()).toContain("good afternoon");
    expect(body).toContain("4th of July");
  });

  it("'Tell David I said good morning.' → 'Good morning.'", () => {
    expect(stripCommandWrapper("Tell David I said good morning.", "David")).toBe("Good morning.");
  });

  it("'Tell David that I need the build report by Friday.' drops the wrapper + 'that'", () => {
    const b = stripCommandWrapper("Tell David that I need the build report by Friday.", "David");
    expect(b!.toLowerCase()).not.toContain("tell david");
    expect(b!.toLowerCase().startsWith("i need")).toBe(true);
  });

  it("'Let David know the build passed.' → 'The build passed.'", () => {
    expect(stripCommandWrapper("Let David know the build passed.", "David")).toBe("The build passed.");
  });

  it("'Message David: can you review this?' → 'Can you review this?'", () => {
    expect(stripCommandWrapper("Message David: can you review this?", "David")).toBe(
      "Can you review this?",
    );
  });

  it("'Tell David to review the proof layer.' drops the wrapper", () => {
    const b = stripCommandWrapper("Tell David to review the proof layer.", "David");
    expect(b!.toLowerCase()).not.toContain("tell david");
    expect(b!.toLowerCase()).toContain("review the proof layer");
  });
});

describe("sanitizeOutboundMessage — natural workplace punctuation", () => {
  it("replaces a spaced em dash with a sentence break and capitalizes", () => {
    expect(sanitizeOutboundMessage("Good afternoon — the 4th of July is near.")).toBe(
      "Good afternoon. The 4th of July is near.",
    );
  });

  it("contains no em/en dash after sanitizing", () => {
    const out = sanitizeOutboundMessage("Hi there — quick note – please review.");
    expect(out).not.toMatch(/[—–]/);
  });

  it("preserves unspaced dashes in dates/ranges/IDs", () => {
    expect(sanitizeOutboundMessage("Standup is 9-5 on 2026-07-04, ticket v1-2.")).toContain("9-5");
    expect(sanitizeOutboundMessage("Standup is 9-5 on 2026-07-04, ticket v1-2.")).toContain("2026-07-04");
  });
});
