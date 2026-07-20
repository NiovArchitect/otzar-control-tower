// FILE: route-inventory.test.ts
// PURPOSE: C-01 — route inventory matrix is complete and primary nav is thin.

import { describe, expect, it } from "vitest";
import {
  buildRouteInventory,
  CULL_CANDIDATES,
  EMPLOYEE_REDIRECTS,
  inventorySummary,
} from "@/lib/nav/route-inventory";
import { EMPLOYEE_NAV } from "@/lib/nav-employee";

describe("C-01 route inventory", () => {
  it("builds a non-empty inventory covering employee + admin", () => {
    const rows = buildRouteInventory();
    const summary = inventorySummary(rows);
    expect(summary.total).toBeGreaterThan(30);
    expect(rows.some((r) => r.shell === "employee")).toBe(true);
    expect(rows.some((r) => r.shell === "admin")).toBe(true);
  });

  it("employee primary nav stays small (ADHD / zero-noise)", () => {
    const primary = EMPLOYEE_NAV.filter(
      (n) => n.group === "primary" && !n.hidden,
    );
    // Today Talk Needs People Memory (+ optional Team for managers)
    expect(primary.length).toBeLessThanOrEqual(7);
    expect(primary.length).toBeGreaterThanOrEqual(5);
  });

  it("documents redirects for legacy Today aliases", () => {
    const paths = EMPLOYEE_REDIRECTS.map((r) => r.path);
    expect(paths).toContain("/app/my-day");
    expect(paths).toContain("/app/workspace");
  });

  it("lists cull candidates with recommended action", () => {
    expect(CULL_CANDIDATES.length).toBeGreaterThanOrEqual(3);
    for (const c of CULL_CANDIDATES) {
      expect(["hide", "redirect", "keep_deep_link"]).toContain(c.recommended);
      expect(c.reason.length).toBeGreaterThan(5);
    }
  });

  it("every inventory row has path + earns_existence", () => {
    for (const r of buildRouteInventory()) {
      expect(r.path.startsWith("/")).toBe(true);
      expect(["yes", "thin", "no", "redirect"]).toContain(r.earns_existence);
    }
  });
});
