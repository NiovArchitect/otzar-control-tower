// FILE: walkthrough-state-contract.test.ts
// PURPOSE: Versioned keys + no silent mid-walk server resume contract.

import { describe, expect, it, beforeEach } from "vitest";
import {
  clearWalkthrough,
  firstUseStorageKey,
  getWalkthroughStepIndex,
  hasCompletedWalkthrough,
  resetWalkthroughForDemoLaunch,
  setWalkthroughStepIndex,
} from "@/lib/first-use/state";
import {
  WALKTHROUGH_VERSION,
  clampWalkthroughStep,
  walkthroughStepsFor,
} from "@/lib/first-use/walkthrough";

describe("walkthrough state contract (yc-demo-v6)", () => {
  const email = "organization_lead@demo.local";

  beforeEach(() => {
    clearWalkthrough(email);
    try {
      sessionStorage.removeItem("otzar_walkthrough_force_start");
    } catch {
      /* ignore */
    }
  });

  it("version is yc-demo-v6 and keys include version", () => {
    expect(WALKTHROUGH_VERSION).toBe("yc-demo-v6");
    expect(firstUseStorageKey(email)).toContain("yc-demo-v6");
    expect(firstUseStorageKey(email, "v5")).not.toBe(
      firstUseStorageKey(email, "yc-demo-v6"),
    );
  });

  it("demo launch reset clears step and sets force-start flag", () => {
    setWalkthroughStepIndex(email, 8);
    expect(getWalkthroughStepIndex(email)).toBe(8);
    resetWalkthroughForDemoLaunch(email);
    expect(getWalkthroughStepIndex(email)).toBe(0);
    expect(hasCompletedWalkthrough(email)).toBe(false);
    expect(sessionStorage.getItem("otzar_walkthrough_force_start")).toBe(
      WALKTHROUGH_VERSION,
    );
  });

  it("step index does not complete the walkthrough", () => {
    setWalkthroughStepIndex(email, 11);
    expect(hasCompletedWalkthrough(email)).toBe(false);
    expect(getWalkthroughStepIndex(email)).toBe(11);
  });

  it("clamps invalid indices", () => {
    const n = walkthroughStepsFor("employee").length;
    expect(clampWalkthroughStep(-1, n)).toBe(0);
    expect(clampWalkthroughStep(99, n)).toBe(n - 1);
    expect(clampWalkthroughStep(0, n)).toBe(0);
  });

  it("twelve steps never derive unique route-only identity", () => {
    const steps = walkthroughStepsFor("employee");
    const paths = steps.map((s) => s.ctaTo);
    // Multiple steps share /app and /app/my-work — route alone cannot be step.
    expect(paths.filter((p) => p === "/app").length).toBeGreaterThan(1);
    expect(new Set(steps.map((s) => s.id)).size).toBe(12);
  });
});
