// FILE: tests/unit/clarity-phrases.test.ts
// PURPOSE: [CE-AMBIENT] lock the deictic clarity recognizer: the founder's
//          phrase families match; person-scoped thread queries, outbound
//          commands, and corrections do NOT — those keep their existing
//          ambient routes.
// CONNECTS TO: src/lib/work-os/clarity-phrases.ts, AmbientOtzarBar dispatch.

import { describe, expect, it } from "vitest";
import {
  classifyClarityPhrase,
  isBackgroundSubjectQuestion,
} from "@/lib/work-os/clarity-phrases";

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

  // [AIX-5] background/informational questions route to the governed
  // AIX-4 retrieval via the clarity-answer route — item-scoped only.
  it("background questions about THIS item classify (deictic with this/it, contextual when bare)", () => {
    for (const q of [
      "What do we know about this?",
      "what do we know about it",
      "Any background on this?",
      "is there any context for this?",
      "What context do we have about this?",
      "Is there historical context for this?",
    ]) {
      expect(classifyClarityPhrase(q), q).toBe("deictic");
    }
    for (const q of ["What do we know?", "any background?", "what context do we have?"]) {
      expect(classifyClarityPhrase(q), q).toBe("contextual");
    }
  });

  it("background questions about OTHER subjects or action requests do NOT match the ITEM rail — zero wrong-subject answers, zero action from context", () => {
    for (const q of [
      // Named-subject background questions are NOT item questions —
      // [AIX-6] they now have their own org-scoped rail (below).
      "Any background on this customer?",
      "What do we know about Project Phoenix?",
      "any background on the Acme account",
      // Action requests never enter the retrieval-backed clarity route.
      "Send this to the customer",
      "Assign this to Sarah",
      "Approve this",
      "Create tasks from this doc",
      "Update the CRM with this",
      "Tell the client we committed to Friday",
      "Move this project to done",
    ]) {
      expect(classifyClarityPhrase(q), q).toBeNull();
    }
  });

  // [AIX-6] named-subject background questions route to the org-scoped
  // background-answer rail — deictic subjects and action requests refuse.
  it("named-subject background questions recognize; deictic subjects and action requests refuse", () => {
    for (const q of [
      "What do we know about Project Phoenix?",
      "any background on the Acme account",
      "Any background on the Q1 launch?",
      "What context do we have on the onboarding rollout?",
      "Is there historical context for the Atlas migration?",
    ]) {
      expect(isBackgroundSubjectQuestion(q), q).toBe(true);
    }
    for (const q of [
      // Deictic subjects belong to the selected-item rail.
      "What do we know about this?",
      "what do we know about it",
      "Any background on this customer?",
      // Action requests and non-background questions refuse.
      "Send this to the customer",
      "Create tasks from this doc",
      "Update the CRM with Project Phoenix",
      "What did David say?",
      "What should I do next?",
      "",
    ]) {
      expect(isBackgroundSubjectQuestion(q), q).toBe(false);
    }
  });
});
