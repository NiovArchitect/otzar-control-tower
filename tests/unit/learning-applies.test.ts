// FILE: tests/unit/learning-applies.test.ts
// PURPOSE: H-03 — approved applies later; rejected never applies.

import { describe, expect, it } from "vitest";
import {
  LEARNING_APPLIES_DOCTRINE,
  LATER_WORK_SURFACES,
  REJECTED_NEVER_APPLIES,
  approvedAppliesToLaterWork,
  normalizePreferenceText,
  rejectedNeverInApproved,
  sessionOutcomeSummary,
} from "@/lib/work-os/learning-applies";

describe("H-03 learning applies", () => {
  it("normalizes preference text for fingerprint compare", () => {
    expect(normalizePreferenceText("[portable] Prefer bullets first")).toBe(
      "prefer bullets first",
    );
  });

  it("rejected fingerprints never appear in approved set", () => {
    expect(
      rejectedNeverInApproved(
        ["Always lead with decision and impact for project briefs"],
        ["Use numbered steps in weekly status notes"],
      ),
    ).toBe(true);
    expect(
      rejectedNeverInApproved(
        ["Always lead with decision and impact for project briefs"],
        ["Always lead with decision and impact for project briefs"],
      ),
    ).toBe(false);
  });

  it("approved ids must all appear on later-work surfaces", () => {
    expect(approvedAppliesToLaterWork(["a", "b"], ["a", "b", "c"])).toBe(true);
    expect(approvedAppliesToLaterWork(["a", "b"], ["a"])).toBe(false);
  });

  it("session summary distinguishes approve vs reject", () => {
    expect(
      sessionOutcomeSummary({
        approved_count: 2,
        rejected_count: 1,
        pending_count: 0,
      }),
    ).toMatch(/2 approved.*1 rejected/i);
    expect(
      sessionOutcomeSummary({
        approved_count: 0,
        rejected_count: 0,
        pending_count: 0,
      }),
    ).toMatch(/No candidates/i);
  });

  it("doctrine and later-work surfaces are documented", () => {
    expect(LEARNING_APPLIES_DOCTRINE).toMatch(/approve/i);
    expect(REJECTED_NEVER_APPLIES).toMatch(/never apply/i);
    expect(LATER_WORK_SURFACES.length).toBeGreaterThanOrEqual(3);
    expect(LATER_WORK_SURFACES.some((s) => s.id === "portable_core")).toBe(
      true,
    );
  });
});
