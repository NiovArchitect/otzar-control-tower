// FILE: tests/unit/calendar-gate-copy.test.ts
// PURPOSE: Phase 1274/1275 — lock the gate-AWARE event-create copy.
//          Never the stale "Event creation is not enabled yet"; always
//          the exact unmet gate + the standing safety line.

import { describe, expect, it } from "vitest";
import {
  getCalendarCreateGateCopy,
  calendarCreateGenericGateCopy,
} from "../../src/lib/work-os/calendar-gate-copy";

const SAFETY = /No event created\. No invite sent\./;

describe("getCalendarCreateGateCopy", () => {
  it("never emits the stale 'Event creation is not enabled yet'", () => {
    const all = [
      getCalendarCreateGateCopy({ status: "Participant unresolved" }),
      getCalendarCreateGateCopy({ prerequisite: "Requires Samiksha confirms" }),
      getCalendarCreateGateCopy({ explicitTime: "11:00", proposedTime: "11:00 AM Pacific Time" }),
      getCalendarCreateGateCopy({}),
      calendarCreateGenericGateCopy(),
    ];
    for (const c of all) expect(c).not.toMatch(/not enabled yet/i);
  });

  it("unresolved participant → resolve first", () => {
    const c = getCalendarCreateGateCopy({ status: "Participant unresolved" });
    expect(c).toMatch(/Resolve the participant/i);
    expect(c).toMatch(SAFETY);
  });

  it("prerequisite pending → waiting for <name> confirmation (wins over time)", () => {
    const c = getCalendarCreateGateCopy({
      prerequisite: "Requires Samiksha confirms",
      explicitTime: "11:00",
      proposedTime: "11:00 AM Pacific Time",
    });
    expect(c).toMatch(/Waiting for Samiksha confirmation/i);
    expect(c).toMatch(SAFETY);
  });

  it("explicit time (no prereq) → time captured + normalization not wired", () => {
    const c = getCalendarCreateGateCopy({
      explicitTime: "11:00",
      proposedTime: "11:00 AM Pacific Time",
    });
    expect(c).toMatch(/Time captured: 11:00 AM Pacific Time/i);
    expect(c).toMatch(/datetime normalization is not wired/i);
    expect(c).toMatch(SAFETY);
  });

  it("no time, no prereq → choose a time", () => {
    const c = getCalendarCreateGateCopy({ targetLabel: "Vishesh" });
    expect(c).toMatch(/Choose a time/i);
    expect(c).toMatch(SAFETY);
  });

  it("generic fallback names the full ladder, not 'disabled'", () => {
    const c = calendarCreateGenericGateCopy();
    expect(c).toMatch(/Calendar creation is gated/i);
    expect(c).toMatch(/event-write scope/i);
    expect(c).toMatch(SAFETY);
  });
});
