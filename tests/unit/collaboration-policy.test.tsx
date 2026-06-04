// FILE: tests/unit/collaboration-policy.test.tsx
// PURPOSE: Phase 4F — admin CollaborationPolicy page tests.
// CONNECTS TO: src/pages/CollaborationPolicy.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { CollaborationPolicy } from "@/pages/CollaborationPolicy";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAdmin() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "admin@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: false,
      can_share_capsules: false,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CollaborationPolicy />
    </QueryClientProvider>,
  );
}

const POLICY_FIXTURE = {
  policy_id: "policy-1",
  collaboration_scope: "CROSS_TEAM" as const,
  request_type: null,
  sensitivity_class: null,
  outcome: "NEEDS_APPROVAL" as const,
  requires_employee_authority: false,
  requires_admin_approval: true,
  requires_dual_control: false,
  connector_write_allowed: false,
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  setAdmin();
});

describe("CollaborationPolicy admin page", () => {
  it("renders header + presets card + upsert form + active rows", async () => {
    server.use(
      http.get(`${API_BASE}/orgs/me/collaboration-policy`, () =>
        HttpResponse.json({ ok: true, policies: [POLICY_FIXTURE] }),
      ),
    );
    renderPage();
    expect(
      await screen.findByText("Collaboration policy"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("presets-card")).toBeInTheDocument();
    expect(screen.getByTestId("upsert-policy-form")).toBeInTheDocument();
    // Rule precedence panel must be present.
    expect(
      screen.getByText(/Employee authority cannot override org policy\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Org policy cannot override employee revocation\./),
    ).toBeInTheDocument();
  });

  it("renders all 3 preset cards", async () => {
    server.use(
      http.get(`${API_BASE}/orgs/me/collaboration-policy`, () =>
        HttpResponse.json({ ok: true, policies: [] }),
      ),
    );
    renderPage();
    expect(
      await screen.findByTestId("preset-autonomous-internal-flow"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("preset-conservative")).toBeInTheDocument();
    expect(screen.getByTestId("preset-highly-autonomous")).toBeInTheDocument();
  });

  it("upsert form exposes all 5 scopes + 5 outcomes + 10 request_types + 10 sensitivity classes", async () => {
    server.use(
      http.get(`${API_BASE}/orgs/me/collaboration-policy`, () =>
        HttpResponse.json({ ok: true, policies: [] }),
      ),
    );
    renderPage();
    const scope = await screen.findByTestId("pol-scope");
    expect(within(scope).getAllByRole("option")).toHaveLength(5);
    const outcome = screen.getByTestId("pol-outcome");
    expect(within(outcome).getAllByRole("option")).toHaveLength(5);
    const rt = screen.getByTestId("pol-rtype");
    // Any + 10 request types = 11 options.
    expect(within(rt).getAllByRole("option")).toHaveLength(11);
    const sens = screen.getByTestId("pol-sensitivity");
    // Any + 10 sensitivity classes = 11 options.
    expect(within(sens).getAllByRole("option")).toHaveLength(11);
  });

  it("applying a preset fires upserts (autonomous-internal-flow → 5 rows)", async () => {
    let upsertCalls = 0;
    server.use(
      http.get(`${API_BASE}/orgs/me/collaboration-policy`, () =>
        HttpResponse.json({ ok: true, policies: [] }),
      ),
      http.post(`${API_BASE}/orgs/me/collaboration-policy`, () => {
        upsertCalls++;
        return HttpResponse.json({ ok: true, policy: POLICY_FIXTURE });
      }),
    );
    renderPage();
    const user = userEvent.setup();
    const btn = await screen.findByTestId(
      "preset-apply-autonomous-internal-flow",
    );
    await user.click(btn);
    // Wait for the preset to settle.
    await screen.findByTestId("preset-apply-autonomous-internal-flow");
    expect(upsertCalls).toBe(5);
  });
});
