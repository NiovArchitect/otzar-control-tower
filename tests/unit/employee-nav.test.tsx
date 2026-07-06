// FILE: tests/unit/employee-nav.test.tsx
// PURPOSE: Phase 1212 -- locks the EmployeeNav reorganization into
//          PRIMARY / MORE groupings + the removal of the "Voice
//          envelope" developer-debug surface from the nav.
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
  it("primary group is the minimal everyday loop (approved IA)", () => {
    const labels = PRIMARY_EMPLOYEE_NAV.map((i) => i.label);
    expect(labels).toEqual([
      "My Day",
      "Talk to Otzar",
      "Action Center",
      "My Work",
      "Team Work",
      "Comms",
      "People & Collaboration",
      "My Digital Work Wallet",
    ]);
  });

  it("more group is curated secondary surfaces — no admin/diagnostic junk", () => {
    const labels = MORE_EMPLOYEE_NAV.map((i) => i.label);
    // PROD-MODEL-P3 §17 — My Organization / Meeting captures / Approvals /
    // Authority are demoted to route-only (redundant with Action Center,
    // automatic ingestion, and admin-governed twin authority).
    expect(labels).toEqual([
      "My Twin",
      // [PASSWORD-LIFECYCLE] self-service credential control belongs to
      // the employee, quietly in More — admins never see or set it.
      "Account & Security",
      "Blind Spots",
      "Work health",
      "Workspaces",
      "Projects",
      "Tool connections",
      "Preferences",
      "Corrections",
      "Launch readiness",
    ]);
  });

  it("keeps redundant/niche surfaces route-only (hidden from nav, reachable by URL)", () => {
    const hiddenRoutes = EMPLOYEE_NAV.filter((i) => i.hidden === true).map((i) => i.to);
    expect(hiddenRoutes.sort()).toEqual(
      [
        "/app/chat", "/app/welcome", "/app/observe", "/app/voice-captures", "/app/conversations",
        // PROD-MODEL-P3 §17 demotions — reachable by URL, absent from nav.
        "/app/my-organization", "/app/meeting-captures", "/app/approvals", "/app/authority-grants",
      ].sort(),
    );
    // Hidden items never appear in the rendered nav selectors.
    const navRoutes = [...PRIMARY_EMPLOYEE_NAV, ...MORE_EMPLOYEE_NAV].map((i) => i.to);
    for (const r of hiddenRoutes) expect(navRoutes).not.toContain(r);
  });

  it("employee copy uses human language — no Dandelion/implementation internals", () => {
    const banned = /\b(Dandelion|propagation|connector rail|MCP|capability object|diagnostics|schema|TAR|RBAC|ABAC|envelope|payload)\b/i;
    for (const i of EMPLOYEE_NAV) {
      expect(banned.test(i.label), `label: ${i.label}`).toBe(false);
      expect(banned.test(i.description), `desc: ${i.label}`).toBe(false);
    }
  });

  it("drops the 'Voice envelope' debug entry from the employee nav", () => {
    expect(EMPLOYEE_NAV.find((i) => i.to === "/app/voice-ready")).toBeUndefined();
    expect(EMPLOYEE_NAV.find((i) => i.label === "Voice envelope")).toBeUndefined();
  });

  it("My Day is the first primary entry and routes to /app", () => {
    expect(PRIMARY_EMPLOYEE_NAV[0]?.to).toBe("/app/my-day");
    expect(PRIMARY_EMPLOYEE_NAV[0]?.label).toBe("My Day");
  });

  it("every entry belongs to either primary or more", () => {
    for (const item of EMPLOYEE_NAV) {
      expect(["primary", "more"]).toContain(item.group);
    }
  });
});

describe("EmployeeNav renderer — visually separates the two groups", () => {
  it("renders the primary list; More is COLLAPSED by default (Phase 1235 ambient shell)", () => {
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
    // Non-admin viewers do not see adminOnly entries in EITHER group
    // (Team Work is an adminOnly primary entry).
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

    cleanup();
    setAuth(true);
    renderNav();
    await openMore();
    expect(screen.getByText("Launch readiness")).toBeInTheDocument();
  });

  it("My Work is visible to every user; Team Work is visible only to managers/admins", async () => {
    // Non-admin: My Work present, Team Work hidden.
    renderNav();
    expect(screen.getByText("My Work")).toBeInTheDocument();
    expect(screen.queryByText("Team Work")).toBeNull();

    // Manager/admin (can_admin_org): both present + prominent (primary group).
    cleanup();
    setAuth(true);
    renderNav();
    expect(screen.getByText("My Work")).toBeInTheDocument();
    const teamWork = screen.getByText("Team Work");
    expect(teamWork).toBeInTheDocument();
    // Team Work is a PRIMARY entry (not buried in More).
    const link = teamWork.closest('[data-testid="employee-nav-link"]');
    expect(link?.getAttribute("data-nav-group")).toBe("primary");
  });

  it("Blind Spots is a curated More entry routing to /app/blind-spots", () => {
    // Minimal-IA: Blind Spots moves out of the daily primary set into the
    // curated More (still reachable, still risk-focused). Visible to EVERY
    // user (employee sees own; manager sees team) — never adminOnly.
    const blindSpots = MORE_EMPLOYEE_NAV.find((i) => i.label === "Blind Spots");
    expect(blindSpots).toBeDefined();
    expect(blindSpots?.to).toBe("/app/blind-spots");
    expect(blindSpots?.adminOnly).toBeUndefined();
    expect(PRIMARY_EMPLOYEE_NAV.find((i) => i.label === "Blind Spots")).toBeUndefined();
  });

  it("Blind Spots renders under More for a normal employee AND a manager", async () => {
    renderNav();
    await openMore();
    const empLink = screen.getByText("Blind Spots").closest('[data-testid="employee-nav-link"]');
    expect(empLink).not.toBeNull();
    expect(empLink?.getAttribute("href")).toBe("/app/blind-spots");
    expect(empLink?.getAttribute("data-nav-group")).toBe("more");

    cleanup();
    setAuth(true);
    renderNav();
    await openMore();
    expect(screen.getByText("Blind Spots")).toBeInTheDocument();
  });

  it("My Work + Team Work route to /app/my-work and /app/team-work", () => {
    const myWork = PRIMARY_EMPLOYEE_NAV.find((i) => i.label === "My Work");
    const teamWork = PRIMARY_EMPLOYEE_NAV.find((i) => i.label === "Team Work");
    expect(myWork?.to).toBe("/app/my-work");
    expect(myWork?.adminOnly).toBeUndefined();
    expect(teamWork?.to).toBe("/app/team-work");
    expect(teamWork?.adminOnly).toBe(true);
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
