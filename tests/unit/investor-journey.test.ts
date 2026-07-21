// FILE: tests/unit/investor-journey.test.ts
// PURPOSE: S-02 — investor journey honesty contract.

import { describe, expect, it } from "vitest";
import {
  INVESTOR_JOURNEY_STEPS,
  claimsStagedFrontendFake,
  hasInvestorProductSignal,
  scoreInvestorJourney,
} from "@/lib/work-os/investor-journey";

describe("S-02 investor journey", () => {
  it("documents ≥8 continuous steps", () => {
    expect(INVESTOR_JOURNEY_STEPS.length).toBeGreaterThanOrEqual(8);
  });

  it("flags staged frontend fakes", () => {
    expect(claimsStagedFrontendFake("Coming soon")).toBe(true);
    expect(claimsStagedFrontendFake("fake data for demo")).toBe(true);
    expect(claimsStagedFrontendFake("Needs me has two approvals waiting")).toBe(
      false,
    );
  });

  it("detects product signals", () => {
    expect(hasInvestorProductSignal("Today · Needs me · Talk to Otzar")).toBe(
      true,
    );
    expect(hasInvestorProductSignal("random")).toBe(false);
  });

  it("scores journey pass/fail", () => {
    const s = scoreInvestorJourney([
      { id: "a", ok: true, detail: "" },
      { id: "b", ok: true, detail: "" },
      { id: "c", ok: true, detail: "" },
      { id: "d", ok: true, detail: "" },
      { id: "e", ok: true, detail: "" },
    ]);
    expect(s.all_ok).toBe(true);
    expect(scoreInvestorJourney([{ id: "x", ok: false, detail: "nope" }]).fail).toBe(
      1,
    );
  });
});
