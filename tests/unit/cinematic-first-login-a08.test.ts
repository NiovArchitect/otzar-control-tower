// FILE: tests/unit/cinematic-first-login-a08.test.ts
// PURPOSE: A-08 — every role journey has org state, AI action, provider honesty.

import { describe, expect, it } from "vitest";
import {
  A08_DOCTRINE,
  A08_ROLES,
  a08AllRolesOk,
  a08JourneyOk,
  inventoryA08Journey,
} from "@/lib/first-use/cinematic-first-login";
import {
  WALKTHROUGH_VERSION,
  walkthroughStepsFor,
} from "@/lib/first-use/walkthrough";

describe("A-08 cinematic first-login", () => {
  it("states doctrine and uses v2 walkthrough", () => {
    expect(A08_DOCTRINE).toMatch(/cinematic|role-specific|provider honesty/i);
    expect(WALKTHROUGH_VERSION).toBe("v2");
  });

  it.each([...A08_ROLES])(
    "%s journey includes org + AI + provider (≤3 steps)",
    (role) => {
      const j = inventoryA08Journey(role);
      expect(j.steps).toBeLessThanOrEqual(3);
      expect(j.has_org_state).toBe(true);
      expect(j.has_ai_action).toBe(true);
      expect(j.has_provider_honesty).toBe(true);
      expect(a08JourneyOk(j)).toBe(true);
      const steps = walkthroughStepsFor(role);
      expect(steps.some((s) => s.ctaTo.includes("voice"))).toBe(true);
      expect(steps.some((s) => s.ctaTo.includes("connector"))).toBe(true);
    },
  );

  it("all five roles pass composition gate", () => {
    const all = a08AllRolesOk();
    expect(all.failures).toEqual([]);
    expect(all.ok).toBe(true);
    expect(all.journeys).toHaveLength(5);
  });
});
