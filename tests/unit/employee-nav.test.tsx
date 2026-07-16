// FILE: tests/unit/employee-nav.test.tsx
// PURPOSE: Locks EmployeeNav WAVE-1 IA:
//          Primary: Today · Talk · Needs me · People · Memory (+ Team admin)
//          More: curated secondary only — no SaaS tab farm.
// CONNECTS TO:
//   - src/lib/nav-employee.ts (source of truth)
//   - src/components/employee/EmployeeNav.tsx (renderer)

import { describe, expect, it, beforeEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { EmployeeNav } from "@/components/employee/EmployeeNav";
import { useAuthStore } from "@/lib/stores/auth";
import {
  EMPLOYEE_NAV,
  PRIMARY_EMPLOYEE_NAV,
  MORE_EMPLOYEE_NAV,
} from "@/lib/nav-employee";

function setAuth(admin: boolean): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: false,
      can_admin_org: admin,
      can_admin_niov: false,
    },
  });
}

beforeEach(() => setAuth(false));

function renderNav(): void {
  render(
    <MemoryRouter>
      <EmployeeNav />
    </MemoryRouter>,
  );
}

async function openMore(): Promise<void> {
  await userEvent.click(screen.getByTestId("employee-nav-more-toggle"));
}

describe("nav-employee.ts — primary / more groupings", () => {
  it("primary group is the WAVE-1 everyday loop", () => {
    const labels = PRIMARY_EMPLOYEE_NAV.map((i) => i.label);
    expect(labels).toEqual([
      "Today",
      "Talk",
      "Needs me",
      "People",
      "Memory",
      "Team",
    ]);
  });

  it("more group is curated secondary surfaces — no admin/diagnostic junk", () => {
    const labels = MORE_EMPLOYEE_NAV.map((i) => i.label);
    expect(labels).toEqual([
      "My AI Teammate",
      "Captures",
      "Account & Security",
      "Schedule",
      "Preferences",
      "Corrections",
      "Launch readiness",
    ]);
  });

  it("keeps redundant/niche surfaces route-only (hidden from nav, reachable by URL)", () => {
    const hiddenRoutes = EMPLOYEE_NAV.filter((i) => i.hidden === true).map(
      (i) => i.to,
    );
    expect(hiddenRoutes.sort()).toEqual(
      [
        "/app/my-day",
        "/app/my-work",
        "/app/workspace",
        "/app/blind-spots",
        "/app/operational-health",
        "/app/collaboration-workspaces",
        "/app/my-organization",
        "/app/work-projects",
        "/app/meeting-captures",
        "/app/connector-health",
        "/app/approvals",
        "/app/authority-grants",
        "/app/chat",
        "/app/welcome",
        "/app/observe",
        "/app/voice-captures",
        "/app/conversations",
      ].sort(),
    );
    const navRoutes = [...PRIMARY_EMPLOYEE_NAV, ...MORE_EMPLOYEE_NAV].map(
      (i) => i.to,
    );
    for (const r of hiddenRoutes) expect(navRoutes).not.toContain(r);
  });

  it("employee copy uses human language — no Dandelion/implementation internals", () => {
    const banned =
      /\b(Dandelion|propagation|connector rail|MCP|capability object|diagnostics|schema|TAR|RBAC|ABAC|envelope|payload)\b/i;
    for (const i of EMPLOYEE_NAV) {
      expect(banned.test(i.label), `label: ${i.label}`).toBe(false);
      expect(banned.test(i.description), `desc: ${i.label}`).toBe(false);
    }
  });

  it("drops the 'Voice envelope' debug entry from the employee nav", () => {
    expect(EMPLOYEE_NAV.find((i) => i.to === "/app/voice-ready")).toBeUndefined();
    expect(EMPLOYEE_NAV.find((i) => i.label === "Voice envelope")).toBeUndefined();
  });

  it("Today is the first primary entry and routes to /app", () => {
    expect(PRIMARY_EMPLOYEE_NAV[0]?.to).toBe("/app");
    expect(PRIMARY_EMPLOYEE_NAV[0]?.label).toBe("Today");
  });

  it("every entry belongs to either primary or more", () => {
    for (const item of EMPLOYEE_NAV) {
      expect(["primary", "more"]).toContain(item.group);
    }
  });
});

