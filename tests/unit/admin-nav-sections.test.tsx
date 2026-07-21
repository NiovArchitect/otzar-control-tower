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

// Match AdminSidebar: hide comingSoon + hidden unless VITE_SHOW_COMING_SOON.
const visible = NAV.filter(
  (n) => n.comingSoon !== true && n.hidden !== true,
);
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
  it("Overview = Home + Organization Setup (billing is advanced/hidden)", () => {
    // YC RC2 signal: Billing is not first-login Overview focus.
    expect(routesIn("Overview")).toEqual(["/", "/setup"].sort());
  });
  it("People & Roles = Users, AI Teammates, Organization Seeding, Onboarding", () => {
    expect(routesIn("People & Roles")).toEqual(
      ["/ai-teammates", "/onboarding", "/organization-seeding", "/users"].sort(),
    );
  });
  it("Tools & Connections = merged landing + Voice (providers advanced/hidden)", () => {
    expect(routesIn("Tools & Connections")).toEqual(
      ["/tools-connections", "/voice"].sort(),
    );
  });
  it("Work Graph & Memory = Data & Knowledge + Access Control (marketplace/cohorts advanced)", () => {
    // PROD-MODEL-P3 §9 — grants folded into Access Control.
    // YC RC2: Marketplace + Federation Cohorts hidden from primary nav.
    expect(routesIn("Work Graph & Memory")).toEqual(
      ["/access-control", "/data-knowledge"].sort(),
    );
  });
  it("Policies & Approvals = Policies, Review Center, Pending Approvals", () => {
    // collaboration-policy is advanced/hidden; routes remain registered.
    expect(routesIn("Policies & Approvals")).toEqual(
      ["/approvals", "/policies", "/review-center"].sort(),
    );
  });
  it("Workflows & Automation has no primary visible entries (playground advanced)", () => {
    // Agent Playground remains a registered route but is not first-class nav.
    expect(routesIn("Workflows & Automation")).toEqual([]);
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
