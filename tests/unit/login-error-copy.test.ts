// FILE: login-error-copy.test.ts
// PURPOSE: Sole-admin lockout must not say "contact your administrator".

import { describe, expect, it } from "vitest";
import { loginErrorCopy } from "@/lib/auth/login-error-copy";

describe("loginErrorCopy", () => {
  it("maps wrong credentials clearly", () => {
    expect(loginErrorCopy("INVALID_CREDENTIALS")).toMatch(/Incorrect email/i);
  });

  it("explains temporary lockout without sole-admin trap wording", () => {
    const msg = loginErrorCopy("SUSPENDED");
    expect(msg).toMatch(/temporarily locked/i);
    expect(msg).toMatch(/too many failed/i);
    expect(msg).not.toMatch(/contact your administrator/i);
    expect(msg).toMatch(/only admin|Otzar support|operator/i);
  });

  it("maps network errors", () => {
    expect(loginErrorCopy("NETWORK_ERROR")).toMatch(/reach the server/i);
  });
});
