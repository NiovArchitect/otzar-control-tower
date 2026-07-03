// FILE: twin-authority-labels.test.ts
// PURPOSE: [GAP-G SLICE-1] The AI Teammates authority truth surface renders
//          ONLY server-stored provenance in human words: template
//          recommendation, authority status (applied/capped/adjusted/
//          default), honest "Not set yet", zero raw enum/code leakage, and
//          never a capability claim beyond the enforced autonomy level.
// CONNECTS TO: src/lib/labels/twin-authority.ts, src/pages/AITeammates.tsx.

import { describe, expect, it } from "vitest";
import {
  authorityStatusLabel,
  recommendedAutonomyLabel,
} from "@/lib/labels/twin-authority";
import type { TwinConfig } from "@/lib/types/foundation";

function config(over: Partial<TwinConfig> = {}): TwinConfig {
  return {
    twin_id: "tw-1",
    autonomy_level: "APPROVAL_REQUIRED",
    swarm_enabled: false,
    role_template: "chief-executive-officer",
    is_admin_twin: false,
    approver_entity_id: null,
    template_recommended_autonomy: "EXECUTIVE_OVERRIDE",
    autonomy_source: "org_ceiling_capped",
    updated_at: new Date().toISOString(),
    ...over,
  };
}

describe("[GAP-G] recommendedAutonomyLabel", () => {
  it("humanizes the template recommendation", () => {
    expect(recommendedAutonomyLabel(config())).toBe("Executive override");
    expect(
      recommendedAutonomyLabel(config({ template_recommended_autonomy: "APPROVAL_REQUIRED" })),
    ).toBe("Approval required");
  });
  it("missing recommendation is an honest state", () => {
    expect(recommendedAutonomyLabel(config({ template_recommended_autonomy: null }))).toBe(
      "Not set yet",
    );
    expect(recommendedAutonomyLabel(null)).toBe("Not set yet");
  });
});

describe("[GAP-G] authorityStatusLabel — provable provenance only", () => {
  it("template capped by the org ceiling reads 'Capped by org policy'", () => {
    expect(authorityStatusLabel(config())).toBe("Capped by org policy");
  });
  it("template fully applied reads 'Applied from role template'", () => {
    expect(
      authorityStatusLabel(
        config({
          autonomy_level: "EXECUTIVE_OVERRIDE",
          autonomy_source: "role_template_default",
        }),
      ),
    ).toBe("Applied from role template");
  });
  it("an admin change after template application reads 'Adjusted by admin'", () => {
    expect(
      authorityStatusLabel(
        config({
          autonomy_level: "OBSERVE_ONLY",
          template_recommended_autonomy: "APPROVAL_REQUIRED",
          autonomy_source: "role_template_default",
        }),
      ),
    ).toBe("Adjusted by admin");
  });
  it("a level RAISED above a capped recommendation is provably an admin act", () => {
    expect(
      authorityStatusLabel(
        config({
          autonomy_level: "EXECUTIVE_OVERRIDE",
          template_recommended_autonomy: "APPROVAL_REQUIRED",
          autonomy_source: "org_ceiling_capped",
        }),
      ),
    ).toBe("Adjusted by admin");
  });
  it("no template reads 'Default approval policy'", () => {
    expect(
      authorityStatusLabel(
        config({
          template_recommended_autonomy: null,
          autonomy_source: "system_default",
        }),
      ),
    ).toBe("Default approval policy");
  });
  it("admin twins read 'Admin twin' (org decision, never template authority)", () => {
    expect(
      authorityStatusLabel(
        config({
          autonomy_level: "EXECUTIVE_OVERRIDE",
          is_admin_twin: true,
          autonomy_source: "admin_twin",
        }),
      ),
    ).toBe("Admin twin");
  });
  it("older backends without provenance are an honest 'Not set yet'", () => {
    const legacy = config();
    delete (legacy as unknown as Record<string, unknown>).autonomy_source;
    delete (legacy as unknown as Record<string, unknown>).template_recommended_autonomy;
    expect(authorityStatusLabel(legacy)).toBe("Not set yet");
    expect(authorityStatusLabel(null)).toBe("Not set yet");
  });
  it("no raw enum/backend tokens ever render", () => {
    const all = [
      authorityStatusLabel(config()),
      authorityStatusLabel(config({ autonomy_source: "role_template_default" })),
      authorityStatusLabel(config({ autonomy_source: "system_default", template_recommended_autonomy: null })),
      recommendedAutonomyLabel(config()),
    ].join(" ");
    for (const banned of [
      "EXECUTIVE_OVERRIDE",
      "APPROVAL_REQUIRED",
      "org_ceiling_capped",
      "role_template_default",
      "system_default",
      "admin_twin",
      "autonomy_source",
      "autonomy_level",
    ]) {
      expect(all).not.toContain(banned);
    }
  });
  it("never claims free execution — copy stays provenance-shaped", () => {
    const all = [
      authorityStatusLabel(config({ autonomy_level: "EXECUTIVE_OVERRIDE", autonomy_source: "role_template_default" })),
    ].join(" ");
    for (const banned of ["Can approve automatically", "Can execute freely", "unlimited"]) {
      expect(all).not.toContain(banned);
    }
  });
});
