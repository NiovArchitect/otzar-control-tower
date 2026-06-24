// [OTZAR-LIVE-6] Endpoint-clarity guard — vague work asks one focused question.
import { describe, it, expect } from "vitest";
import {
  detectVagueWorkIntent,
  vagueWorkQuestion,
} from "@/lib/work-os/vague-work";

describe("detectVagueWorkIntent", () => {
  it("detects owner-needing vague work", () => {
    for (const phrase of [
      "Handle this.",
      "Take care of this.",
      "Deal with this.",
      "Make sure this gets done.",
      "Make this happen.",
      "Someone should follow up.",
      "Someone should take that.",
      "Follow up on this.",
      "Push this forward.",
      "Get this done.",
      "Close the loop on this.",
    ]) {
      expect(detectVagueWorkIntent(phrase)?.ask, phrase).toBe("owner");
    }
  });

  it("detects target-needing vague work", () => {
    expect(detectVagueWorkIntent("Send this to them.")?.ask).toBe("target");
    expect(detectVagueWorkIntent("They need this.")?.ask).toBe("target");
  });

  it("returns null for clear/actionable commands (no hijack)", () => {
    for (const phrase of [
      "Summarize this transcript.",
      "Create action items from this meeting.",
      "Ask David to review this.",
      "Follow up with William about the demo.",
      "What is blocked?",
      "No, Samiksha owns that.",
      "good morning",
    ]) {
      expect(detectVagueWorkIntent(phrase), phrase).toBeNull();
    }
  });

  it("chooses the right focused question by context state", () => {
    expect(vagueWorkQuestion({ ask: "owner" }, false)).toMatch(/current context/i);
    expect(vagueWorkQuestion({ ask: "owner" }, true)).toMatch(/who should own/i);
    expect(vagueWorkQuestion({ ask: "target" }, true)).toMatch(/who should I send/i);
  });
});
