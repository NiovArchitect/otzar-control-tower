// FILE: tools-connections.test.tsx (unit)
// PURPOSE: Smoke the merged "Tools & Connections" landing — human IA:
//          connect tools without MCP jargon as the primary path.
// CONNECTS TO: src/pages/ToolsConnections.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth";
import { ToolsConnectionsPage } from "@/pages/ToolsConnections";

function setAdmin(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  } as never);
}

function renderPage(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ToolsConnectionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  cleanup();
  setAdmin();
});

describe("Tools & Connections — merged landing", () => {
  it("renders the human landing with both tabs without throwing", () => {
    renderPage();
    expect(screen.getByTestId("tools-connections-page")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Connect the tools your company already uses/i,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("tab-connected-tools")).toBeInTheDocument();
    expect(screen.getByTestId("tab-integrations-advanced")).toBeInTheDocument();
    expect(screen.getByTestId("connector-categories")).toBeInTheDocument();
  });

  it("defaults to Your tools and switches to Advanced on click", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByTestId("panel-connected-tools")).toBeInTheDocument();
    await user.click(screen.getByTestId("tab-integrations-advanced"));
    await waitFor(() =>
      expect(screen.getByTestId("panel-integrations-advanced")).toBeInTheDocument(),
    );
  });
});
