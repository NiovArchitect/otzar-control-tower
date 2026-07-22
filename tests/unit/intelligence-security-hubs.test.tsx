// FILE: tests/unit/intelligence-security-hubs.test.tsx
// PURPOSE: RC2 Intelligence + Security hubs.
// CONNECTS TO: IntelligenceHub, SecurityHub.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IntelligenceHubPage } from "@/pages/IntelligenceHub";
import { SecurityHubPage } from "@/pages/SecurityHub";

vi.mock("@/pages/Reports", () => ({
  default: () => <div data-testid="mock-reports">Reports</div>,
}));
vi.mock("@/pages/Security", () => ({
  SecurityPage: () => <div data-testid="mock-security">Security audit</div>,
}));
vi.mock("@/pages/SystemHealth", () => ({
  SystemHealthPage: () => <div data-testid="mock-health">System health</div>,
}));

describe("Intelligence hub", () => {
  it("opens reports tab from overview", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <IntelligenceHubPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("intelligence-hub")).toBeInTheDocument();
    await user.click(screen.getByTestId("intelligence-open-reports"));
    expect(screen.getByTestId("mock-reports")).toBeInTheDocument();
  });
});

describe("Security hub", () => {
  it("opens audit and health tabs", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SecurityHubPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("security-hub")).toBeInTheDocument();
    await user.click(screen.getByTestId("security-open-audit"));
    expect(screen.getByTestId("mock-security")).toBeInTheDocument();
    await user.click(screen.getByTestId("security-tab-health"));
    expect(screen.getByTestId("mock-health")).toBeInTheDocument();
  });
});
