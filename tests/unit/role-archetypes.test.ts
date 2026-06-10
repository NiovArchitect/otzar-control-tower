// FILE: tests/unit/role-archetypes.test.ts
// PURPOSE: Phase 1218 (Wave 2.1) — locks the 13-role archetype
//          registry. Covers: shape coverage (all 13 keys present
//          with non-empty fields), resolveRoleArchetype matching
//          (canonical names, display names, aliases, case
//          insensitivity, no false positives), and the closed-vocab
//          invariants (no surveillance framing on GENERAL_EMPLOYEE,
//          INVESTOR_OBSERVER restricted to read-only, every
//          archetype has at least one approval gate or explicit
//          restricted action).
// CONNECTS TO: src/lib/role-archetypes.ts.

import { describe, expect, it } from "vitest";
import {
  ROLE_ARCHETYPES,
  resolveRoleArchetype,
  type RoleKey,
} from "@/lib/role-archetypes";

describe("ROLE_ARCHETYPES — Wave 2.1 coverage (13 roles)", () => {
  const EXPECTED: ReadonlyArray<RoleKey> = [
    "CTO",
    "CMO",
    "SALES_MANAGER",
    "PR_LEAD",
    "AI_ENGINEER",
    "ML_ENGINEER",
    "RESEARCHER",
    "DATA_SCIENTIST",
    "UX_RESEARCHER",
    "SUPPORT_LEAD",
    "OPERATIONS_MANAGER",
    "GENERAL_EMPLOYEE",
    "INVESTOR_OBSERVER",
  ];

  it("registers all 13 Wave-2.1 archetypes", () => {
    expect(ROLE_ARCHETYPES).toHaveLength(13);
    const keys = ROLE_ARCHETYPES.map((a) => a.role_key).sort();
    expect(keys).toEqual([...EXPECTED].sort());
  });

  it("every archetype has non-empty display_name + description + briefing", () => {
    for (const a of ROLE_ARCHETYPES) {
      expect(a.display_name.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
      expect(a.ai_twin_briefing.length).toBeGreaterThan(0);
    }
  });

  it("every archetype has at least 5 default_dashboard_modules", () => {
    for (const a of ROLE_ARCHETYPES) {
      expect(a.default_dashboard_modules.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("every archetype has at least one approval_gate OR one restricted_action", () => {
    for (const a of ROLE_ARCHETYPES) {
      const hasGate = a.approval_gates.length > 0;
      const hasRestriction = a.restricted_actions.length > 0;
      expect(hasGate || hasRestriction).toBe(true);
    }
  });
});

describe("ROLE_ARCHETYPES — Founder constraints", () => {
  it("CTO is distinct from Engineering Manager (no Engineering Manager archetype here)", () => {
    expect(
      ROLE_ARCHETYPES.find((a) => a.display_name === "CTO"),
    ).toBeDefined();
    expect(
      ROLE_ARCHETYPES.find((a) =>
        a.display_name.toLowerCase().includes("engineering manager"),
      ),
    ).toBeUndefined();
  });

  it("CMO / Marketing Lead is distinct from Sales", () => {
    const cmo = ROLE_ARCHETYPES.find((a) => a.role_key === "CMO")!;
    const sales = ROLE_ARCHETYPES.find(
      (a) => a.role_key === "SALES_MANAGER",
    )!;
    expect(cmo.role_key).not.toBe(sales.role_key);
    expect(cmo.description.toLowerCase()).toContain("campaign");
    expect(sales.description.toLowerCase()).toContain("pipeline");
  });

  it("Sales Manager is distinct from Account Executive (no AE archetype)", () => {
    expect(
      ROLE_ARCHETYPES.find(
        (a) => a.display_name.toLowerCase() === "account executive",
      ),
    ).toBeUndefined();
  });

  it("PR Lead has legal/CEO approval gating in its approval_gates", () => {
    const pr = ROLE_ARCHETYPES.find((a) => a.role_key === "PR_LEAD")!;
    const restrictions = pr.restricted_actions.join(" ").toLowerCase();
    expect(restrictions).toMatch(/ceo.*legal|legal.*ceo/);
  });

  it("AI Engineer + ML Engineer + Researcher + Data Scientist + UX Researcher are all distinct", () => {
    const set = new Set(
      ["AI_ENGINEER", "ML_ENGINEER", "RESEARCHER", "DATA_SCIENTIST", "UX_RESEARCHER"].map(
        (k) =>
          ROLE_ARCHETYPES.find((a) => a.role_key === k)?.role_key,
      ),
    );
    expect(set.size).toBe(5);
  });

  it("Support Lead is distinct from CSM (no CSM archetype)", () => {
    expect(
      ROLE_ARCHETYPES.find((a) => a.role_key === "SUPPORT_LEAD"),
    ).toBeDefined();
    expect(
      ROLE_ARCHETYPES.find((a) =>
        a.display_name.toLowerCase().includes("customer success"),
      ),
    ).toBeUndefined();
  });

  it("Operations Manager is present", () => {
    expect(
      ROLE_ARCHETYPES.find((a) => a.role_key === "OPERATIONS_MANAGER"),
    ).toBeDefined();
  });

  it("General Employee is self-scoped and NOT surveillance-framed", () => {
    const ge = ROLE_ARCHETYPES.find(
      (a) => a.role_key === "GENERAL_EMPLOYEE",
    )!;
    const everything = JSON.stringify(ge).toLowerCase();
    expect(everything).not.toContain("manager monitoring");
    expect(everything).not.toContain("surveillance");
    expect(everything).not.toContain("activity tracking");
    expect(everything).not.toContain("productivity policing");
    expect(everything).not.toContain("employee monitoring");
    // Positive self-scoped signal.
    expect(ge.ai_twin_briefing.toLowerCase()).toMatch(
      /help you, not your manager|your AI twin/i,
    );
    expect(ge.default_dashboard_modules[0]).toBe("My workday");
  });

  it("Investor / Observer is distinct from Board Member and is read-only / purpose-bound", () => {
    const inv = ROLE_ARCHETYPES.find(
      (a) => a.role_key === "INVESTOR_OBSERVER",
    )!;
    expect(inv).toBeDefined();
    expect(
      ROLE_ARCHETYPES.find((a) =>
        a.display_name.toLowerCase().includes("board member"),
      ),
    ).toBeUndefined();
    const json = JSON.stringify(inv).toLowerCase();
    expect(json).toMatch(/read-only|read only/);
    expect(json).toMatch(/purpose-bound/);
    expect(json).toContain("audit");
    // No employee-level surveillance.
    const restricted = inv.restricted_actions.join(" ").toLowerCase();
    expect(restricted).toContain("surveillance");
    expect(restricted).toContain("operational control");
  });
});

describe("resolveRoleArchetype — matching", () => {
  it("resolves canonical role_keys (case-insensitive)", () => {
    expect(resolveRoleArchetype("CTO")?.role_key).toBe("CTO");
    expect(resolveRoleArchetype("cto")?.role_key).toBe("CTO");
    expect(resolveRoleArchetype("CMO")?.role_key).toBe("CMO");
    expect(resolveRoleArchetype("SALES_MANAGER")?.role_key).toBe(
      "SALES_MANAGER",
    );
  });

  it("resolves display_name (case-insensitive)", () => {
    expect(resolveRoleArchetype("Operations Manager")?.role_key).toBe(
      "OPERATIONS_MANAGER",
    );
    expect(resolveRoleArchetype("data scientist")?.role_key).toBe(
      "DATA_SCIENTIST",
    );
    expect(resolveRoleArchetype("Investor / Observer")?.role_key).toBe(
      "INVESTOR_OBSERVER",
    );
  });

  it("resolves the demo-team-seed titles (AI UI Engineer + AI/NLP Engineer)", () => {
    expect(resolveRoleArchetype("AI UI Engineer")?.role_key).toBe(
      "AI_ENGINEER",
    );
    expect(resolveRoleArchetype("AI/NLP Engineer")?.role_key).toBe(
      "AI_ENGINEER",
    );
  });

  it("resolves the Founder's General Employee aliases (Member / IC)", () => {
    expect(resolveRoleArchetype("Member")?.role_key).toBe(
      "GENERAL_EMPLOYEE",
    );
    expect(resolveRoleArchetype("Individual Contributor")?.role_key).toBe(
      "GENERAL_EMPLOYEE",
    );
    expect(resolveRoleArchetype("IC")?.role_key).toBe("GENERAL_EMPLOYEE");
  });

  it("returns null for null / undefined / empty / unknown roles", () => {
    expect(resolveRoleArchetype(null)).toBeNull();
    expect(resolveRoleArchetype(undefined)).toBeNull();
    expect(resolveRoleArchetype("")).toBeNull();
    expect(resolveRoleArchetype("   ")).toBeNull();
    expect(resolveRoleArchetype("Wizard of the Realm")).toBeNull();
  });

  it("does NOT collapse distinct roles together (CTO does not match Engineering Manager via Tech Lead fuzz)", () => {
    // "Tech Lead" was deliberately NOT mapped to CTO; the demo-team-
    // seed Tech Lead should resolve to null (so MyOrganization
    // falls through to the title-only display).
    expect(resolveRoleArchetype("Tech Lead")).toBeNull();
  });
});
