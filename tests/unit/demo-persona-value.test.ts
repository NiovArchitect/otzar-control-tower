// FILE: demo-persona-value.test.ts
// PURPOSE: Eight YC demo personas have distinct above-the-fold value copy.

import { describe, expect, it } from "vitest";
import { demoPersonaValueFor } from "@/lib/demo/demo-persona-value";

const KEYS = [
  "organization_lead",
  "application_review_lead",
  "technical_diligence_lead",
  "security_lead",
  "market_review_lead",
  "regular_reviewer",
  "program_coordinator",
  "contractor",
] as const;

describe("demoPersonaValueFor", () => {
  it("covers all eight demo personas with unique outcomes", () => {
    const outcomes = new Set<string>();
    for (const key of KEYS) {
      const v = demoPersonaValueFor(key);
      expect(v.key).toBe(key);
      expect(v.roleLabel.length).toBeGreaterThan(3);
      expect(v.who.length).toBeGreaterThan(10);
      expect(v.outcome.length).toBeGreaterThan(10);
      expect(v.otzarHandled.length).toBeGreaterThan(10);
      expect(v.needsHuman.length).toBeGreaterThan(10);
      expect(v.orgImpact.length).toBeGreaterThan(10);
      expect(v.talkPrompt.length).toBeGreaterThan(5);
      outcomes.add(v.outcome);
    }
    expect(outcomes.size).toBe(KEYS.length);
  });

  it("Casey security is not org-selection authority", () => {
    const casey = demoPersonaValueFor("security_lead");
    expect(casey.needsHuman.toLowerCase()).toMatch(
      /do not approve|not.*selection|controls/,
    );
    expect(casey.outcome.toLowerCase()).toMatch(
      /security|encryption|checklist|gate/,
    );
  });

  it("Quinn contractor is bounded", () => {
    const q = demoPersonaValueFor("contractor");
    expect(q.who.toLowerCase()).toMatch(/bounded|limited|contractor/);
    expect(q.needsHuman.toLowerCase()).toMatch(/never|bounds|not|never organization/);
  });

  it("falls back safely for unknown keys", () => {
    const v = demoPersonaValueFor("not_a_real_persona");
    expect(v.roleLabel).toBeTruthy();
    expect(v.outcome).toBeTruthy();
  });
});
