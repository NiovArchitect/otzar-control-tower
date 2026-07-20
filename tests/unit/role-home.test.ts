// FILE: role-home.test.ts
// PURPOSE: B-05 — role Home copy and glance order differ by role.

import { describe, expect, it } from "vitest";
import {
  orderGlanceByRole,
  resolveHomeRole,
  roleHomeCopy,
} from "@/lib/today/role-home";

describe("B-05 role Home", () => {
  it("resolves admin / exec / manager / contractor / employee", () => {
    expect(
      resolveHomeRole({ isOrgAdmin: true, title: null, orgRole: null }),
    ).toBe("administrator");
    expect(
      resolveHomeRole({ isOrgAdmin: false, title: "CEO", orgRole: null }),
    ).toBe("executive");
    expect(
      resolveHomeRole({
        isOrgAdmin: false,
        title: "Engineering Manager",
        orgRole: null,
      }),
    ).toBe("manager");
    expect(
      resolveHomeRole({
        isOrgAdmin: false,
        title: "Consultant",
        orgRole: "contractor",
      }),
    ).toBe("contractor");
    expect(
      resolveHomeRole({
        isOrgAdmin: false,
        title: "Engineer",
        orgRole: "member",
      }),
    ).toBe("employee");
  });

  it("presence and empty copy differ across roles", () => {
    const admin = roleHomeCopy("administrator");
    const employee = roleHomeCopy("employee");
    const contractor = roleHomeCopy("contractor");
    expect(admin.presenceLine).not.toBe(employee.presenceLine);
    expect(contractor.presenceLine).toMatch(/scoped/i);
    expect(admin.glanceOrder[0]).toBe("people");
    expect(employee.glanceOrder[0]).toBe("needs");
    expect(contractor.caughtUpLine).toMatch(/boundar/i);
  });

  it("orders glance chips by role preference", () => {
    const chips = [
      { key: "doc" },
      { key: "needs" },
      { key: "people" },
      { key: "projects" },
    ];
    const admin = orderGlanceByRole("administrator", chips).map((c) => c.key);
    expect(admin[0]).toBe("people");
    const emp = orderGlanceByRole("employee", chips).map((c) => c.key);
    expect(emp[0]).toBe("needs");
  });
});
