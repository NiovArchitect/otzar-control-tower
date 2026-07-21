// FILE: first-use-walkthrough.test.ts
// PURPOSE: A-04 — role resolution, ≤3 steps, versioned storage keys, marker.

import { describe, expect, it } from "vitest";
import {
  resolveWalkthroughRole,
  walkthroughStepsFor,
  walkthroughMarker,
  WALKTHROUGH_VERSION,
  type WalkthroughRole,
} from "@/lib/first-use/walkthrough";
import {
  firstUseStorageKey,
  hasCompletedWalkthrough,
  markWalkthroughComplete,
  clearWalkthrough,
  clearFirstUse,
  getWalkthroughStepIndex,
  setWalkthroughStepIndex,
} from "@/lib/first-use/state";

describe("resolveWalkthroughRole (A-04)", () => {
  it("maps org admin to administrator", () => {
    expect(
      resolveWalkthroughRole({
        isOrgAdmin: true,
        title: "Engineer",
        orgRole: "member",
      }),
    ).toBe("administrator");
  });

  it("maps executive titles", () => {
    expect(
      resolveWalkthroughRole({
        isOrgAdmin: false,
        title: "CEO",
        orgRole: null,
      }),
    ).toBe("executive");
    expect(
      resolveWalkthroughRole({
        isOrgAdmin: false,
        title: "VP Engineering",
        orgRole: null,
      }),
    ).toBe("executive");
  });

  it("maps manager titles", () => {
    expect(
      resolveWalkthroughRole({
        isOrgAdmin: false,
        title: "Engineering Manager",
        orgRole: null,
      }),
    ).toBe("manager");
  });

  it("maps contractor titles", () => {
    expect(
      resolveWalkthroughRole({
        isOrgAdmin: false,
        title: "External Consultant",
        orgRole: "contractor",
      }),
    ).toBe("contractor");
  });

  it("defaults to employee", () => {
    expect(
      resolveWalkthroughRole({
        isOrgAdmin: false,
        title: "Software Engineer",
        orgRole: "member",
      }),
    ).toBe("employee");
  });
});

describe("walkthroughStepsFor (A-04)", () => {
  const roles: WalkthroughRole[] = [
    "administrator",
    "executive",
    "manager",
    "employee",
    "contractor",
  ];

  it.each(roles)("%s has 1–3 steps with real product paths", (role) => {
    const steps = walkthroughStepsFor(role);
    expect(steps.length).toBeGreaterThanOrEqual(1);
    expect(steps.length).toBeLessThanOrEqual(3);
    for (const s of steps) {
      expect(s.ctaTo.startsWith("/app")).toBe(true);
      expect(s.ctaLabel.length).toBeGreaterThan(0);
      expect(s.testId).toMatch(/^walkthrough-step-/);
      expect(s.why.length).toBeGreaterThan(0);
      expect(s.doNext.length).toBeGreaterThan(0);
      expect(s.targetContract.length).toBeGreaterThan(0);
      // No em dash or en dash in user-facing walkthrough copy.
      expect(s.body).not.toMatch(/[—–]/);
      expect(s.title).not.toMatch(/[—–]/);
      expect(s.why).not.toMatch(/[—–]/);
    }
  });

  it("administrator path leads with People (org structure)", () => {
    const steps = walkthroughStepsFor("administrator");
    expect(steps[0]?.ctaTo).toBe("/app/collaboration");
  });

  it("employee path leads with Needs me", () => {
    const steps = walkthroughStepsFor("employee");
    expect(steps[0]?.ctaTo).toBe("/app/action-center");
  });
});

describe("versioned completion keys (A-04)", () => {
  const email = "walkthrough-test@example.com";

  it("uses versioned localStorage key", () => {
    expect(firstUseStorageKey(email)).toBe(
      `otzar_first_use_walkthrough:${WALKTHROUGH_VERSION}:${email}`,
    );
    expect(walkthroughMarker()).toBe(
      `otzar_first_use_walkthrough:${WALKTHROUGH_VERSION}:done`,
    );
  });

  it("persists in-progress step without completing", () => {
    clearWalkthrough(email);
    expect(hasCompletedWalkthrough(email)).toBe(false);
    setWalkthroughStepIndex(email, 2, WALKTHROUGH_VERSION, {
      persistServer: false,
    });
    expect(getWalkthroughStepIndex(email)).toBe(2);
    expect(hasCompletedWalkthrough(email)).toBe(false);
    markWalkthroughComplete(email);
    expect(hasCompletedWalkthrough(email)).toBe(true);
    expect(getWalkthroughStepIndex(email)).toBe(0);
  });

  it("mark / has / clear round-trip", () => {
    clearFirstUse(email);
    clearWalkthrough(email);
    expect(hasCompletedWalkthrough(email)).toBe(false);
    markWalkthroughComplete(email);
    expect(hasCompletedWalkthrough(email)).toBe(true);
    clearWalkthrough(email);
    // Versioned key cleared — incomplete again (v2+ no longer greened by A-03 legacy alone)
    expect(hasCompletedWalkthrough(email)).toBe(false);
    // Explicit v1 still dual-writes legacy key for A-03 readers
    markWalkthroughComplete(email, "v1");
    expect(hasCompletedWalkthrough(email, "v1")).toBe(true);
    clearFirstUse(email);
    expect(hasCompletedWalkthrough(email)).toBe(false);
  });

  it("version bump uses a different key (re-show path)", () => {
    clearFirstUse(email);
    markWalkthroughComplete(email, "v1");
    expect(hasCompletedWalkthrough(email, "v1")).toBe(true);
    expect(hasCompletedWalkthrough(email, "v2")).toBe(false);
    clearFirstUse(email);
  });
});
