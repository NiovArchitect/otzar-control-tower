// FILE: tests/unit/governance-hub.test.tsx
// PURPOSE: RC2 Governance hub — overview + tabs; deep capability preserved.
// CONNECTS TO: src/pages/Governance.tsx

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { GovernancePage } from "@/pages/Governance";

vi.mock("@/pages/AccessHub", () => ({
  AccessHubPage: () => <div data-testid="mock-access-hub">Access hub</div>,
}));
vi.mock("@/pages/Policies", () => ({
  PoliciesPage: () => <div data-testid="mock-policies">Policies</div>,
}));
vi.mock("@/pages/Retention", () => ({
  default: () => <div data-testid="mock-retention">Retention</div>,
}));

function renderGov(path = "/governance"): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <GovernancePage />
    </MemoryRouter>,
  );
}

describe("Governance hub", () => {
  it("renders overview with Access, Policies, and retention areas", () => {
    renderGov();
    expect(screen.getByTestId("governance-page")).toBeInTheDocument();
    expect(screen.getByTestId("governance-area-access")).toBeInTheDocument();
    expect(screen.getByTestId("governance-area-policies")).toBeInTheDocument();
    expect(screen.getByTestId("governance-area-retention")).toBeInTheDocument();
  });

  it("opens Access tab from overview", async () => {
    const user = userEvent.setup();
    renderGov();
    await user.click(screen.getByTestId("governance-open-access"));
    expect(screen.getByTestId("mock-access-hub")).toBeInTheDocument();
  });

  it("honors ?tab=policies deep link", () => {
    renderGov("/governance?tab=policies");
    expect(screen.getByTestId("mock-policies")).toBeInTheDocument();
  });
});
