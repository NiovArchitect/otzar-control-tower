// FILE: admin-nav-coming-soon.test.tsx (unit)
// PURPOSE: Lock which admin nav entries are placeholder ("coming soon") and
//          therefore hidden from the sidebar by default. Also lock the RC2
//          jobs-model visibility: Voice/seeding/onboarding/architecture
//          surfaces stay registered but are not primary nav.
// CONNECTS TO: src/lib/nav.ts, src/components/AdminSidebar.tsx.

import { describe, expect, it } from "vitest";
import { NAV } from "@/lib/nav";

// Placeholder screens still marked comingSoon (Intelligence is now a live hub).
const EXPECTED_COMING_SOON = [
  "/analytics",
  "/conversations",
  "/documentation",
  "/playground",
  "/settings",
  "/workflows",
].sort();

// Real, working surfaces that MUST remain registered (not comingSoon).
// Many are hidden from the sidebar (jobs model) but routes stay deep-link safe.
const MUST_STAY_REGISTERED = [
  "/",
  "/users",
  "/tools-connections",
  "/voice",
  "/voice-providers",
  "/review-center",
  "/agent-playground",
  "/governance",
  "/policies",
  "/access-control",
  "/retention",
  "/system-health",
  "/setup",
  "/approvals",
  "/intelligence",
  "/reports",
  "/security-audit",
];

// Primary-visible destinations under the jobs model (comingSoon + hidden filtered).
// Hubs are primary; detail routes stay deep-link only.
const MUST_BE_SIDEBAR_VISIBLE = [
  "/",
  "/setup",
  "/users",
  "/ai-teammates",
  "/tools-connections",
  "/governance",
  "/approvals",
  "/intelligence",
  "/security-audit",
];

describe("admin nav — placeholder (comingSoon) hiding (LIVE-1B)", () => {
  it("marks exactly the six placeholder routes comingSoon", () => {
    const comingSoon = NAV.filter((n) => n.comingSoon === true)
      .map((n) => n.to)
      .sort();
    expect(comingSoon).toEqual(EXPECTED_COMING_SOON);
  });

  it("keeps real working surfaces registered (not comingSoon)", () => {
    const registered = new Set(
      NAV.filter((n) => n.comingSoon !== true).map((n) => n.to),
    );
    for (const route of MUST_STAY_REGISTERED) {
      expect(registered.has(route)).toBe(true);
    }
  });

  it("the default-visible nav (comingSoon filtered) drops all placeholders", () => {
    const defaultVisible = NAV.filter((n) => n.comingSoon !== true).map((n) => n.to);
    for (const route of EXPECTED_COMING_SOON) {
      expect(defaultVisible).not.toContain(route);
    }
  });

  it("sidebar-visible nav matches the jobs model primary destinations", () => {
    const sidebar = NAV.filter(
      (n) => n.comingSoon !== true && n.hidden !== true,
    ).map((n) => n.to);
    for (const route of MUST_BE_SIDEBAR_VISIBLE) {
      expect(sidebar).toContain(route);
    }
    // Architecture / duplicate destinations must not be primary.
    for (const hidden of [
      "/voice",
      "/organization-seeding",
      "/onboarding",
      "/data-knowledge",
      "/review-center",
      "/system-health",
      "/policies",
      "/access-control",
      "/retention",
    ]) {
      expect(sidebar).not.toContain(hidden);
    }
  });
});
