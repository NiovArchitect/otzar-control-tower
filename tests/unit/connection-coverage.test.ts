// FILE: tests/unit/connection-coverage.test.ts
// PURPOSE: O-02 — org/team/user scopes, admin consent, SCIM honesty.

import { describe, expect, it } from "vitest";
import {
  adminConsentCopy,
  classifyAdminConsent,
  classifyCoverageHealth,
  classifyScimBridge,
  countScopesByLevel,
  coverageKpisFromInventory,
  isFalseScimProvisionedClaim,
  labelConnectionScope,
  normalizeConnectionScope,
  scimHonestyCopy,
  summarizeConnectionCoverage,
  type CoverageKpiInput,
} from "@/lib/connectors/connection-coverage";

const BASE_KPI = {
  capabilities_connected: 2,
  capabilities_ready: 1,
  capabilities_blocked: 0,
  oauth_verified: 1,
  oauth_ready_for_consent: 1,
  org_bindings_enabled: 3,
  pending_access_requests: 1,
} as const;

describe("O-02 connection coverage", () => {
  it("normalizes foundation scope types to org/team/user", () => {
    expect(normalizeConnectionScope("ORG")).toBe("org");
    expect(normalizeConnectionScope("TEAM")).toBe("team");
    expect(normalizeConnectionScope("EMPLOYEE")).toBe("user");
    expect(normalizeConnectionScope("PROJECT")).toBe("team");
    expect(normalizeConnectionScope("ROLE")).toBe("team");
    expect(labelConnectionScope("ORG")).toBe("Organization");
    expect(labelConnectionScope("EMPLOYEE")).toBe("User");
  });

  it("counts scopes by level", () => {
    const c = countScopesByLevel([
      { scope_type: "ORG" },
      { scope_type: "TEAM" },
      { scope_type: "EMPLOYEE" },
      { scope_type: "EMPLOYEE" },
    ]);
    expect(c).toEqual({ org: 1, team: 1, user: 2, unknown: 0 });
  });

  it("SCIM defaults to not_wired and honest copy", () => {
    expect(classifyScimBridge()).toBe("not_wired");
    expect(scimHonestyCopy("not_wired").toLowerCase()).toMatch(
      /not wired|not automatic/,
    );
    expect(isFalseScimProvisionedClaim(scimHonestyCopy("not_wired"))).toBe(
      false,
    );
    expect(
      isFalseScimProvisionedClaim("SCIM is live and groups fully synced via SCIM"),
    ).toBe(true);
    expect(
      isFalseScimProvisionedClaim("SCIM is not wired yet for this org"),
    ).toBe(false);
  });

  it("admin consent states from OAuth KPIs", () => {
    expect(
      classifyAdminConsent({
        capabilities_connected: 0,
        capabilities_ready: 0,
        capabilities_blocked: 0,
        oauth_verified: 0,
        oauth_ready_for_consent: 2,
        org_bindings_enabled: 0,
        pending_access_requests: 0,
      }),
    ).toBe("ready_for_consent");
    expect(
      classifyAdminConsent({
        capabilities_connected: 1,
        capabilities_ready: 0,
        capabilities_blocked: 0,
        oauth_verified: 1,
        oauth_ready_for_consent: 1,
        org_bindings_enabled: 1,
        pending_access_requests: 0,
      }),
    ).toBe("partial");
    expect(
      adminConsentCopy("healthy", {
        capabilities_connected: 2,
        capabilities_ready: 0,
        capabilities_blocked: 0,
        oauth_verified: 2,
        oauth_ready_for_consent: 0,
        org_bindings_enabled: 3,
        pending_access_requests: 0,
      }),
    ).toMatch(/healthy|verified/i);
  });

  it("coverage health empty → partial → healthy", () => {
    expect(
      classifyCoverageHealth({
        capabilities_connected: 0,
        capabilities_ready: 0,
        capabilities_blocked: 0,
        oauth_verified: 0,
        oauth_ready_for_consent: 0,
        org_bindings_enabled: 0,
        pending_access_requests: 0,
      }),
    ).toBe("empty");
    expect(
      classifyCoverageHealth({
        capabilities_connected: 1,
        capabilities_ready: 1,
        capabilities_blocked: 0,
        oauth_verified: 1,
        oauth_ready_for_consent: 0,
        org_bindings_enabled: 1,
        pending_access_requests: 0,
      }),
    ).toBe("partial");
    expect(
      classifyCoverageHealth({
        capabilities_connected: 2,
        capabilities_ready: 0,
        capabilities_blocked: 0,
        oauth_verified: 2,
        oauth_ready_for_consent: 0,
        org_bindings_enabled: 2,
        pending_access_requests: 0,
      }),
    ).toBe("healthy");
  });

  it("summarize includes scope breakdown and SCIM not_wired by default", () => {
    const s = summarizeConnectionCoverage({
      kpis: {
        ...BASE_KPI,
        active_employee_grants: 4,
      },
      grants: [
        { scope_type: "ORG" },
        { scope_type: "TEAM" },
        { scope_type: "EMPLOYEE" },
      ],
    });
    expect(s.scim).toBe("not_wired");
    expect(s.scopeBreakdownLabel).toMatch(/Org 3/);
    expect(s.scopeBreakdownLabel).toMatch(/Team 1/);
    expect(s.scopeBreakdownLabel).toMatch(/User 4/);
    expect(s.headline.toLowerCase()).toMatch(/partial|coverage/);
    expect(s.scimDetail.toLowerCase()).toMatch(/not wired/);
    expect(isFalseScimProvisionedClaim(s.scimDetail)).toBe(false);
  });

  describe("coverageKpisFromInventory (exactOptionalPropertyTypes)", () => {
    it("includes both optional counters when present", () => {
      const kpis = coverageKpisFromInventory({
        ...BASE_KPI,
        active_employee_grants: 5,
        people_with_open_requests: 2,
      });
      expect(kpis.active_employee_grants).toBe(5);
      expect(kpis.people_with_open_requests).toBe(2);
      expect(Object.prototype.hasOwnProperty.call(kpis, "active_employee_grants")).toBe(
        true,
      );
      expect(
        Object.prototype.hasOwnProperty.call(kpis, "people_with_open_requests"),
      ).toBe(true);
    });

    it("omits both optional counters when absent", () => {
      const kpis = coverageKpisFromInventory({ ...BASE_KPI });
      expect(Object.prototype.hasOwnProperty.call(kpis, "active_employee_grants")).toBe(
        false,
      );
      expect(
        Object.prototype.hasOwnProperty.call(kpis, "people_with_open_requests"),
      ).toBe(false);
      // Consumers treat absent as zero for rollup — not NaN
      const s = summarizeConnectionCoverage({ kpis, grants: [] });
      expect(s.userCount).toBe(0);
      expect(Number.isNaN(s.userCount)).toBe(false);
    });

    it("includes only active_employee_grants when people count absent", () => {
      const kpis = coverageKpisFromInventory({
        ...BASE_KPI,
        active_employee_grants: 3,
      });
      expect(kpis.active_employee_grants).toBe(3);
      expect(
        Object.prototype.hasOwnProperty.call(kpis, "people_with_open_requests"),
      ).toBe(false);
    });

    it("includes only people_with_open_requests when grants absent", () => {
      const kpis = coverageKpisFromInventory({
        ...BASE_KPI,
        people_with_open_requests: 1,
      });
      expect(kpis.people_with_open_requests).toBe(1);
      expect(Object.prototype.hasOwnProperty.call(kpis, "active_employee_grants")).toBe(
        false,
      );
    });

    it("preserves explicit zero (distinct from absent for property presence)", () => {
      const kpis = coverageKpisFromInventory({
        ...BASE_KPI,
        active_employee_grants: 0,
        people_with_open_requests: 0,
      });
      expect(kpis.active_employee_grants).toBe(0);
      expect(kpis.people_with_open_requests).toBe(0);
      expect(Object.prototype.hasOwnProperty.call(kpis, "active_employee_grants")).toBe(
        true,
      );
      const s = summarizeConnectionCoverage({ kpis, grants: [] });
      expect(s.userCount).toBe(0);
    });

    it("ignores present-but-undefined source fields (API partial)", () => {
      const partial = {
        ...BASE_KPI,
        active_employee_grants: undefined as number | undefined,
        people_with_open_requests: undefined as number | undefined,
      };
      const kpis: CoverageKpiInput = coverageKpisFromInventory(partial);
      expect(Object.keys(kpis).sort()).toEqual(
        [
          "capabilities_blocked",
          "capabilities_connected",
          "capabilities_ready",
          "oauth_ready_for_consent",
          "oauth_verified",
          "org_bindings_enabled",
          "pending_access_requests",
        ].sort(),
      );
    });
  });
});