describe("EmployeeNav renderer — visually separates the two groups", () => {
  it("renders the primary list; More is COLLAPSED by default", () => {
    renderNav();
    expect(screen.getByTestId("employee-nav-primary")).toBeInTheDocument();
    expect(screen.queryByTestId("employee-nav-more")).toBeNull();
    expect(screen.getByTestId("employee-nav-more-toggle")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("renders a 'More' disclosure that expands the more list", async () => {
    renderNav();
    expect(screen.getByText("More")).toBeInTheDocument();
    await openMore();
    expect(screen.getByTestId("employee-nav-more")).toBeInTheDocument();
    expect(screen.getByTestId("employee-nav-more-toggle")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("tags each rendered NavLink with its group via data-nav-group", async () => {
    renderNav();
    await openMore();
    const links = screen.getAllByTestId("employee-nav-link");
    const primaryCount = links.filter(
      (l) => l.getAttribute("data-nav-group") === "primary",
    ).length;
    const moreCount = links.filter(
      (l) => l.getAttribute("data-nav-group") === "more",
    ).length;
    expect(primaryCount).toBe(
      PRIMARY_EMPLOYEE_NAV.filter((i) => i.adminOnly !== true).length,
    );
    expect(moreCount).toBe(
      MORE_EMPLOYEE_NAV.filter((i) => i.adminOnly !== true).length,
    );
  });

  it("hides admin-only entries from normal employees and shows them to org admins", async () => {
    renderNav();
    await openMore();
    expect(screen.queryByText("Launch readiness")).toBeNull();
    expect(screen.queryByText("Team")).toBeNull();

    cleanup();
    setAuth(true);
    renderNav();
    await openMore();
    expect(screen.getByText("Launch readiness")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
  });

  it("Needs me is visible to every user; Team is visible only to managers/admins", async () => {
    renderNav();
    expect(screen.getByText("Needs me")).toBeInTheDocument();
    expect(screen.queryByText("Team")).toBeNull();

    cleanup();
    setAuth(true);
    renderNav();
    expect(screen.getByText("Needs me")).toBeInTheDocument();
    const team = screen.getByText("Team");
    expect(team).toBeInTheDocument();
    const link = team.closest('[data-testid="employee-nav-link"]');
    expect(link?.getAttribute("data-nav-group")).toBe("primary");
  });

  it("Blind Spots is route-only (hidden) — risk work lives in Needs me", () => {
    const blindSpots = EMPLOYEE_NAV.find((i) => i.label === "Blind Spots");
    expect(blindSpots).toBeDefined();
    expect(blindSpots?.to).toBe("/app/blind-spots");
    expect(blindSpots?.hidden).toBe(true);
    expect(MORE_EMPLOYEE_NAV.find((i) => i.label === "Blind Spots")).toBeUndefined();
    expect(PRIMARY_EMPLOYEE_NAV.find((i) => i.label === "Blind Spots")).toBeUndefined();
  });

  it("Needs me + Team route to action-center and team-work", () => {
    const needsMe = PRIMARY_EMPLOYEE_NAV.find((i) => i.label === "Needs me");
    const team = PRIMARY_EMPLOYEE_NAV.find((i) => i.label === "Team");
    expect(needsMe?.to).toBe("/app/action-center");
    expect(needsMe?.adminOnly).toBeUndefined();
    expect(team?.to).toBe("/app/team-work");
    expect(team?.adminOnly).toBe(true);
  });

  it("never surfaces 'Voice envelope' in the rendered nav", () => {
    renderNav();
    expect(screen.queryByText("Voice envelope")).toBeNull();
  });

  it("never surfaces raw developer jargon in primary labels", () => {
    renderNav();
    const html = screen.getByTestId("employee-nav").outerHTML;
    expect(html).not.toMatch(/envelope/i);
    expect(html).not.toMatch(/payload/i);
    expect(html).not.toMatch(/binding/i);
    expect(html).not.toMatch(/adapter/i);
    expect(html).not.toMatch(/policy_evaluation/i);
  });
});
