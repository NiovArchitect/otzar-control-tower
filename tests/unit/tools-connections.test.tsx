// FILE: tools-connections.test.tsx (unit)
// PURPOSE: Phase E.1 — Tools & Connections inventory tab + human IA.
// CONNECTS TO: src/pages/ToolsConnections.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { useAuthStore } from "@/lib/stores/auth";
import { ToolsConnectionsPage } from "@/pages/ToolsConnections";

const API_BASE = "http://localhost:3000/api/v1";

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

function mockInventory(): void {
  server.use(
    http.get(`${API_BASE}/otzar/enterprise-tools/inventory`, () =>
      HttpResponse.json({
        ok: true,
        inventory: {
          headline: "2 capability areas live — inventory below.",
          kpis: {
            capabilities_connected: 2,
            capabilities_ready: 1,
            capabilities_blocked: 0,
            oauth_verified: 1,
            oauth_ready_for_consent: 1,
            org_bindings_enabled: 3,
            pending_access_requests: 1,
          },
          tools: [
            {
              provider: "GOOGLE_WORKSPACE",
              display_name: "Google Workspace",
              category: "PRODUCTIVITY",
              adapter_status: "CONFIGURED",
              oauth_status: "VERIFIED",
              account_label: "org@example.com",
              last_verified_at: null,
              can_write: true,
              employee_self_serve: true,
            },
          ],
          pending_requests: [
            {
              seed_id: "s1",
              subject_name: "David",
              recommended_action: "Enable Slack for David (Team chat)",
              created_at: new Date().toISOString(),
            },
          ],
          generated_at: new Date().toISOString(),
        },
      }),
    ),
  );
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
  mockInventory();
});

describe("Tools & Connections — Phase E.1 inventory", () => {
  it("defaults to Inventory & KPIs with human copy (no MCP primary)", async () => {
    renderPage();
    expect(screen.getByTestId("tools-connections-page")).toBeInTheDocument();
    expect(screen.getByTestId("tab-tools-inventory")).toBeInTheDocument();
    expect(await screen.findByTestId("tools-inventory-panel")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-connected")).toHaveTextContent("2");
    expect(screen.getByTestId("tools-pending-row")).toHaveTextContent(/David/);
    expect(document.body.textContent).not.toMatch(/model context protocol/i);
  });

  it("switches to Your tools and Advanced", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("tools-inventory-panel");
    await user.click(screen.getByTestId("tab-connected-tools"));
    await waitFor(() =>
      expect(screen.getByTestId("panel-connected-tools")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("tab-integrations-advanced"));
    await waitFor(() =>
      expect(screen.getByTestId("panel-integrations-advanced")).toBeInTheDocument(),
    );
  });
});
