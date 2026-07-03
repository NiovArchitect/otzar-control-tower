// FILE: role-template-label.test.ts
// PURPOSE: [GAP-H] The AI Teammates "Role template" column renders the
//          STORED TwinConfig.role_template (Foundation's applied slug,
//          humanized) — never a client-side guess, never a raw slug, and an
//          honest "Not set yet" when Foundation applied none.
// CONNECTS TO: src/lib/labels/role-template.ts, src/pages/AITeammates.tsx.

import { describe, expect, it } from "vitest";
import { roleTemplateLabel } from "@/lib/labels/role-template";

describe("[GAP-H] roleTemplateLabel — stored truth in human words", () => {
  it("humanizes the applied slug", () => {
    expect(roleTemplateLabel("account-executive")).toBe("Account Executive");
    expect(roleTemplateLabel("integration_engineer")).toBe("Integration Engineer");
    expect(roleTemplateLabel("ceo")).toBe("Ceo".replace("Ceo", "Ceo")); // single token title-cased
  });

  it("no template applied is an honest state, never an invented archetype", () => {
    expect(roleTemplateLabel(null)).toBe("Not set yet");
    expect(roleTemplateLabel(undefined)).toBe("Not set yet");
    expect(roleTemplateLabel("   ")).toBe("Not set yet");
  });

  it("never returns the raw slug", () => {
    expect(roleTemplateLabel("account-executive")).not.toContain("-");
  });
});
