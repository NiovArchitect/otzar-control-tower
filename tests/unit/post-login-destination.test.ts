// FILE: post-login-destination.test.ts
// PURPOSE: YC login gate — Home after auth; only validated deep links restore.

import { describe, expect, it } from "vitest";
import {
  isValidatedDeepLink,
  resolvePostLoginDestination,
} from "@/lib/auth/post-login-destination";

const ADMIN = {
  can_read_capsules: true,
  can_write_capsules: true,
  can_share_capsules: true,
  can_admin_org: true,
  can_admin_niov: false,
};
const EMPLOYEE = { ...ADMIN, can_admin_org: false };

describe("isValidatedDeepLink", () => {
  it("accepts intentional product deep links", () => {
    expect(isValidatedDeepLink("/app/action-center")).toBe(true);
    expect(isValidatedDeepLink("/app/action-center?focus=x")).toBe(true);
    expect(isValidatedDeepLink("/app/work-projects/abc")).toBe(true);
    expect(isValidatedDeepLink("/app/inbox/thread-1")).toBe(true);
    expect(isValidatedDeepLink("/app/my-twin")).toBe(true);
  });

  it("rejects admin/sensitive and bare home restores", () => {
    expect(isValidatedDeepLink("/users")).toBe(false);
    expect(isValidatedDeepLink("/setup")).toBe(false);
    expect(isValidatedDeepLink("/agent-playground")).toBe(false);
    expect(isValidatedDeepLink("/")).toBe(false);
    expect(isValidatedDeepLink("/app")).toBe(false);
    expect(isValidatedDeepLink("/login")).toBe(false);
    expect(isValidatedDeepLink("//evil.com")).toBe(false);
  });
});

describe("resolvePostLoginDestination", () => {
  it("always lands on product Home when returnTo is absent or blocked", () => {
    expect(resolvePostLoginDestination(null, ADMIN)).toBe("/app");
    expect(resolvePostLoginDestination(null, EMPLOYEE)).toBe("/app");
    expect(resolvePostLoginDestination("/users", ADMIN)).toBe("/app");
    expect(resolvePostLoginDestination("/agent-playground", ADMIN)).toBe("/app");
    expect(resolvePostLoginDestination("/setup/import-people", ADMIN)).toBe(
      "/app",
    );
  });

  it("honors validated deep links only", () => {
    expect(
      resolvePostLoginDestination("/app/action-center", EMPLOYEE),
    ).toBe("/app/action-center");
    expect(
      resolvePostLoginDestination("/app/work-projects/p1", ADMIN),
    ).toBe("/app/work-projects/p1");
  });

  it("rejects open redirects", () => {
    expect(resolvePostLoginDestination("//evil.com", ADMIN)).toBe("/app");
    expect(resolvePostLoginDestination("https://evil.com", EMPLOYEE)).toBe(
      "/app",
    );
  });
});
