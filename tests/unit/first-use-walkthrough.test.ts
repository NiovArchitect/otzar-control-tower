// FILE: first-use-walkthrough.test.ts
// PURPOSE: Role resolution, 12-step YC acceptance walkthrough, versioned keys.

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

describe("resolveWalkthroughRole", () => {
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

describe("walkthroughStepsFor (v5 12-step acceptance)", () => {
  const roles: WalkthroughRole[] = [
    "administrator",
    "executive",
    "manager",
    "employee",
    "contractor",
  ];

  it.each(roles)("%s has exactly 12 live product steps", (role) => {
    const steps = walkthroughStepsFor(role);
    expect(steps).toHaveLength(12);
    for (const s of steps) {
      expect(
        s.ctaTo.startsWith("/app") || s.ctaTo.startsWith("/demo/"),
      ).toBe(true);
      expect(s.ctaLabel.length).toBeGreaterThan(0);
      expect(s.testId).toMatch(/^walkthrough-step-/);
      expect(s.why.length).toBeGreaterThan(0);
      expect(s.doNext.length).toBeGreaterThan(0);
      expect(s.targetContract.length).toBeGreaterThan(0);
      expect(s.body).not.toMatch(/[—–]/);
      expect(s.title).not.toMatch(/[—–]/);
      expect(s.why).not.toMatch(/[—–]/);
    }
  });

  it("starts with the communication problem on Today", () => {
    const steps = walkthroughStepsFor("employee");
    expect(steps[0]?.id).toBe("problem");
    expect(steps[0]?.ctaTo).toBe("/app");
  });

  it("includes collaboration, needs me, memory, and outcome steps", () => {
    const steps = walkthroughStepsFor("administrator");
    const ids = steps.map((s) => s.id);
    expect(ids).toEqual([
      "problem",
      "ingest",
      "understand",
      "auto_clarify",
      "ai_collab",
      "updated_work",
      "exception",
      "propagation",
      "management",
      "persona_difference",
      "memory",
      "final_outcome",
    ]);
  });
});

describe("versioned completion keys", () => {
  const email = "walkthrough-test@example.com";

  it("uses versioned localStorage key", () => {
    expect(firstUseStorageKey(email)).toBe(
      `otzar_first_use_walkthrough:${WALKTHROUGH_VERSION}:${email}`,
    );
    expect(walkthroughMarker()).toBe(
      `otzar_first_use_walkthrough:${WALKTHROUGH_VERSION}:done`,
    );
    expect(WALKTHROUGH_VERSION).toBe("v5");
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
    expect(hasCompletedWalkthrough(email)).toBe(false);
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

  it("restart clears completion so the coach can return", () => {
    clearWalkthrough(email);
    markWalkthroughComplete(email);
    expect(hasCompletedWalkthrough(email)).toBe(true);
    clearWalkthrough(email);
    expect(hasCompletedWalkthrough(email)).toBe(false);
    setWalkthroughStepIndex(email, 1, WALKTHROUGH_VERSION, {
      persistServer: false,
    });
    expect(getWalkthroughStepIndex(email)).toBe(1);
    expect(hasCompletedWalkthrough(email)).toBe(false);
  });
});
