// FILE: synthetic-principal.test.ts
// PURPOSE: Founder rejection — rc2-admin* must not appear as coworkers.

import { describe, expect, it } from "vitest";
import {
  coworkerDisplayLabel,
  filterCoworkerPeople,
  isSyntheticPrincipal,
} from "@/lib/identity/synthetic-principal";

describe("isSyntheticPrincipal", () => {
  it("flags rc2-admin emails founder saw live", () => {
    for (const email of [
      "rc2-admin-2+sadeil@niovlabs.com",
      "rc2-admin-2b+sadeil@niovlabs.com",
      "rc2-admin-3+sadeil@niovlabs.com",
      "rc2-admin-4+sadeil@niovlabs.com",
    ]) {
      expect(isSyntheticPrincipal({ email }), email).toBe(true);
    }
  });

  it("does not flag real teammates", () => {
    expect(
      isSyntheticPrincipal({
        email: "sadeil@niovlabs.com",
        display_name: "Sadeil",
      }),
    ).toBe(false);
    expect(
      isSyntheticPrincipal({
        email: "david@niovlabs.com",
        display_name: "David Odie",
      }),
    ).toBe(false);
  });

  it("filters coworker lists", () => {
    const out = filterCoworkerPeople([
      { email: "david@niovlabs.com", display_name: "David" },
      { email: "rc2-admin-2+sadeil@niovlabs.com", display_name: "rc2-admin-2" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.email).toBe("david@niovlabs.com");
  });

  it("never labels synthetic as a normal name", () => {
    expect(
      coworkerDisplayLabel({
        email: "rc2-admin-2+sadeil@niovlabs.com",
        display_name: "rc2-admin-2+sadeil@niovlabs.com",
      }),
    ).toBe("Internal test account");
  });
});
