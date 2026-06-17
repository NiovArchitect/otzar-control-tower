// FILE: tests/unit/ask-twin.test.ts
// PURPOSE: Phase 1285-R — lock the deterministic Ask-your-Twin classifier.
//          Known Work OS questions route to their durable surfaces (never the
//          LLM); questions aimed at another person's Twin are disabled-honest;
//          genuine self questions are SELF_ASK (governed backend). No LLM is
//          consulted here.
// CONNECTS TO: src/lib/work-os/ask-twin.ts.

import { describe, expect, it } from "vitest";
import { classifyAskTwin } from "@/lib/work-os/ask-twin";

describe("classifyAskTwin — Work OS questions route deterministically", () => {
  it("routes blind-spot / risk / overdue / stale / follow-up to /app/blind-spots", () => {
    for (const q of [
      "what are my blind spots?",
      "what is overdue?",
      "what is at risk?",
      "what is stale?",
      "what should I follow up on?",
      "what is blocked?",
    ]) {
      const r = classifyAskTwin(q);
      expect(r.kind).toBe("WORK_OS_ROUTE");
      if (r.kind === "WORK_OS_ROUTE") expect(r.route).toBe("/app/blind-spots");
    }
  });

  it("routes my-work questions to /app/my-work", () => {
    const r = classifyAskTwin("what do I owe?");
    expect(r.kind).toBe("WORK_OS_ROUTE");
    if (r.kind === "WORK_OS_ROUTE") expect(r.route).toBe("/app/my-work");
  });

  it("routes team-work questions to /app/team-work", () => {
    const r = classifyAskTwin("who is waiting on whom?");
    expect(r.kind).toBe("WORK_OS_ROUTE");
    if (r.kind === "WORK_OS_ROUTE") expect(r.route).toBe("/app/team-work");
  });
});

describe("classifyAskTwin — another person's Twin is disabled-honest", () => {
  it("classifies 'ask David's twin' as OTHER_TWIN with the named target", () => {
    const r = classifyAskTwin("ask David's twin what he thinks");
    expect(r.kind).toBe("OTHER_TWIN");
    if (r.kind === "OTHER_TWIN") expect(r.target).toBe("David");
  });

  it("classifies 'ask Samiksha to review' as OTHER_TWIN", () => {
    const r = classifyAskTwin("ask Samiksha to review the trial notes");
    expect(r.kind).toBe("OTHER_TWIN");
  });

  it("classifies 'ask their twin' as OTHER_TWIN (no name)", () => {
    const r = classifyAskTwin("ask their twin for an update");
    expect(r.kind).toBe("OTHER_TWIN");
    if (r.kind === "OTHER_TWIN") expect(r.target).toBe(null);
  });
});

describe("classifyAskTwin — genuine self questions are SELF_ASK", () => {
  it("treats a plain self question as SELF_ASK", () => {
    expect(classifyAskTwin("what should I focus on today?").kind).toBe("SELF_ASK");
  });

  it("treats 'ask my twin ...' as SELF_ASK (not other-twin)", () => {
    expect(classifyAskTwin("ask my twin to summarize my open work").kind).toBe("SELF_ASK");
  });

  it("a question that merely MENTIONS a teammate is still SELF_ASK (not impersonation)", () => {
    // Answered over the caller's OWN context; not asking David's twin.
    expect(classifyAskTwin("what is the status of my review for David?").kind).toBe("SELF_ASK");
  });
});
