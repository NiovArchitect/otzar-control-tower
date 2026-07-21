// FILE: tests/unit/synthetic-scale-harness.test.ts
// PURPOSE: R-03 — internal synthetic scale plans without external creds.

import { describe, expect, it } from "vitest";
import {
  R03_DOCTRINE,
  SYNTHETIC_CHECKLIST,
  SYNTHETIC_SCALE_LEVELS,
  planSyntheticLevel,
  progressiveSyntheticPlans,
  virtualizationAdvice,
} from "@/lib/org/synthetic-scale-harness";

describe("R-03 synthetic scale harness", () => {
  it("documents progressive levels without external credentials", () => {
    expect(R03_DOCTRINE).toMatch(/without waiting on YC|synthetic/i);
    expect(SYNTHETIC_SCALE_LEVELS.map((l) => l.people_target)).toEqual([
      25, 250, 2500,
    ]);
    for (const l of SYNTHETIC_SCALE_LEVELS) {
      expect(l.requires_external_creds).toBe(false);
    }
    expect(SYNTHETIC_CHECKLIST.length).toBeGreaterThanOrEqual(5);
  });

  it("plans S25 partial and higher planned", () => {
    expect(planSyntheticLevel("S25").status).toBe("partial");
    expect(planSyntheticLevel("S250").status).toBe("planned");
    expect(planSyntheticLevel("S2500").requires_external_creds).toBe(false);
    expect(progressiveSyntheticPlans()).toHaveLength(3);
  });

  it("advises virtualization by size", () => {
    expect(virtualizationAdvice(20).mode).toBe("full_list");
    expect(virtualizationAdvice(200).mode).toBe("windowed");
    expect(virtualizationAdvice(2000).mode).toBe("must_window");
  });
});
