// FILE: admin-nav-coming-soon.test.tsx (unit)
// PURPOSE: [OTZAR-V1-LIVE-1B] Lock which admin nav entries are placeholder
//          ("coming soon") and therefore hidden from the sidebar by default, so
//          v1 validation never walks a teammate into a reserved/stub screen.
//          Their ROUTES stay registered (App.tsx) — only the nav entry hides.
// CONNECTS TO: src/lib/nav.ts, src/components/AdminSidebar.tsx.

import { describe, expect, it } from "vitest";
import { NAV } from "@/lib/nav";

// The seven placeholder screens identified by the OTZAR-V1-LIVE-0 audit.
const EXPECTED_COMING_SOON = [
  "/analytics",
  "/conversations",
  "/documentation",
  "/intelligence",
  "/playground",
  "/settings",
  "/workflows",
].sort();

// Real, working surfaces that MUST remain visible during validation.
const MUST_STAY_VISIBLE = [
  "/",
  "/users",
  "/connectors",
  "/connector-rails",
  "/voice",
  "/voice-providers",
  "/review-center",
  "/agent-playground",
  "/policies",
  "/system-health",
];

describe("admin nav — placeholder (comingSoon) hiding (LIVE-1B)", () => {
  it("marks exactly the seven placeholder routes comingSoon", () => {
    const comingSoon = NAV.filter((n) => n.comingSoon === true)
      .map((n) => n.to)
      .sort();
    expect(comingSoon).toEqual(EXPECTED_COMING_SOON);
  });

  it("keeps real working surfaces visible (not comingSoon)", () => {
    const visible = new Set(
      NAV.filter((n) => n.comingSoon !== true).map((n) => n.to),
    );
    for (const route of MUST_STAY_VISIBLE) {
      expect(visible.has(route)).toBe(true);
    }
  });

  it("the default-visible nav (comingSoon filtered) drops all seven placeholders", () => {
    const defaultVisible = NAV.filter((n) => n.comingSoon !== true).map((n) => n.to);
    for (const route of EXPECTED_COMING_SOON) {
      expect(defaultVisible).not.toContain(route);
    }
  });
});
