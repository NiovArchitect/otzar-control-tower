// FILE: tools-connections.test.tsx (unit)
// PURPOSE: Phase E.1 + E.2 — inventory KPIs, approve/deny, people, revoke.
// CONNECTS TO: src/pages/ToolsConnections.tsx.

import { describe, expect, it, beforeEach, vi } from "vitest";
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

function inventoryBody() {
  return {
    ok: true,
    inventory: {
      headline: "1 tool request needs a decision.",
      kpis: {
        capabilities_connected: 2,
        capabilities_ready: 1,
        capabilities_blocked: 0,
        oauth_verified: 1,
        oauth_ready_for_consent: 1,
        org_bindings_enabled: 3,
        pending_access_requests: 1,
        people_with_open_requests: 1,
        active_employee_grants: 1,
      },
      tools: [
        {
          provider: "GOOGLE_WORKSPACE",
          display_name: "Google Workspace",
          category: "PRODUCTIVITY",
          adapter_status: "CONFIGURED",
          oauth_status: "VERIFIED",
          oauth_slug: "google",
          account_label: "org@example.com",
          last_verified_at: null,
          can_write: true,
          employee_self_serve: true,
          revocable: true,
        },
      ],
      pending_requests: [
        {
          seed_id: "s1",
          subject_name: "David",
          subject_entity_id: "person-david",
          capability_id: "chat",
          provider: "SLACK",
          recommended_action: "Enable Slack for David (Team chat)",
          created_at: new Date().toISOString(),
        },
      ],
      people: [
        {
          person_entity_id: "person-david",
          display_name: "David",
          open_request_count: 1,
          active_grant_count: 1,
          sample_requests: ["Enable Slack for David (Team chat)"],
          grants: [
            {
              grant_id: "g1",
              connection_id: "c1",
              scope_type: "EMPLOYEE",
              allowed_operations: ["READ"],
            },
          ],
        },
      ],
      accuracy: {
        twin_claims: 5,
        twin_active: 2,
        twin_completed: 3,
        regulated_claims: 2,
        awaiting_human_verify: 1,
        human_verified: 1,
        human_verified_and_completed: 1,
        human_edit_after_claim: 1,
        completion_gate_blocks: 1,
        regulated_classes: ["REGULATED_HEALTH", "REGULATED_FINANCE"],
      },
      generated_at: new Date().toISOString(),
    },
  };
}

function mockInventory(): void {
  server.use(
    http.get(`${API_BASE}/otzar/enterprise-tools/inventory`, () =>
      HttpResponse.json(inventoryBody()),
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
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("Tools & Connections — Phase E.2 inventory actions", () => {
  it("shows KPIs, people, pending requests, and accuracy strip", async () => {
    renderPage();
    expect(await screen.findByTestId("tools-inventory-panel")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-pending")).toHaveTextContent("1");
    expect(screen.getByTestId("tools-pending-row")).toHaveTextContent(/David/);
    expect(screen.getByTestId("tools-people-row")).toHaveTextContent(/David/);
    expect(screen.getByTestId("tools-oauth-revoke")).toBeInTheDocument();
    expect(screen.getByTestId("tools-accuracy-panel")).toBeInTheDocument();
    expect(screen.getByTestId("acc-awaiting-verify")).toHaveTextContent("1");
    expect(screen.getByTestId("acc-human-edits")).toHaveTextContent("1");
    // O-02 coverage panel
    const cov = screen.getByTestId("tools-coverage-panel");
    expect(cov).toBeInTheDocument();
    expect(cov).toHaveAttribute("data-scim-state", "not_wired");
    expect(screen.getByTestId("tools-scope-org")).toBeInTheDocument();
    expect(screen.getByTestId("tools-scope-team")).toBeInTheDocument();
    expect(screen.getByTestId("tools-scope-user")).toBeInTheDocument();
    expect(screen.getByTestId("tools-scim-status").textContent?.toLowerCase()).toMatch(
      /not wired/,
    );
    expect(screen.getByTestId("tools-admin-consent")).toBeInTheDocument();
  });

  it("approve posts decide decision", async () => {
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/otzar/enterprise-tools/requests/decide`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ok: true,
          seed_id: "s1",
          decision: "approve",
        });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("tools-request-approve");
    await user.click(screen.getByTestId("tools-request-approve"));
    await waitFor(() =>
      expect(body).toEqual({ seed_id: "s1", decision: "approve" }),
    );
  });

  it("revoke posts oauth revoke", async () => {
    let slug: string | null = null;
    server.use(
      http.post(`${API_BASE}/otzar/enterprise-tools/oauth/:slug/revoke`, ({ params }) => {
        slug = params.slug as string;
        return HttpResponse.json({ ok: true });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("tools-oauth-revoke");
    await user.click(screen.getByTestId("tools-oauth-revoke"));
    await waitFor(() => expect(slug).toBe("google"));
  });
});
