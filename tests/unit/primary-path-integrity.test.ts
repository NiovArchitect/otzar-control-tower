// FILE: primary-path-integrity.test.ts
// PURPOSE: C-03 — no dead buttons, fake metrics, or coming-soon in primary paths.

import { describe, expect, it } from "vitest";
import {
  AMBIENT_PRIMARY_PATHS,
  adminVisibleNavItems,
  assertAdminDefaultNavClean,
  assertFocusLinksLive,
  assertNoComingSoonInPrimaryEmployee,
  assertWalkthroughCtAsLive,
  employeePrimaryNavItems,
} from "@/lib/nav/primary-path-integrity";

describe("C-03 primary path integrity", () => {
  it("employee primary nav has no dead/redirect destinations", () => {
    expect(assertNoComingSoonInPrimaryEmployee()).toEqual([]);
    const labels = employeePrimaryNavItems().map((i) => i.label);
    expect(labels).toContain("Today");
    expect(labels).toContain("Talk");
    expect(labels).toContain("Needs me");
  });

  it("AmbientNav primary loop is Today · Talk · Needs me · People · Memory", () => {
    expect(AMBIENT_PRIMARY_PATHS.map((p) => p.label)).toEqual([
      "Today",
      "Talk",
      "Needs me",
      "People",
      "Memory",
    ]);
    expect(AMBIENT_PRIMARY_PATHS.map((p) => p.to)).toEqual([
      "/app",
      "/app/voice",
      "/app/action-center",
      "/app/collaboration",
      "/app/my-memory",
    ]);
  });

  it("admin default nav never surfaces comingSoon entries", () => {
    expect(assertAdminDefaultNavClean()).toEqual([]);
    const visible = adminVisibleNavItems(false);
    expect(visible.length).toBeGreaterThan(5);
    expect(visible.every((i) => !i.comingSoon)).toBe(true);
  });

  it("walkthrough CTAs only deep-link real /app surfaces", () => {
    expect(assertWalkthroughCtAsLive()).toEqual([]);
  });

  it("Today Focus queue cards always have why + live links", () => {
    expect(assertFocusLinksLive()).toEqual([]);
  });
});
