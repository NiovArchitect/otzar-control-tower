// FILE: admin-nav-sections.test.tsx (unit)
// PURPOSE: Lock the production Admin Center IA — administrator jobs model
//          (~6–7 primary areas), no architecture-oriented primary tabs,
//          seeding/onboarding folded into Organization, Voice not primary,
//          Action Center as the single exception queue.
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

describe("Admin Center IA — jobs model (RC2 coherence)", () => {
  it("renders the approved primary sections in order", () => {
    expect([...NAV_GROUP_ORDER]).toEqual([
      "Overview",
      "People & AI",
      "Connections",
      "Governance",
      "Action Center",
      "Intelligence",
      "Security",
    ]);
  });

  it("every nav entry belongs to one of the approved sections", () => {
    const groups = new Set<string>(NAV_GROUP_ORDER);
    for (const n of NAV) expect(groups.has(n.group)).toBe(true);
  });

  it("Overview = Home + Organization (billing advanced/hidden)", () => {
    expect(routesIn("Overview")).toEqual(["/", "/setup"].sort());
  });

  it("People & AI = People + AI Teammates only (seeding/onboarding not primary)", () => {
    expect(routesIn("People & AI")).toEqual(
      ["/ai-teammates", "/users"].sort(),
    );
    const labels = visible
      .filter((n) => n.group === "People & AI")
      .map((n) => n.label);
    expect(labels).not.toContain("Organization Seeding");
    expect(labels).not.toContain("Onboarding");
  });

  it("Connections = Connections landing only (Voice not primary)", () => {
    expect(routesIn("Connections")).toEqual(["/tools-connections"]);
    expect(visible.map((n) => n.label)).not.toContain("Voice");
  });

  it("Governance = one hub (Access/Policies/Retention deep links hidden)", () => {
    expect(routesIn("Governance")).toEqual(["/governance"]);
    // Full capability routes stay registered, not primary sidebar.
    const allGov = NAV.filter((n) => n.group === "Governance").map((n) => n.to);
    expect(allGov).toEqual(
      expect.arrayContaining(["/governance", "/access-control", "/policies", "/retention"]),
    );
  });

  it("Action Center = single exception queue (not Review + Pending + Policies)", () => {
    expect(routesIn("Action Center")).toEqual(["/approvals"]);
    const labels = visible.map((n) => n.label);
    expect(labels).not.toContain("Review Center");
    expect(labels).not.toContain("Pending Approvals");
    expect(labels).not.toContain("Policies & Approvals");
  });

  it("Intelligence = one hub (Reports deep link hidden)", () => {
    expect(routesIn("Intelligence")).toEqual(["/intelligence"]);
    const groupNames = [...NAV_GROUP_ORDER];
    expect(groupNames).not.toContain("Work Graph & Memory");
  });

  it("Security = one hub (System Health advanced deep link)", () => {
    expect(routesIn("Security")).toEqual(["/security-audit"]);
    expect(visible.map((n) => n.to)).not.toContain("/system-health");
  });

  it("does not expose architecture-oriented primary groups", () => {
    const groups = [...NAV_GROUP_ORDER];
    for (const banned of [
      "Tools & Connections",
      "Work Graph & Memory",
      "Policies & Approvals",
      "Audit & Activity",
      "Diagnostics",
      "People & Roles",
      "Workflows & Automation",
    ]) {
      expect(groups).not.toContain(banned);
    }
  });

  it("folds connectors into one Connections entry", () => {
    const navRoutes = NAV.map((n) => n.to);
    expect(navRoutes).not.toContain("/connectors");
    expect(navRoutes).not.toContain("/connector-rails");
    expect(navRoutes.filter((r) => r === "/tools-connections")).toHaveLength(1);
  });

  it("hides stub and architecture screens from the visible nav", () => {
    const visibleRoutes = visible.map((n) => n.to);
    for (const stub of [
      "/analytics",
      "/conversations",
      "/documentation",
      "/playground",
      "/settings",
      "/workflows",
      "/voice",
      "/organization-seeding",
      "/onboarding",
      "/data-knowledge",
      "/review-center",
      "/system-health",
      "/reports",
    ]) {
      expect(visibleRoutes).not.toContain(stub);
    }
    // Intelligence hub is primary; Reports is deep-link only.
    expect(visibleRoutes).toContain("/intelligence");
  });

  it("keeps deep-link routes registered for folded destinations", () => {
    const all = NAV.map((n) => n.to);
    for (const route of [
      "/organization-seeding",
      "/onboarding",
      "/review-center",
      "/voice",
      "/data-knowledge",
      "/system-health",
    ]) {
      expect(all).toContain(route);
    }
  });
});

describe("Admin sidebar — jobs model, no connector or architecture confusion", () => {
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

  it("shows job-section headers and Connections", () => {
    renderSidebar();
    const groups = screen
      .getAllByTestId("admin-nav-group")
      .map((el) => el.getAttribute("data-group"));
    expect(groups).toEqual([...NAV_GROUP_ORDER]);
    expect(
      screen.getByRole("link", { name: /^Connections$/i }),
    ).toBeInTheDocument();
  });

  it("does not surface old separate connector labels as nav links", () => {
    renderSidebar();
    expect(screen.queryByRole("link", { name: /^Connectors$/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Integrations & MCP/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /^Tools & Connections$/i })).toBeNull();
  });

  it("does not render competing seeding/onboarding/voice/architecture tabs", () => {
    renderSidebar();
    for (const label of [
      "Organization Seeding",
      "Onboarding",
      "Voice",
      "Work Graph & Memory",
      "Data & Knowledge",
      "Review Center",
      "Pending Approvals",
      "System Health",
      "Diagnostics",
      "Analytics",
      "Workflows",
      "Playground",
      "Scenario Studio",
      "Settings",
      "Documentation",
    ]) {
      expect(
        screen.queryByRole("link", { name: new RegExp(`^${label}$`, "i") }),
      ).toBeNull();
    }
  });

  it("exposes one Action Center link", () => {
    renderSidebar();
    expect(
      screen.getByRole("link", { name: /Action Center/i }),
    ).toBeInTheDocument();
  });
});
