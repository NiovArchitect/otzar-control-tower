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
  it("primary group surfaces the everyday Otzar Work-OS journey", () => {
    const labels = PRIMARY_EMPLOYEE_NAV.map((i) => i.label);
    expect(labels).toEqual([
      "My Day",
      "Talk to Otzar",
      "Action Center",
      "Comms",
      "My Twin",
      "People & Collaboration",
      "Workspaces",
    ]);
  });

  it("more group carries deeper config + voice captures", () => {
    const labels = MORE_EMPLOYEE_NAV.map((i) => i.label);
    expect(labels).toEqual([
      "My Organization",
      "My Digital Work Wallet",
      "Connector Health",
      "Approvals",
      "Authority",
      "Preferences",
      "Projects",
      "Conversations",
      "Corrections",
      "Chat",
      "Observe",
      "Meeting captures",
      "Production readiness",
      "Voice captures",
    ]);
  });

  it("drops the 'Voice envelope' debug entry from the employee nav", () => {
    expect(EMPLOYEE_NAV.find((i) => i.to === "/app/voice-ready")).toBeUndefined();
    expect(EMPLOYEE_NAV.find((i) => i.label === "Voice envelope")).toBeUndefined();
  });

  it("My Day is the first primary entry and routes to /app", () => {
    expect(PRIMARY_EMPLOYEE_NAV[0]?.to).toBe("/app");
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
    expect(primaryCount).toBe(PRIMARY_EMPLOYEE_NAV.length);
    // Non-admin viewers do not see adminOnly entries.
    expect(moreCount).toBe(
      MORE_EMPLOYEE_NAV.filter((i) => i.adminOnly !== true).length,
    );
  });

  it("hides admin-only entries from normal employees and shows them to org admins", async () => {
    renderNav();
    await openMore();
    expect(screen.queryByText("Production readiness")).toBeNull();

    cleanup();
    setAuth(true);
    renderNav();
    await openMore();
    expect(screen.getByText("Production readiness")).toBeInTheDocument();
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
