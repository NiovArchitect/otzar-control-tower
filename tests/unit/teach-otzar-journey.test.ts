// FILE: tests/unit/teach-otzar-journey.test.ts
// PURPOSE: H-01 — Teach Otzar journey contract: org policy → consent →
//          session → signals → review → approve/reject → complete.
// CONNECTS TO: src/lib/work-os/teach-otzar-journey.ts

import { describe, expect, it } from "vitest";
import {
  TEACH_BOUNDARY_COPY,
  TEACH_NEVER,
  TEACH_OTZAR_STEPS,
  afterApproveReject,
  afterSignals,
  afterStart,
  afterStop,
  canStartSession,
  initialTeachState,
  isPersonalPreferenceSummary,
  journeyProgressLabel,
} from "@/lib/work-os/teach-otzar-journey";

describe("H-01 teach Otzar journey", () => {
  it("starts org_disabled when policy off", () => {
    const s = initialTeachState(false);
    expect(s.phase).toBe("org_disabled");
    expect(canStartSession(s)).toBe(false);
    expect(journeyProgressLabel(s)).toMatch(/organization policy/i);
  });

  it("starts idle when policy on; requires consent to start", () => {
    let s = initialTeachState(true);
    expect(s.phase).toBe("idle");
    expect(canStartSession(s)).toBe(false);
    s = { ...s, consent_given: true, phase: "consenting" };
    expect(canStartSession(s)).toBe(true);
  });

  it("runs start → signals → stop → review → approve to complete", () => {
    let s = initialTeachState(true);
    s = { ...s, consent_given: true };
    s = afterStart(s, "sess-1");
    expect(s.phase).toBe("active");
    expect(s.session_id).toBe("sess-1");

    s = afterSignals(s, 4);
    expect(s.signal_count).toBe(4);

    s = afterStop(s, 2);
    expect(s.phase).toBe("review");
    expect(s.pending_candidates).toBe(2);
    expect(s.session_id).toBeNull();

    s = afterApproveReject(s, 1, 1);
    expect(s.phase).toBe("review");
    s = afterApproveReject(s, 0, 2);
    expect(s.phase).toBe("complete");
    expect(s.approved_preferences).toBe(2);
    expect(journeyProgressLabel(s)).toMatch(/2 preferences/i);
  });

  it("review with zero approved returns idle", () => {
    let s = initialTeachState(true);
    s = { ...s, consent_given: true };
    s = afterStart(s, "s");
    s = afterStop(s, 1);
    s = afterApproveReject(s, 0, 0);
    expect(s.phase).toBe("idle");
  });

  it("blocks start when org disabled even with consent", () => {
    const s = {
      ...initialTeachState(false),
      consent_given: true,
      phase: "idle" as const,
    };
    expect(canStartSession(s)).toBe(false);
    // afterStart is a no-op without org policy — never becomes active
    expect(afterStart(s, "x").phase).not.toBe("active");
    expect(afterStart(s, "x").session_id).toBeNull();
  });

  it("rejects confidential markers in personal preference summaries", () => {
    expect(isPersonalPreferenceSummary("Prefer bullets first")).toBe(true);
    expect(
      isPersonalPreferenceSummary("Contains customer secret about Acme"),
    ).toBe(false);
    expect(isPersonalPreferenceSummary("api key should never appear")).toBe(
      false,
    );
  });

  it("documents ordered steps and never-absorb boundaries", () => {
    expect(TEACH_OTZAR_STEPS.length).toBeGreaterThanOrEqual(5);
    expect(TEACH_NEVER.some((n) => /confidential/i.test(n))).toBe(true);
    expect(TEACH_BOUNDARY_COPY).toMatch(/Preference proposes/i);
    expect(TEACH_BOUNDARY_COPY).toMatch(/policy authorizes/i);
  });
});
