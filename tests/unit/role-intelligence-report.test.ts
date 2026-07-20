// FILE: tests/unit/role-intelligence-report.test.ts
// PURPOSE: P-01 — role-specific intelligence reports differ by role;
//          every section has a real href; no fake surveillance copy.

import { describe, expect, it } from "vitest";
import {
  buildRoleIntelligenceReport,
  roleIntelFingerprint,
  type RoleIntelSignals,
} from "@/lib/today/role-intelligence-report";
import type { HomeRole } from "@/lib/today/role-home";

const SIGNALS: RoleIntelSignals = {
  needsMeCount: 2,
  projectCount: 3,
  teamOpenCount: 4,
  structureGapCount: 1,
  toolsNeedReconnect: true,
  toolsLabel: "Google needs reconnect",
  twinWorkingCount: 1,
  hasWorkingDoc: true,
  attentionCount: 2,
  blockedOrUnpaired: false,
};

const ROLES: HomeRole[] = [
  "administrator",
  "executive",
  "manager",
  "employee",
  "contractor",
];

describe("P-01 role intelligence reports", () => {
  it("every role gets a distinct title and fingerprint", () => {
    const fps = new Set<string>();
    const titles = new Set<string>();
    for (const role of ROLES) {
      const r = buildRoleIntelligenceReport(role, SIGNALS);
      expect(r.role).toBe(role);
      expect(r.title.length).toBeGreaterThan(4);
      expect(r.subtitle.length).toBeGreaterThan(10);
      expect(r.sections.length).toBeGreaterThanOrEqual(3);
      expect(r.sections.length).toBeLessThanOrEqual(4);
      fps.add(roleIntelFingerprint(r));
      titles.add(r.title);
    }
    expect(fps.size).toBe(ROLES.length);
    expect(titles.size).toBe(ROLES.length);
  });

  it("exec leads with decisions; admin with structure; contractor with scoped", () => {
    const exec = buildRoleIntelligenceReport("executive", SIGNALS);
    expect(exec.sections[0]!.id).toBe("decisions");
    expect(exec.title.toLowerCase()).toMatch(/executive/);

    const admin = buildRoleIntelligenceReport("administrator", SIGNALS);
    expect(admin.sections[0]!.id).toBe("structure");

    const contractor = buildRoleIntelligenceReport("contractor", SIGNALS);
    expect(contractor.sections[0]!.id).toBe("scoped_work");
    expect(contractor.subtitle.toLowerCase()).toMatch(/boundar|scoped/);

    const manager = buildRoleIntelligenceReport("manager", SIGNALS);
    expect(manager.sections.map((s) => s.id)).toContain("team");

    const employee = buildRoleIntelligenceReport("employee", SIGNALS);
    expect(employee.sections[0]!.title.toLowerCase()).toMatch(/needs me/);
  });

  it("every section routes to a real app path (no # or coming-soon)", () => {
    for (const role of ROLES) {
      const r = buildRoleIntelligenceReport(role, SIGNALS);
      for (const sec of r.sections) {
        expect(sec.href.startsWith("/app/") || sec.href.startsWith("/")).toBe(
          true,
        );
        expect(sec.href).not.toMatch(/coming-soon|#todo/i);
        expect(sec.why.length).toBeGreaterThan(8);
        expect(sec.signal.length).toBeGreaterThan(3);
      }
    }
  });

  it("data note denies surveillance score framing", () => {
    const r = buildRoleIntelligenceReport("employee", SIGNALS);
    expect(r.dataNote.toLowerCase()).toMatch(/live signals|not a surveillance/);
    expect(r.dataNote.toLowerCase()).not.toMatch(/productivity score/);
  });

  it("empty signals stay honest (no fake urgency)", () => {
    const empty: RoleIntelSignals = {
      needsMeCount: 0,
      projectCount: 0,
      teamOpenCount: 0,
      structureGapCount: 0,
      toolsNeedReconnect: false,
      twinWorkingCount: 0,
      hasWorkingDoc: false,
      attentionCount: 0,
      blockedOrUnpaired: false,
    };
    const r = buildRoleIntelligenceReport("employee", empty);
    const needs = r.sections.find((s) => s.id === "decisions");
    expect(needs?.signal.toLowerCase()).toMatch(/clear|nothing/);
    expect(needs?.tone).toBe("calm");
  });
});
