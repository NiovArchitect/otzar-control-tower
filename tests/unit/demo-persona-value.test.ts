// FILE: demo-persona-value.test.ts
// PURPOSE: Eight YC demo personas - distinct value, no banned immersive words.

import { describe, expect, it } from "vitest";
import {
  DEMO_PERSONA_STORY_ORDER,
  demoPersonaValueFor,
  demoRoleBanner,
  orderPersonasForStory,
  sanitizeDemoFacingCopy,
} from "@/lib/demo/demo-persona-value";

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

const BANNED =
  /\b(fictional|fake|pretend|mock|synthetic|dummy|seeded data|test data)\b/i;

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
      expect(v.aiTeammateNow.length).toBeGreaterThan(10);
      expect(v.orgImpact.length).toBeGreaterThan(10);
      expect(v.launcherBenefit.length).toBeGreaterThan(10);
      expect(v.talkPrompt.length).toBeGreaterThan(5);
      outcomes.add(v.outcome);
      for (const field of [
        v.who,
        v.outcome,
        v.otzarHandled,
        v.needsHuman,
        v.aiTeammateNow,
        v.orgImpact,
        v.launcherBenefit,
      ]) {
        expect(field).not.toMatch(BANNED);
      }
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
    expect(q.needsHuman.toLowerCase()).toMatch(
      /never|bounds|not|never organization/,
    );
  });

  it("falls back safely for unknown keys", () => {
    const v = demoPersonaValueFor("not_a_real_persona");
    expect(v.roleLabel).toBeTruthy();
    expect(v.outcome).toBeTruthy();
    expect(v.aiTeammateNow).toBeTruthy();
  });

  it("story order puts program coordinator before regular reviewer", () => {
    expect(DEMO_PERSONA_STORY_ORDER.indexOf("program_coordinator")).toBeLessThan(
      DEMO_PERSONA_STORY_ORDER.indexOf("regular_reviewer"),
    );
    const ordered = orderPersonasForStory([
      { key: "contractor" },
      { key: "organization_lead" },
      { key: "regular_reviewer" },
      { key: "program_coordinator" },
    ]);
    expect(ordered.map((p) => p.key)).toEqual([
      "organization_lead",
      "program_coordinator",
      "regular_reviewer",
      "contractor",
    ]);
  });

  it("banner and sanitize never expose fictional", () => {
    expect(demoRoleBanner("Security lead")).not.toMatch(BANNED);
    expect(demoRoleBanner("Security lead")).toMatch(/Y Combinator Labs/);
    expect(
      sanitizeDemoFacingCopy(
        "Fictional Y Combinator Labs demo · HelioGrid is a fictional startup",
      ),
    ).not.toMatch(/fictional/i);
  });
});
