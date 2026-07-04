// FILE: tests/unit/clarity-phrases.test.ts
// PURPOSE: [CE-AMBIENT] lock the deictic clarity recognizer: the founder's
//          phrase families match; person-scoped thread queries, outbound
//          commands, and corrections do NOT — those keep their existing
//          ambient routes.
// CONNECTS TO: src/lib/work-os/clarity-phrases.ts, AmbientOtzarBar dispatch.

import { describe, expect, it } from "vitest";
import { classifyClarityPhrase } from "@/lib/work-os/clarity-phrases";

describe("[CE-AMBIENT] classifyClarityPhrase", () => {
  it("deictic phrases (this/it) classify as item questions even with nothing selected", () => {
    for (const q of [
      "Why is this here?",
      "why is it assigned",
      "Why do I have this?",
      "Where did this come from?",
      "where is this from",
      "Who can clarify this?",
      "who knows about this?",
      "what's the next step for this?",
      "Why does this need approval?",
      "What happened with my clarification?",
      "Who asked for this?",
      "Who owns this?",
    ]) {
      expect(classifyClarityPhrase(q), q).toBe("deictic");
    }
  });

  it("contextual phrases classify only as selection-dependent — bare 'what should I do next' keeps its Twin route", () => {
    for (const q of ["What should I do next?", "what's the next step?", "Who can clarify?"]) {
      expect(classifyClarityPhrase(q), q).toBe("contextual");
    }
  });

  it("does NOT match person-scoped, outbound, or correction commands", () => {
    for (const q of [
      "What did David say?",
      "Am I waiting on Samiksha?",
      "Send David a note about the launch",
      "Ask David to review the doc",
      "Correct this conversation",
      "Summarize the latest transcript",
      "Take me to the onboarding screen",
      "who owns the roadmap decisions in this org", // not deictic-item-scoped
      "",
    ]) {
      expect(classifyClarityPhrase(q), q).toBeNull();
    }
  });
});
