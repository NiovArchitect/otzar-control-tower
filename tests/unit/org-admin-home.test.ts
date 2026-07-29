// FILE: org-admin-home.test.ts
// PURPOSE: Slice 5 — admin home readiness pure projection.

import { describe, expect, it } from "vitest";
import {
  ROLE_TEMPLATES,
  RELATIONSHIP_TYPES,
  buildOrgAdminHome,
} from "@/lib/admin/org-admin-home";

describe("buildOrgAdminHome", () => {
  it("caps priorities at three and never surfaces setup fraction", () => {
    const v = buildOrgAdminHome({
      orgName: "Demo Org",
      peopleCount: 0,
      activePeopleCount: 0,
      managerLineCount: 0,
      peopleWithoutManager: 0,
      twinsReadyCount: 0,
      twinsTotalCount: 0,
      toolsConnectedCount: 0,
      toolsReadyCount: 0,
      openReviewCount: 50,
      pendingApprovals: 3,
      governanceHumanApproval: true,
      credentialBlockedCount: 2,
    });
    expect(v.priorities.length).toBeLessThanOrEqual(3);
    expect(v.hide_setup_fraction).toBe(true);
    expect(v.hide_demo_mode_badge).toBe(true);
    expect(v.status_line).toMatch(/Demo Org/);
    expect(v.working).toHaveLength(5);
  });

  it("marks org ready when hierarchy, tools, and no priorities", () => {
    const v = buildOrgAdminHome({
      orgName: "Ready Co",
      peopleCount: 10,
      activePeopleCount: 10,
      managerLineCount: 8,
      peopleWithoutManager: 0,
      twinsReadyCount: 10,
      twinsTotalCount: 10,
      toolsConnectedCount: 2,
      toolsReadyCount: 2,
      openReviewCount: 0,
      pendingApprovals: 0,
      governanceHumanApproval: true,
      credentialBlockedCount: 0,
    });
    expect(v.org_ready).toBe(true);
    expect(v.priorities).toHaveLength(0);
    expect(v.status_line).toMatch(/ready for governed work/i);
  });

  it("role templates and relationship types are product-ready", () => {
    expect(ROLE_TEMPLATES.length).toBeGreaterThanOrEqual(5);
    expect(RELATIONSHIP_TYPES.map((r) => r.id)).toEqual(
      expect.arrayContaining(["employee", "contractor", "vendor", "customer"]),
    );
  });
});
