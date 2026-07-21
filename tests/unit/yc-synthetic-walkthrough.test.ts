// FILE: tests/unit/yc-synthetic-walkthrough.test.ts
// PURPOSE: S-01 — YC multi-role continuous walkthrough contract.

import { describe, expect, it } from "vitest";
import {
  S01_DEDICATED_ORG_RESIDUAL,
  S01_DOCTRINE,
  YC_ROLE_PERSONAS,
  YC_SURVIVAL_PATHS,
  claimsStagedFrontendFake,
  isErrorWall,
  multiRoleCoverage,
  pathSurvives,
  scoreRoleWalkthrough,
} from "@/lib/work-os/yc-synthetic-walkthrough";

describe("S-01 YC synthetic walkthrough", () => {
  it("documents doctrine, 5 roles, and ≥5 survival paths", () => {
    expect(S01_DOCTRINE).toMatch(/unscripted|multi-role|YC/i);
    expect(YC_ROLE_PERSONAS).toHaveLength(5);
    expect(YC_SURVIVAL_PATHS.length).toBeGreaterThanOrEqual(5);
    expect(S01_DEDICATED_ORG_RESIDUAL).toMatch(/Dedicated synthetic YC org/i);
  });

  it("scores path survival and rejects fakes / walls", () => {
    const good = pathSurvives({
      path_id: "login_home",
      body: "Today · Needs me · Talk to Otzar — real work is here for your team.",
      url: "/app",
      error_wall: false,
    });
    expect(good.ok).toBe(true);

    expect(
      pathSurvives({
        path_id: "needs_me",
        body: "Coming soon — placeholder only",
        url: "/app/action-center",
        error_wall: false,
      }).ok,
    ).toBe(false);

    expect(
      pathSurvives({
        path_id: "talk",
        body: "Something went wrong",
        url: "/app/voice",
        error_wall: true,
      }).ok,
    ).toBe(false);

    expect(isErrorWall("Page not found")).toBe(true);
    expect(claimsStagedFrontendFake("fake data for demo")).toBe(true);
  });

  it("requires multi-role coverage of at least 4 personas", () => {
    expect(multiRoleCoverage(["ceo", "employee"]).complete).toBe(false);
    expect(
      multiRoleCoverage(["ceo", "manager", "employee", "executive"]).complete,
    ).toBe(true);
    expect(
      multiRoleCoverage([
        "ceo",
        "manager",
        "employee",
        "executive",
        "contractor",
      ]).covered,
    ).toBe(5);
  });

  it("scores a full role walkthrough", () => {
    const probes = YC_SURVIVAL_PATHS.map((p) => ({
      path_id: p.id,
      body: "Today Needs me Talk Otzar AI Teammate work project wallet memory preference approval handoff voice mic template role",
      url: p.path,
      error_wall: false,
    }));
    const s = scoreRoleWalkthrough(probes);
    expect(s.all_primary_ok).toBe(true);
    expect(s.fail).toBe(0);
  });
});
