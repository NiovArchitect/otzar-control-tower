// FILE: tests/unit/role-template-skills.test.ts
// PURPOSE: G-01 — role template → skill package resolution.

import { describe, expect, it } from "vitest";
import {
  GENERAL_ROLE_SKILL_INTENTS,
  needsRoleTemplateSkills,
  normalizeRoleTemplateSlug,
  resolveSkillPackagesForRoleTemplate,
  skillIntentsForRoleTemplate,
} from "@/lib/ai-teammates/role-template-skills";
import type { SkillPackage } from "@/lib/types/foundation";

function pkg(
  id: string,
  name: string,
  category: string,
  description = "",
): SkillPackage {
  return {
    package_id: id,
    name,
    category,
    description,
    capability_flags: [],
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

const CATALOG: SkillPackage[] = [
  pkg("p1", "Sales CRM Pipeline", "sales"),
  pkg("p2", "Email Outreach Drafts", "writing"),
  pkg("p3", "Meeting Prep Briefs", "calendar"),
  pkg("p4", "Engineering Architecture Assist", "engineering"),
  pkg("p5", "Security Risk Review", "security"),
  pkg("p6", "Daily Productivity Assistant", "productivity"),
];

describe("G-01 role template skills", () => {
  it("normalizes template slugs", () => {
    expect(normalizeRoleTemplateSlug("Account_Executive")).toBe(
      "account-executive",
    );
    expect(normalizeRoleTemplateSlug(null)).toBe("");
  });

  it("account-executive maps to sales/writing/meeting intents", () => {
    const intents = skillIntentsForRoleTemplate("account-executive");
    expect(intents.some((i) => /deal|sales/i.test(i.label))).toBe(true);
    const r = resolveSkillPackagesForRoleTemplate({
      roleTemplate: "account-executive",
      catalog: CATALOG,
    });
    expect(r.toAssign.length).toBeGreaterThanOrEqual(2);
    expect(r.toAssign.map((p) => p.package_id)).toContain("p1");
  });

  it("cto maps to engineering/security packages", () => {
    const r = resolveSkillPackagesForRoleTemplate({
      roleTemplate: "cto",
      catalog: CATALOG,
    });
    const ids = r.toAssign.map((p) => p.package_id);
    expect(ids).toContain("p4");
    expect(ids).toContain("p5");
  });

  it("skips already assigned packages", () => {
    const r = resolveSkillPackagesForRoleTemplate({
      roleTemplate: "account-executive",
      catalog: CATALOG,
      alreadyAssignedPackageIds: ["p1", "p2", "p3"],
    });
    expect(r.toAssign).toEqual([]);
    expect(needsRoleTemplateSkills({
      roleTemplate: "account-executive",
      catalog: CATALOG,
      alreadyAssignedPackageIds: ["p1", "p2", "p3"],
    })).toBe(false);
  });

  it("unknown template falls back to general employee skills", () => {
    const intents = skillIntentsForRoleTemplate("totally-unknown-role-xyz");
    expect(intents).toEqual(GENERAL_ROLE_SKILL_INTENTS);
    const r = resolveSkillPackagesForRoleTemplate({
      roleTemplate: "totally-unknown-role-xyz",
      catalog: CATALOG,
    });
    expect(r.toAssign.map((p) => p.package_id)).toContain("p6");
  });

  it("needsRoleTemplateSkills true when catalog can fill gaps", () => {
    expect(
      needsRoleTemplateSkills({
        roleTemplate: "sales-manager",
        catalog: CATALOG,
        alreadyAssignedPackageIds: [],
      }),
    ).toBe(true);
  });
});
