// FILE: tests/unit/authority-grants.test.tsx
// PURPOSE: Phase 4B — page tests for AuthorityGrants employee surface.
// CONNECTS TO: src/pages/app/AuthorityGrants.tsx, tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { AuthorityGrants } from "@/pages/app/AuthorityGrants";
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

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AuthorityGrants />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const GRANT_FIXTURE = {
  grant_id: "11111111-1111-1111-1111-111111111111",
  duration_class: "SESSION" as const,
  sensitivity_class: "MODERATE" as const,
  scope_type: "PERSONAL" as const,
  scope_id: null,
  state: "ACTIVE" as const,
  effective_from: new Date().toISOString(),
  expires_at: null,
  revoked_at: null,
  consumed_at: null,
  purpose_summary: "Draft follow-up emails for me",
  action_type: null,
  connector_type: null,
  has_connector_binding: false,
  revocable: true,
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  setAuth();
});

describe("AuthorityGrants page", () => {
  it("renders header + honesty reminders + create form + list", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/authority-grants`, () =>
        HttpResponse.json({ ok: true, grants: [GRANT_FIXTURE] }),
      ),
    );
    renderPage();
    expect(
      await screen.findByText(/Authority you have granted your AI Teammate/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Indefinite does not mean unlimited\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/You can revoke this later\./)).toBeInTheDocument();
    expect(screen.getByTestId("create-authority-grant-form")).toBeInTheDocument();
    expect(
      await screen.findByText("Draft follow-up emails for me"),
    ).toBeInTheDocument();
  });

  it("create form exposes all 8 duration classes + 10 sensitivity classes", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/authority-grants`, () =>
        HttpResponse.json({ ok: true, grants: [] }),
      ),
    );
    renderPage();
    const duration = await screen.findByTestId("grant-duration");
    const sensitivity = screen.getByTestId("grant-sensitivity");
    const scope = screen.getByTestId("grant-scope-type");

    const durationOpts = within(duration).getAllByRole("option");
    expect(durationOpts).toHaveLength(8);
    const sensitivityOpts = within(sensitivity).getAllByRole("option");
    expect(sensitivityOpts).toHaveLength(10);
    const scopeOpts = within(scope).getAllByRole("option");
    expect(scopeOpts).toHaveLength(9);
  });

  it("revoke button only renders when grant.revocable is true", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/authority-grants`, () =>
        HttpResponse.json({
          ok: true,
          grants: [
            { ...GRANT_FIXTURE, purpose_summary: "Active grant — can revoke" },
            {
              ...GRANT_FIXTURE,
              grant_id: "22222222-2222-2222-2222-222222222222",
              state: "REVOKED",
              revocable: false,
              purpose_summary: "Already revoked grant",
            },
          ],
        }),
      ),
    );
    renderPage();
    await screen.findByText("Active grant — can revoke");
    expect(
      screen.getByTestId(`grant-revoke-${GRANT_FIXTURE.grant_id}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(
        "grant-revoke-22222222-2222-2222-2222-222222222222",
      ),
    ).not.toBeInTheDocument();
  });

  it("never renders forbidden surveillance / score / monitoring language", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/authority-grants`, () =>
        HttpResponse.json({ ok: true, grants: [GRANT_FIXTURE] }),
      ),
    );
    const { container } = renderPage();
    await screen.findByText("Draft follow-up emails for me");
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/surveillance/i);
    expect(text).not.toMatch(/employee score/i);
    expect(text).not.toMatch(/monitoring/i);
    expect(text).not.toMatch(/spy/i);
    expect(text).not.toMatch(/productivity score/i);
  });

  it("does not leak constraints_json / connector_binding_id / grantor_entity_id across the rendered DOM", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/authority-grants`, () =>
        HttpResponse.json({
          ok: true,
          grants: [
            {
              ...GRANT_FIXTURE,
              has_connector_binding: true,
            },
          ],
        }),
      ),
    );
    const { container } = renderPage();
    await screen.findByText(/Connector binding attached/);
    const html = container.innerHTML;
    expect(html).not.toContain("constraints_json");
    expect(html).not.toContain("connector_binding_id");
    expect(html).not.toContain("grantor_entity_id");
  });

  it("submitting the form calls create + clears purpose on success", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-twin/authority-grants`, () =>
        HttpResponse.json({ ok: true, grants: [] }),
      ),
      http.post(`${API_BASE}/otzar/my-twin/authority-grants`, () =>
        HttpResponse.json({ ok: true, grant: GRANT_FIXTURE }, { status: 201 }),
      ),
    );
    renderPage();
    const user = userEvent.setup();
    const purpose = await screen.findByTestId("grant-purpose");
    await user.type(purpose, "Draft follow-up emails for me");
    await user.click(screen.getByTestId("grant-submit"));
    // purpose textarea is cleared after success
    await screen.findByTestId("grant-purpose");
    expect((purpose as HTMLTextAreaElement).value).toBe("");
  });
});
