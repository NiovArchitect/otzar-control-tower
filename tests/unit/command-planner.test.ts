// FILE: tests/unit/command-planner.test.ts
// PURPOSE: Phase 1273 — lock the multi-intent planner against the exact
//          live-failed commands. The David follow-up must NOT be dropped;
//          the Samiksha prerequisite must be preserved; the meeting must
//          keep duration/when/work-hours/context; a single follow-up
//          promise must be detected.

import { describe, expect, it } from "vitest";
import { planWorkCommand } from "../../src/lib/work-os/command-planner";

describe("planWorkCommand — multi-intent", () => {
  const multi =
    "After Samiksha confirms, schedule a 30-minute meeting with Vishesh tomorrow during work hours about the Otzar voice runtime, and prepare a follow-up note for David.";

  it("splits into TWO linked actions (meeting + David follow-up), never dropping the second", () => {
    const plan = planWorkCommand(multi);
    expect(plan.multi_intent).toBe(true);
    expect(plan.actions.length).toBe(2);
    const meeting = plan.actions.find((a) => a.kind === "SCHEDULE_MEETING");
    const followUp = plan.actions.find((a) => a.kind === "FOLLOW_UP_NOTE");
    expect(meeting).toBeDefined();
    expect(followUp).toBeDefined();
    // The David note is present (the dropped-intent regression).
    expect(followUp?.target_name).toBe("David");
  });

  it("preserves the Samiksha prerequisite on the meeting action", () => {
    const plan = planWorkCommand(multi);
    const meeting = plan.actions.find((a) => a.kind === "SCHEDULE_MEETING");
    expect(meeting?.prerequisite?.toLowerCase()).toContain("samiksha");
  });

  it("captures duration, day, work-hours, and participant on the meeting", () => {
    const plan = planWorkCommand(multi);
    const meeting = plan.actions.find((a) => a.kind === "SCHEDULE_MEETING");
    expect(meeting?.duration_minutes).toBe(30);
    expect(meeting?.when).toBe("tomorrow");
    expect(meeting?.work_hours).toBe(true);
    expect(meeting?.target_name).toBe("Vishesh");
  });

  it("attaches the Otzar voice runtime context to the plan and both actions", () => {
    const plan = planWorkCommand(multi);
    expect(plan.context_label?.toLowerCase()).toContain("otzar voice runtime");
    for (const a of plan.actions) {
      expect(a.context_label?.toLowerCase()).toContain("otzar voice runtime");
    }
  });
});

describe("planWorkCommand — single intents", () => {
  it("plans a single scheduling command (Vishesh, tomorrow)", () => {
    const plan = planWorkCommand(
      "Schedule a 30-minute meeting with Vishesh tomorrow during work hours about the Otzar voice runtime.",
    );
    expect(plan.multi_intent).toBe(false);
    expect(plan.actions.length).toBe(1);
    expect(plan.actions[0]!.kind).toBe("SCHEDULE_MEETING");
    expect(plan.actions[0]!.target_name).toBe("Vishesh");
  });

  it("detects a follow-up promise and its target + context", () => {
    const plan = planWorkCommand(
      "I told Vishesh I would follow up after the meeting about the Otzar voice runtime.",
    );
    expect(plan.actions.length).toBe(1);
    expect(plan.actions[0]!.kind).toBe("FOLLOW_UP_NOTE");
    expect(plan.actions[0]!.target_name).toBe("Vishesh");
    expect(plan.actions[0]!.context_label?.toLowerCase()).toContain(
      "otzar voice runtime",
    );
  });

  it("classifies an unknown participant's name without inventing it", () => {
    const plan = planWorkCommand("Schedule a meeting with Alex tomorrow.");
    expect(plan.actions[0]!.kind).toBe("SCHEDULE_MEETING");
    // The planner extracts the raw name token; resolution (found/not) is
    // the authority service's job, not the planner's.
    expect(plan.actions[0]!.target_name).toBe("Alex");
  });
});
