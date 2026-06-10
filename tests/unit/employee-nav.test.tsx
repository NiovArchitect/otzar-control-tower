// FILE: tests/unit/employee-nav.test.tsx
// PURPOSE: Phase 1212 -- locks the EmployeeNav reorganization into
//          PRIMARY / MORE groupings + the removal of the "Voice
//          envelope" developer-debug surface from the nav.
// CONNECTS TO:
//   - src/lib/nav-employee.ts (source of truth)
//   - src/components/employee/EmployeeNav.tsx (renderer)

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EmployeeNav } from "@/components/employee/EmployeeNav";
import {
  EMPLOYEE_NAV,
  PRIMARY_EMPLOYEE_NAV,
  MORE_EMPLOYEE_NAV,
} from "@/lib/nav-employee";

function renderNav(): void {
  render(
    <MemoryRouter>
      <EmployeeNav />
    </MemoryRouter>,
  );
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
    ]);
  });

  it("more group carries My Organization / Approvals / Authority / Preferences / Projects / Conversations / Corrections / Chat / Observe", () => {
    const labels = MORE_EMPLOYEE_NAV.map((i) => i.label);
    expect(labels).toEqual([
      "My Organization",
      "Approvals",
      "Authority",
      "Preferences",
      "Projects",
      "Conversations",
      "Corrections",
      "Chat",
      "Observe",
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
  it("renders a primary list and a more list", () => {
    renderNav();
    expect(screen.getByTestId("employee-nav-primary")).toBeInTheDocument();
    expect(screen.getByTestId("employee-nav-more")).toBeInTheDocument();
  });

  it("renders a 'More' section header above the more list", () => {
    renderNav();
    expect(screen.getByText("More")).toBeInTheDocument();
  });

  it("tags each rendered NavLink with its group via data-nav-group", () => {
    renderNav();
    const links = screen.getAllByTestId("employee-nav-link");
    const primaryCount = links.filter(
      (l) => l.getAttribute("data-nav-group") === "primary",
    ).length;
    const moreCount = links.filter(
      (l) => l.getAttribute("data-nav-group") === "more",
    ).length;
    expect(primaryCount).toBe(PRIMARY_EMPLOYEE_NAV.length);
    expect(moreCount).toBe(MORE_EMPLOYEE_NAV.length);
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
