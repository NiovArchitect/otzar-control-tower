// FILE: tests/unit/capabilities.test.ts
// PURPOSE: Contract tests for the frontend ABAC/RBAC helper map.
// CONNECTS TO: src/lib/auth/capabilities.ts, src/lib/stores/auth.ts.
//
// GUARANTEES:
//   - isEmployee keys off can_read_capsules.
//   - canWriteOtzar keys off can_write_capsules.
//   - isOrgAdmin keys off can_admin_org.
//   - PRODUCT access NEVER derives from can_admin_niov.
//   - landingPathFor routes admins to "/" and product-only users to "/app".

import { describe, expect, it } from "vitest";
import {
  canShareCapsules,
  canWriteOtzar,
  hasAnyCapability,
  hasCapability,
  isEmployee,
  isManager,
  isOrgAdmin,
  landingPathFor,
} from "@/lib/auth/capabilities";
import type { AuthCapabilities } from "@/lib/stores/auth";

const employee: AuthCapabilities = {
  can_read_capsules: true,
  can_write_capsules: true,
  can_share_capsules: true,
  can_admin_org: false,
  can_admin_niov: false,
};
const readOnly: AuthCapabilities = {
  ...employee,
  can_write_capsules: false,
  can_share_capsules: false,
};
const orgAdmin: AuthCapabilities = { ...employee, can_admin_org: true };
// A NIOV admin with NO product operations -- must get zero product access.
const niovOnly: AuthCapabilities = {
  can_read_capsules: false,
  can_write_capsules: false,
  can_share_capsules: false,
  can_admin_org: false,
  can_admin_niov: true,
};

describe("capabilities helpers", () => {
  it("isEmployee is true for a read-capable user, false for null", () => {
    expect(isEmployee(readOnly)).toBe(true);
    expect(isEmployee(employee)).toBe(true);
    expect(isEmployee(null)).toBe(false);
  });

  it("isOrgAdmin keys off can_admin_org only", () => {
    expect(isOrgAdmin(orgAdmin)).toBe(true);
    expect(isOrgAdmin(employee)).toBe(false);
    expect(isOrgAdmin(null)).toBe(false);
  });

  it("canWriteOtzar keys off can_write_capsules", () => {
    expect(canWriteOtzar(employee)).toBe(true);
    expect(canWriteOtzar(readOnly)).toBe(false);
  });

  it("canShareCapsules keys off can_share_capsules", () => {
    expect(canShareCapsules(employee)).toBe(true);
    expect(canShareCapsules(readOnly)).toBe(false);
  });

  it("NEVER grants product access from can_admin_niov", () => {
    // A pure NIOV admin has no read/write/admin_org product access.
    expect(isEmployee(niovOnly)).toBe(false);
    expect(isOrgAdmin(niovOnly)).toBe(false);
    expect(canWriteOtzar(niovOnly)).toBe(false);
    // landingPathFor never routes a niov-only token into the admin area.
    expect(landingPathFor(niovOnly)).toBe("/app");
  });

  it("hasCapability / hasAnyCapability behave", () => {
    expect(hasCapability(employee, "can_read_capsules")).toBe(true);
    expect(hasCapability(null, "can_read_capsules")).toBe(false);
    expect(
      hasAnyCapability(readOnly, ["can_write_capsules", "can_admin_org"]),
    ).toBe(false);
    expect(
      hasAnyCapability(orgAdmin, ["can_write_capsules", "can_admin_org"]),
    ).toBe(true);
  });

  it("landingPathFor sends admins to / and product-only users to /app", () => {
    expect(landingPathFor(orgAdmin)).toBe("/");
    expect(landingPathFor(employee)).toBe("/app");
    expect(landingPathFor(null)).toBe("/app");
  });

  it("isManager is a FUTURE stub that always returns false", () => {
    expect(isManager(orgAdmin)).toBe(false);
    expect(isManager(employee)).toBe(false);
    expect(isManager(null)).toBe(false);
  });
});
