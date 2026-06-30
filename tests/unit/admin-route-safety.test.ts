// FILE: admin-route-safety.test.ts (unit)
// PURPOSE: Deep-link safety guard for the production Admin IA reorg. Every
//          visible nav destination MUST have a registered route, AND the
//          surfaces folded out of nav (the two connector pages) plus the hidden
//          stub screens MUST keep their routes so existing deep links never
//          break. Reads the real App.tsx route map so the assertion can't drift.
// CONNECTS TO: src/lib/nav.ts, src/App.tsx.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NAV } from "@/lib/nav";

// Vitest runs from the repo root; read the real route map so the guard
// reflects App.tsx exactly and can't drift from the source of truth.
const appSrc = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

// A nav `to` like "/users" is registered as <Route path="users" …> (nested
// under the admin Layout); Home ("/") is the <Route index> element.
function hasRoute(to: string): boolean {
  if (to === "/") return /<Route\s+index\b/.test(appSrc);
  const token = to.replace(/^\//, "");
  return appSrc.includes(`path="${token}"`);
}

describe("admin route safety — every destination resolves", () => {
  it("every nav entry (visible or stub) has a registered route", () => {
    for (const n of NAV) {
      expect(hasRoute(n.to), `missing route for nav ${n.label} (${n.to})`).toBe(true);
    }
  });

  it("preserves the folded connector routes for deep-link safety", () => {
    expect(hasRoute("/connectors")).toBe(true);
    expect(hasRoute("/connector-rails")).toBe(true);
  });

  it("registers the merged Tools & Connections route", () => {
    expect(hasRoute("/tools-connections")).toBe(true);
  });

  it("keeps the seven hidden stub routes registered (reachable by URL)", () => {
    for (const stub of [
      "/analytics", "/conversations", "/documentation", "/intelligence",
      "/playground", "/settings", "/workflows",
    ]) {
      expect(hasRoute(stub), `stub route ${stub} must stay registered`).toBe(true);
    }
  });

  it("keeps the moved screens (Reports, Billing, Onboarding, Organization Seeding) reachable", () => {
    for (const route of ["/reports", "/billing", "/onboarding", "/organization-seeding", "/retention"]) {
      expect(hasRoute(route)).toBe(true);
    }
  });
});
