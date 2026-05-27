// FILE: tests/unit/my-twin.test.tsx
// PURPOSE: Page tests for the employee My Twin surface. Verifies the
//          identity renders safely, the multi-twin note + no-teammate
//          empty state, and that NO raw twin_id / role-template body /
//          substrate internals leak into customer-facing UI.
// CONNECTS TO: src/pages/app/MyTwin.tsx, tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyTwin } from "@/pages/app/MyTwin";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: false,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

function renderMyTwin() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MyTwin />
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

describe("MyTwin (employee Otzar)", () => {
  it("renders the twin identity, skills, and approver safely", async () => {
    renderMyTwin();
    // Scope identity assertions to the main card -- the role-scope panel
    // legitimately repeats some of these (role title, approver, behavior
    // mode), so global getByText would match multiple.
    const card = await screen.findByTestId("my-twin-card");
    expect(within(card).getByText("Your AI Teammate")).toBeInTheDocument();
    expect(within(card).getByText(/Executive Assistant/)).toBeInTheDocument();
    expect(within(card).getByText(/Approval required/i)).toBeInTheDocument();
    expect(screen.getByTestId("my-twin-skills")).toHaveTextContent(
      /Calendar Coordination/,
    );
    expect(within(card).getByText(/Dana Manager/)).toBeInTheDocument();
  });

  it("renders the role-scope profile safely with anti-surveillance framing", async () => {
    renderMyTwin();
    const panel = await screen.findByTestId("role-scope-panel");
    expect(panel).toHaveTextContent(/within your role and access/i);
    expect(panel).toHaveTextContent(/Role-scoped enterprise context/);
    expect(panel).toHaveTextContent(
      /Governed by role and organization access rules/,
    );
    // Permissioned work context is rendered as NOT surveillance.
    expect(within(panel).getByTestId("observation-mode")).toHaveTextContent(
      /Permissioned work context, not surveillance\./i,
    );
    expect(panel).toHaveTextContent(/prevent drift/i);
    expect(panel).toHaveTextContent(
      /Sensitive actions still require permission, policy, or approval/i,
    );
    // No surveillance / monitoring / policing framing, and no raw ids.
    expect(panel).not.toHaveTextContent(
      /monitoring|policing|spy|tracking employees|judging/i,
    );
    const text = panel.textContent ?? "";
    expect(text).not.toContain("twin-self-0001"); // raw id not surfaced
    expect(text).not.toMatch(
      /capability_flags|permission envelope|bridge_id|raw memory|vector|embedding/i,
    );
  });

  it("remains backward-compatible when role_scope_profile is absent", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin`, async () =>
        HttpResponse.json(
          {
            ok: true,
            twin: {
              twin_id: "twin-self-0001",
              display_name: "Your AI Teammate",
              role_title: "Executive Assistant",
              autonomy_mode: "APPROVAL_REQUIRED",
              swarm_enabled: false,
              role_template: null,
              is_admin_twin: false,
              status: "ACTIVE",
              skills: [],
              approver: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            has_multiple_twins: false,
            twin_count: 1,
          },
          { status: 200 },
        ),
      ),
    );
    renderMyTwin();
    // Identity still renders; the role-scope panel shows its fallback.
    expect(await screen.findByTestId("my-twin-card")).toBeInTheDocument();
    expect(screen.getByTestId("role-scope-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("role-scope-panel")).not.toBeInTheDocument();
  });

  it("does not expose raw twin_id, role-template body, or substrate internals", async () => {
    const { container } = renderMyTwin();
    await screen.findByText("Your AI Teammate");
    const text = container.textContent ?? "";
    expect(text).not.toContain("twin-self-0001"); // raw twin_id hidden
    expect(text).not.toContain("executive-assistant"); // role_template body hidden
    expect(text).not.toMatch(
      /capsule|vector|bridge_id|capability_flags|template_content|raw memory/i,
    );
  });

  it("renders the no-teammate empty state on 404 TWIN_NOT_FOUND", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin`, async () =>
        HttpResponse.json(
          { ok: false, code: "TWIN_NOT_FOUND", message: "No twin" },
          { status: 404 },
        ),
      ),
    );
    renderMyTwin();
    expect(await screen.findByTestId("my-twin-empty")).toBeInTheDocument();
  });

  it("shows the multi-twin note when has_multiple_twins is true", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin`, async () =>
        HttpResponse.json(
          {
            ok: true,
            twin: {
              twin_id: "twin-self-0001",
              display_name: "Your AI Teammate",
              role_title: null,
              autonomy_mode: "OBSERVE_ONLY",
              swarm_enabled: false,
              role_template: null,
              is_admin_twin: false,
              status: "ACTIVE",
              skills: [],
              approver: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            has_multiple_twins: true,
            twin_count: 2,
          },
          { status: 200 },
        ),
      ),
    );
    renderMyTwin();
    expect(
      await screen.findByText(/multiple assigned AI teammates/i),
    ).toBeInTheDocument();
  });
});
