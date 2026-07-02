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

describe("AmbientNav — calm everyday entries, not a SaaS sidebar", () => {
  it("shows the minimal approved primary loop by default (incl. Comms)", () => {
    renderNav();
    const rail = screen.getByTestId("ambient-nav");
    // Approved minimal primary: Today · Needs me · Comms · People · Memory (+ More).
    for (const label of ["Today", "Needs me", "Comms", "People", "Memory"]) {
      expect(within(rail).getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(within(rail).getAllByText("More").length).toBeGreaterThan(0);
  });

  it("does NOT expose the dense destination list by default", () => {
    renderNav();
    // Secondary/risk/technical labels are NOT on the primary surface.
    expect(screen.queryByText("Blind Spots")).not.toBeInTheDocument();
    expect(screen.queryByText("Tool connections")).not.toBeInTheDocument();
    expect(screen.queryByText("Work health")).not.toBeInTheDocument();
    // The "More" sheet is collapsed until asked.
    expect(screen.queryByTestId("ambient-nav-more-sheet")).not.toBeInTheDocument();
  });

  it("'More' opens a curated sheet (secondary surfaces present, route-only hidden ones absent)", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getAllByTestId("ambient-nav-more")[0]!);
    const sheet = screen.getByTestId("ambient-nav-more-sheet");
    // Curated secondary surfaces live here, not on the primary surface.
    expect(within(sheet).getByText("Corrections")).toBeInTheDocument();
    // PROD-MODEL-P3 §17 — Approvals is demoted (Action Center is THE needs-me
    // surface); it must NOT appear in the sheet.
    expect(within(sheet).queryByText("Approvals")).toBeNull();
    expect(within(sheet).getByText("Blind Spots")).toBeInTheDocument();
    expect(within(sheet).getByText("Preferences")).toBeInTheDocument();
    // Route-only (hidden) surfaces are NOT dumped into the sheet — they stay
    // reachable by URL but never crowd it.
    for (const hiddenLabel of ["Chat", "Getting started", "Observe", "Voice captures"]) {
      expect(within(sheet).queryByText(hiddenLabel)).not.toBeInTheDocument();
    }
  });
});
