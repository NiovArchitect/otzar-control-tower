// FILE: tests/unit/capability-preservation-regression.test.ts
// PURPOSE: RC2 gate — capability-preservation map stays complete and every
//          fullCapabilityRoute remains registered in App.tsx / NAV.
//          Prevents "simplify by deleting" regressions.
// CONNECTS TO: src/lib/setup/capability-preservation.ts, src/App.tsx, nav.ts.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CAPABILITY_PRESERVATION_MAP,
  RC2_PRIMARY_HUB_ROUTES,
  capabilityFullRoutes,
  capabilityMapHealthIssues,
  capabilityMapNeedsWork,
} from "@/lib/setup/capability-preservation";
import { NAV } from "@/lib/nav";

const APP_TSX = readFileSync(
  resolve(process.cwd(), "src/App.tsx"),
  "utf8",
);

function appRegistersRoute(route: string): boolean {
  const segment = route.replace(/^\//, "");
  // Matches path="foo", path="/foo", path="foo/bar"
  const patterns = [
    new RegExp(`path=["']${segment}["']`),
    new RegExp(`path=["']/${segment}["']`),
  ];
  return patterns.some((re) => re.test(APP_TSX));
}

describe("RC2 capability-preservation regression", () => {
  it("has no NEEDS_WORK rows", () => {
    expect(capabilityMapNeedsWork()).toEqual([]);
    expect(capabilityMapHealthIssues()).toEqual([]);
  });

  it("maps every major recomposed admin job", () => {
    const oldScreens = CAPABILITY_PRESERVATION_MAP.map((e) => e.oldScreen);
    for (const required of [
      "Organization Seeding",
      "Tools & Connections",
      "Access Control",
      "Policies",
      "Data retention",
      "Pending Approvals",
      "Review Center",
      "Reports",
      "Security & Audit",
      "System Health",
    ]) {
      expect(oldScreens).toContain(required);
    }
  });

  it("registers every fullCapabilityRoute in App.tsx", () => {
    const missing = capabilityFullRoutes().filter((r) => !appRegistersRoute(r));
    expect(missing).toEqual([]);
  });

  it("keeps legacy seeding/dandelion redirects in App.tsx", () => {
    expect(APP_TSX).toMatch(/path=["']seeding["']/);
    expect(APP_TSX).toMatch(/path=["']dandelion["']/);
    expect(APP_TSX).toMatch(/organization-seeding/);
  });

  it("exposes RC2 primary hubs on the admin nav registry", () => {
    const navRoutes = new Set(NAV.map((n) => n.to));
    for (const hub of RC2_PRIMARY_HUB_ROUTES) {
      expect(navRoutes.has(hub)).toBe(true);
    }
  });

  it("primary hubs are not marked comingSoon", () => {
    for (const hub of RC2_PRIMARY_HUB_ROUTES) {
      const item = NAV.find((n) => n.to === hub);
      expect(item, hub).toBeDefined();
      expect(item!.comingSoon).not.toBe(true);
    }
  });

  it("sidebar shows hubs, not folded detail routes", () => {
    const sidebar = new Set(
      NAV.filter((n) => n.comingSoon !== true && n.hidden !== true).map(
        (n) => n.to,
      ),
    );
    for (const hub of RC2_PRIMARY_HUB_ROUTES) {
      expect(sidebar.has(hub)).toBe(true);
    }
    // Folded into hubs — must not reappear as primary
    for (const folded of [
      "/policies",
      "/access-control",
      "/retention",
      "/reports",
      "/review-center",
      "/system-health",
    ]) {
      expect(sidebar.has(folded)).toBe(false);
    }
  });

  it("RECOMPOSED rows still name a reachable fullCapabilityRoute", () => {
    const recomposed = CAPABILITY_PRESERVATION_MAP.filter(
      (e) => e.status === "RECOMPOSED",
    );
    expect(recomposed.length).toBeGreaterThan(5);
    for (const row of recomposed) {
      expect(appRegistersRoute(row.fullCapabilityRoute)).toBe(true);
    }
  });
});
