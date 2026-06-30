// FILE: admin-employee-isolation.test.tsx (unit)
// PURPOSE: A real employee must never see admin/operator complexity. This locks
//          the wall between the org-admin Control Tower nav (src/lib/nav.ts) and
//          the employee Otzar shell nav (src/lib/nav-employee.ts): disjoint
//          routes, no admin sections, no Organization Seeding, no diagnostics,
//          while the everyday surfaces (Comms, Action Center) stay reachable.
// CONNECTS TO: src/lib/nav.ts, src/lib/nav-employee.ts.

import { describe, expect, it } from "vitest";
import { NAV } from "@/lib/nav";
import { EMPLOYEE_NAV } from "@/lib/nav-employee";

const adminRoutes = new Set(NAV.map((n) => n.to));
const employeeRoutes = EMPLOYEE_NAV.map((n) => n.to);

describe("admin / employee isolation", () => {
  it("employee nav and admin nav share no routes", () => {
    for (const r of employeeRoutes) expect(adminRoutes.has(r)).toBe(false);
  });

  it("every employee destination lives under the /app/ shell", () => {
    for (const r of employeeRoutes) expect(r.startsWith("/app/")).toBe(true);
  });

  it("no admin destination leaks into the /app/ shell", () => {
    for (const n of NAV) expect(n.to.startsWith("/app/")).toBe(false);
  });

  it("employees never see Organization Seeding (admin-governed org seeding)", () => {
    expect(employeeRoutes).not.toContain("/organization-seeding");
    expect(employeeRoutes.some((r) => /seeding/i.test(r))).toBe(false);
  });

  it("employees never see operator diagnostics (system health, retention)", () => {
    for (const diag of ["/system-health", "/retention", "/app/system-health", "/app/retention"]) {
      expect(employeeRoutes).not.toContain(diag);
    }
  });

  it("employee labels stay human — no developer/admin jargon", () => {
    // Unambiguous implementation jargon only. "Dandelion" is an approved brand
    // metaphor in employee copy (People & Collaboration) — employee-copy polish
    // is the dedicated next slice (#29), not this admin-IA pass.
    const banned = /\b(MCP rail|connector binding|capability object|schema|debug|TAR|RBAC|ABAC|envelope)\b/i;
    for (const n of EMPLOYEE_NAV) {
      expect(banned.test(n.label)).toBe(false);
      expect(banned.test(n.description)).toBe(false);
    }
  });

  it("keeps the everyday employee surfaces reachable", () => {
    expect(employeeRoutes).toContain("/app/comms");
    expect(employeeRoutes).toContain("/app/action-center");
  });
});
