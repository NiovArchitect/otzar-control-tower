// FILE: tests/unit/ambient-nav.test.tsx
// PURPOSE: [OTZAR-LIVE-6 / WAVE-1] Employee ambient nav is a calm primary
//          loop (Today / Talk / Needs me / People / Memory + More), not a
//          SaaS sidebar. Secondary surfaces stay out of the default rail.
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
  it("shows the ambient primary loop by default", () => {
    renderNav();
    const rail = screen.getByTestId("ambient-nav");
    // Ambient rail: Today · Needs me · Comms · People · Memory (+ More).
    // Talk lives in the desktop EmployeeNav primary, not this compact rail.
    for (const label of ["Today", "Needs me", "Comms", "People", "Memory"]) {
      expect(within(rail).getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(within(rail).getAllByText("More").length).toBeGreaterThan(0);
  });

  it("does NOT expose the dense destination list by default", () => {
    renderNav();
    expect(screen.queryByText("Blind Spots")).not.toBeInTheDocument();
    expect(screen.queryByText("Tool connections")).not.toBeInTheDocument();
    expect(screen.queryByText("Work health")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ambient-nav-more-sheet")).not.toBeInTheDocument();
  });

  it("'More' opens a curated sheet (secondary surfaces present, route-only hidden ones absent)", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getAllByTestId("ambient-nav-more")[0]!);
    const sheet = screen.getByTestId("ambient-nav-more-sheet");
    // Thinned WAVE-1 More: only everyday secondary destinations.
    expect(within(sheet).getByText("My AI Teammate")).toBeInTheDocument();
    expect(within(sheet).getByText("Account & Security")).toBeInTheDocument();
    expect(within(sheet).getByText("Projects")).toBeInTheDocument();
    // Preferences / Corrections / Captures are route-only or primary elsewhere.
    expect(within(sheet).queryByText("Preferences")).toBeNull();
    expect(within(sheet).queryByText("Corrections")).toBeNull();
    expect(within(sheet).queryByText("Captures")).toBeNull();
    // Approvals / Blind Spots are route-only (Needs me owns the daily path).
    expect(within(sheet).queryByText("Approvals")).toBeNull();
    expect(within(sheet).queryByText("Blind Spots")).toBeNull();
    for (const hiddenLabel of [
      "Chat",
      "Getting started",
      "Observe",
      "Voice captures",
    ]) {
      expect(within(sheet).queryByText(hiddenLabel)).not.toBeInTheDocument();
    }
  });
});
