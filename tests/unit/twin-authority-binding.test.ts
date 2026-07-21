// FILE: tests/unit/twin-authority-binding.test.ts
// PURPOSE: G-02 — authority from Foundation not template; preference ≠ authority.

import { describe, expect, it } from "vitest";
import {
  AUTHORITY_FROM_FOUNDATION,
  PREFERENCE_NEQ_AUTHORITY,
  TEMPLATE_RECOMMENDS_ONLY,
  buildAuthorityBindingView,
  copyClaimsFalseAuthority,
  templateGrantsAuthority,
} from "@/lib/work-os/twin-authority-binding";

describe("G-02 twin authority binding", () => {
  it("never lets template grant authority", () => {
    expect(templateGrantsAuthority("marketing_manager")).toBe(false);
    expect(templateGrantsAuthority(null)).toBe(false);
    const v = buildAuthorityBindingView({
      role_template_label: "Marketing manager",
      skill_count: 4,
    });
    expect(v.template_grants_authority).toBe(false);
    expect(v.foundation_enforced).toBe(true);
    const tpl = v.lines.find((l) => l.kind === "role_template_skills");
    expect(tpl?.is_recommendation_only).toBe(true);
  });

  it("binds human, org, projects, policy, grants", () => {
    const v = buildAuthorityBindingView({
      owner_label: "Vishesh",
      org_name: "NIOV Labs",
      autonomy_label: "Approval required",
      active_grant_count: 2,
      active_project_count: 3,
    });
    expect(v.lines.map((l) => l.kind)).toEqual([
      "human_owner",
      "organization",
      "team_projects",
      "behavior_policy",
      "grants",
      "role_template_skills",
    ]);
    expect(v.lines.find((l) => l.kind === "human_owner")?.detail).toMatch(
      /Vishesh/,
    );
    expect(v.lines.find((l) => l.kind === "grants")?.detail).toMatch(/2 active/);
    expect(v.lines.find((l) => l.kind === "team_projects")?.detail).toMatch(
      /3 active/,
    );
  });

  it("states doctrine: foundation not template; preference ≠ authority", () => {
    expect(AUTHORITY_FROM_FOUNDATION).toMatch(/Foundation/i);
    expect(AUTHORITY_FROM_FOUNDATION).toMatch(/never.*grants extra access|role template recommends/i);
    expect(PREFERENCE_NEQ_AUTHORITY).toMatch(/never add permissions/i);
    expect(TEMPLATE_RECOMMENDS_ONLY).toMatch(/recommend/i);
  });

  it("detects false authority claims in copy", () => {
    expect(copyClaimsFalseAuthority("Role template grants authority")).toBe(
      true,
    );
    expect(copyClaimsFalseAuthority(AUTHORITY_FROM_FOUNDATION)).toBe(false);
  });
});
