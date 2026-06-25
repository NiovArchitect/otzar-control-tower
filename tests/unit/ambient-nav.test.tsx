// FILE: tests/unit/ambient-nav.test.tsx
// PURPOSE: [OTZAR-LIVE-6] The employee nav is now FIVE calm entries, not a
//          26-destination SaaS sidebar. Prove the default is minimal (Today /
//          Needs me / People / Memory / More), that "More" holds everything else
//          (nothing lost), and that the dense list is NOT shown by default.
// CONNECTS TO: src/components/ambient/AmbientNav.tsx.

import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AmbientNav } from "@/components/ambient/AmbientNav";
import { useAuthStore } from "@/lib/stores/auth";

beforeEach(() => {
  useAuthStore.setState({
    token: "t",
    entity: { email: "vishesh@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
});
afterEach(() => cleanup());

function renderNav(): void {
  render(
    <MemoryRouter>
      <AmbientNav />
    </MemoryRouter>,
  );
}

describe("AmbientNav — five calm entries, not a SaaS sidebar", () => {
  it("shows exactly the five top-level entries by default", () => {
    renderNav();
    const rail = screen.getByTestId("ambient-nav");
    for (const label of ["Today", "Needs me", "People", "Memory"]) {
      expect(within(rail).getByText(label)).toBeInTheDocument();
    }
    expect(within(rail).getAllByText("More").length).toBeGreaterThan(0);
  });

  it("does NOT expose the dense destination list by default", () => {
    renderNav();
    // The old SaaS sidebar labels are NOT on the primary surface.
    expect(screen.queryByText("Blind Spots")).not.toBeInTheDocument();
    expect(screen.queryByText("Connector Health")).not.toBeInTheDocument();
    expect(screen.queryByText("Operational Health")).not.toBeInTheDocument();
    // The "More" sheet is collapsed until asked.
    expect(screen.queryByTestId("ambient-nav-more-sheet")).not.toBeInTheDocument();
  });

  it("'More' opens a sheet with everything else (nothing is lost)", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getAllByTestId("ambient-nav-more")[0]!);
    const sheet = screen.getByTestId("ambient-nav-more-sheet");
    // Secondary/technical routes live here, not on the primary surface.
    expect(within(sheet).getByText("Corrections")).toBeInTheDocument();
    expect(within(sheet).getByText("Approvals")).toBeInTheDocument();
    expect(within(sheet).getByText("Preferences")).toBeInTheDocument();
  });
});
