// FILE: admin-nav-sections.test.tsx (unit)
// PURPOSE: Lock the production Admin Center IA — eight coherent sections, the
//          approved per-section membership, stub screens hidden from the visible
//          nav (routes preserved), and the two connector surfaces folded into one
//          "Tools & Connections" destination. This is the contract the sidebar
//          and route map must honor.
// CONNECTS TO: src/lib/nav.ts, src/components/AdminSidebar.tsx, src/App.tsx.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { NAV, NAV_GROUP_ORDER, type NavGroup } from "@/lib/nav";
import { AdminSidebar } from "@/components/AdminSidebar";

const visible = NAV.filter((n) => n.comingSoon !== true);
const routesIn = (group: NavGroup): string[] =>
  visible.filter((n) => n.group === group).map((n) => n.to).sort();

describe("Admin Center IA — eight production sections", () => {
  it("renders exactly the eight approved sections in order", () => {
    expect([...NAV_GROUP_ORDER]).toEqual([
      "Overview",
      "People & Roles",
      "Tools & Connections",
      "Work Graph & Memory",
      "Policies & Approvals",
      "Workflows & Automation",
      "Audit & Activity",
      "Diagnostics",
    ]);
  });

  it("every nav entry belongs to one of the eight sections", () => {
    const groups = new Set<string>(NAV_GROUP_ORDER);
    for (const n of NAV) expect(groups.has(n.group)).toBe(true);
  });

  // Approved per-section VISIBLE membership (stub entries excluded by design).
  it("Overview = Home + Organization Setup + Billing & Entitlements", () => {
    // [GAP-U SLICE-1] /setup joins Overview — the guided read-only setup
    // journey belongs beside Home, not buried in a sub-section.
    expect(routesIn("Overview")).toEqual(["/", "/billing", "/setup"].sort());
  });
  it("People & Roles = Users, AI Teammates, Organization Seeding, Onboarding", () => {
    expect(routesIn("People & Roles")).toEqual(
      ["/ai-teammates", "/onboarding", "/organization-seeding", "/users"].sort(),
    );
  });
  it("Tools & Connections = merged landing + Voice Providers + Voice", () => {
    expect(routesIn("Tools & Connections")).toEqual(
      ["/tools-connections", "/voice", "/voice-providers"].sort(),
    );
  });
  it("Work Graph & Memory = Data & Knowledge, ONE Access Control (grants folded in as a tab), Marketplace, Cohorts", () => {
    // PROD-MODEL-P3 §9 — /access-grants stays a registered route but is no
    // longer a separate nav destination.
    expect(routesIn("Work Graph & Memory")).toEqual(
      ["/access-control", "/cohorts", "/data-knowledge", "/marketplace"].sort(),
    );
  });
  it("Policies & Approvals = Policies, Collaboration policy, Review Center, Pending Approvals", () => {
    expect(routesIn("Policies & Approvals")).toEqual(
      ["/approvals", "/collaboration-policy", "/policies", "/review-center"].sort(),
    );
  });
  it("Workflows & Automation = Agent Playground (stubs hidden)", () => {
    expect(routesIn("Workflows & Automation")).toEqual(["/agent-playground"]);
  });
  it("Audit & Activity = Security & Audit + Reports", () => {
    expect(routesIn("Audit & Activity")).toEqual(["/reports", "/security-audit"].sort());
  });
  it("Diagnostics = System Health + Data retention", () => {
    expect(routesIn("Diagnostics")).toEqual(["/retention", "/system-health"].sort());
  });

  it("folds the two connector surfaces into one Tools & Connections entry", () => {
    const navRoutes = NAV.map((n) => n.to);
    // The former top-level connector destinations are no longer nav entries…
    expect(navRoutes).not.toContain("/connectors");
    expect(navRoutes).not.toContain("/connector-rails");
    // …replaced by exactly one merged landing.
    expect(navRoutes.filter((r) => r === "/tools-connections")).toHaveLength(1);
  });

  it("hides the seven stub screens from the visible nav", () => {
    const visibleRoutes = visible.map((n) => n.to);
    for (const stub of [
      "/analytics", "/conversations", "/documentation", "/intelligence",
      "/playground", "/settings", "/workflows",
    ]) {
      expect(visibleRoutes).not.toContain(stub);
    }
  });
});

describe("Admin sidebar — renders the production sections, no connector confusion", () => {
  function renderSidebar(): void {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <AdminSidebar />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("shows production section headers (empty groups omitted) and Tools & Connections", () => {
    renderSidebar();
    const groups = screen
      .getAllByTestId("admin-nav-group")
      .map((el) => el.getAttribute("data-group"));
    // Workflows & Automation is fully hidden (zero-noise) — section not rendered.
    expect(groups).toEqual(
      NAV_GROUP_ORDER.filter((g) => g !== "Workflows & Automation"),
    );
    expect(screen.getByRole("link", { name: /Tools & Connections/i })).toBeInTheDocument();
  });

  it("does not surface the old separate connector labels as nav links", () => {
    renderSidebar();
    expect(screen.queryByRole("link", { name: /^Connectors$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Integrations & MCP/i })).toBeNull();
  });

  it("does not render stub or experimental screens in the sidebar", () => {
    renderSidebar();
    for (const label of [
      "Analytics",
      "Workflows",
      "Playground",
      "Scenario Studio",
      "Settings",
      "Documentation",
    ]) {
      expect(screen.queryByRole("link", { name: new RegExp(`^${label}$`, "i") })).toBeNull();
    }
  });
});
