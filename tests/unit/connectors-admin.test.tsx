// FILE: tests/unit/connectors-admin.test.tsx
// PURPOSE: Page tests for the Section 4 ConnectorBinding admin
//          surface at /connectors. Verifies:
//          - /connectors registers in the main nav
//          - shell + doctrine + privacy notice render
//          - empty bindings list renders the empty-state CTA
//          - one binding rendered with enable/disable + soft-delete
//            controls bound to the API client
//          - secret_ref env-var NAME is rendered; resolved bot token
//            (xoxb-*) is NEVER rendered
//          - "Read-first" badge appears on every binding
//          - register form validates display_name + secret_ref
//          - forbidden UI copy guard (no surveillance / scoring /
//            guaranteed-compliance / regulator-approved / etc.)
// CONNECTS TO: src/pages/ConnectorsAdmin.tsx,
//              src/lib/connectors/{types,data}.ts,
//              src/lib/api.ts (api.connectors namespace),
//              src/lib/nav.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ConnectorsAdminPage } from "@/pages/ConnectorsAdmin";
import { NAV } from "@/lib/nav";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "admin@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

function renderConnectors() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConnectorsAdminPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

// ────────────────────────────────────────────────────────────────
// Forbidden UI copy guard. Each phrase must NEVER appear as a
// positive claim on the page. Matches substring at lower-case.
// ────────────────────────────────────────────────────────────────
const FORBIDDEN_UI_COPY = [
  "subscription active",
  "payment method required",
  "invoice generated",
  "feature enabled",
  "permission granted",
  "connector activated",
  "workflow execution enabled",
  "guaranteed compliant",
  "regulator approved",
  "no fine risk",
  "employee score",
  "manager surveillance",
  "psychological profile",
  "unrestricted write access",
  "auto-approved",
];

describe("Connectors — nav", () => {
  it("registers /connectors in the main nav", () => {
    const entry = NAV.find((n) => n.to === "/connectors");
    expect(entry).toBeDefined();
    expect(entry?.label).toBe("Connectors");
  });
});

describe("Connectors — page shell", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [] }),
      ),
    );
  });

  it("renders the Connectors page title", async () => {
    renderConnectors();
    expect(
      screen.getByRole("heading", { name: /Connectors/i, level: 1 }),
    ).toBeInTheDocument();
  });

  it("renders the privacy notice about env-var NAME vs resolved value", async () => {
    renderConnectors();
    expect(
      screen.getAllByText(
        /env-var NAME on the deployment host\. The resolved env-var value/i,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("renders the canonical Founder doctrine line", async () => {
    renderConnectors();
    expect(
      screen.getAllByText(
        /Billing entitles availability; Foundation governance authorizes activation/i,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("renders the SLACK_READ type in the registry card", async () => {
    renderConnectors();
    expect(screen.getByTestId("type-SLACK_READ")).toBeInTheDocument();
    expect(screen.getByTestId("type-OUTBOUND_WEBHOOK")).toBeInTheDocument();
  });
});

describe("Connectors — empty state", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [] }),
      ),
    );
  });

  it("renders the empty-state CTA when no bindings exist", async () => {
    renderConnectors();
    expect(await screen.findByTestId("empty-state")).toHaveTextContent(
      /No bindings registered yet/i,
    );
  });
});

describe("Connectors — one binding rendered", () => {
  const binding = {
    binding_id: "00000000-0000-0000-0000-000000000001",
    org_entity_id: "11111111-1111-1111-1111-111111111111",
    type: "SLACK_READ",
    display_name: "niov-prod-slack",
    config: { use_real: false, workspace_id: "T_TEST" },
    secret_ref: "SLACK_BOT_TOKEN_PROD",
    enabled: true,
    created_by_entity_id: "22222222-2222-2222-2222-222222222222",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };

  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [binding] }),
      ),
    );
  });

  it("renders the binding by testid", async () => {
    renderConnectors();
    expect(
      await screen.findByTestId(`binding-${binding.binding_id}`),
    ).toBeInTheDocument();
  });

  it("renders the secret env-var NAME and the never-displayed disclaimer", async () => {
    renderConnectors();
    const card = await screen.findByTestId(`binding-${binding.binding_id}`);
    // env-var NAME is the only thing the API returns + page shows
    expect(within(card).getByText("SLACK_BOT_TOKEN_PROD")).toBeInTheDocument();
    expect(
      within(card).getByText(/env-var NAME only; resolved value never displayed/i),
    ).toBeInTheDocument();
    // A concrete resolved bot-token value would match
    // /xoxb-\d+-\d+-[a-z0-9]+/i. The page renders OAuth-model
    // documentation ("Bot-token (xoxb-*)") which is education, not
    // a leak. We assert NO concrete bot-token pattern is present.
    const allText =
      (await screen.findByText(/niov-prod-slack/)).ownerDocument.body
        .textContent ?? "";
    expect(allText).not.toMatch(/xoxb-[A-Za-z0-9]{4,}-[A-Za-z0-9]{4,}/);
    expect(allText.toLowerCase()).not.toContain("bearer ");
  });

  it("shows the read-first badge on every binding", async () => {
    renderConnectors();
    const card = await screen.findByTestId(`binding-${binding.binding_id}`);
    expect(
      within(card).getByText(/Read-first \(no writes at C2\)/i),
    ).toBeInTheDocument();
  });

  it("offers an enable/disable toggle and a soft-delete control", async () => {
    renderConnectors();
    expect(
      await screen.findByTestId(`toggle-${binding.binding_id}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`delete-${binding.binding_id}`),
    ).toBeInTheDocument();
  });

  it("invokes PATCH on the toggle and refreshes the list", async () => {
    let patched = false;
    server.use(
      http.patch(
        `${API_BASE}/org/connectors/${binding.binding_id}`,
        async ({ request }) => {
          const body = (await request.json()) as { enabled?: boolean };
          patched = body.enabled === false;
          return HttpResponse.json({
            ok: true,
            binding: { ...binding, enabled: false },
            audit_event_id: "ae-1",
          });
        },
      ),
    );
    const user = userEvent.setup();
    renderConnectors();
    const toggle = await screen.findByTestId(`toggle-${binding.binding_id}`);
    await user.click(toggle);
    await waitFor(() => expect(patched).toBe(true));
  });

  it("invokes DELETE on the soft-delete control", async () => {
    let deleted = false;
    server.use(
      http.delete(
        `${API_BASE}/org/connectors/${binding.binding_id}`,
        () => {
          deleted = true;
          return HttpResponse.json({
            ok: true,
            binding_id: binding.binding_id,
            audit_event_id: "ae-2",
          });
        },
      ),
    );
    const user = userEvent.setup();
    renderConnectors();
    const del = await screen.findByTestId(`delete-${binding.binding_id}`);
    await user.click(del);
    await waitFor(() => expect(deleted).toBe(true));
  });
});

describe("Connectors — register form", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [] }),
      ),
    );
  });

  it("submit is disabled until display_name + secret_ref are filled", async () => {
    renderConnectors();
    const submit = await screen.findByTestId("register-submit");
    expect(submit).toBeDisabled();
  });

  it("posts to the register endpoint when fields are valid", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/org/connectors`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            binding: {
              binding_id: "new-binding-id",
              org_entity_id: "org-1",
              type: "SLACK_READ",
              display_name: "niov-dev-slack",
              config: { use_real: false, workspace_id: "niov-dev-slack" },
              secret_ref: "SLACK_BOT_TOKEN_DEV",
              enabled: true,
              created_by_entity_id: "user-1",
              created_at: "2026-06-01T00:00:00.000Z",
              updated_at: "2026-06-01T00:00:00.000Z",
            },
            audit_event_id: "ae-3",
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderConnectors();
    await user.type(
      await screen.findByTestId("display-name-input"),
      "niov-dev-slack",
    );
    await user.type(
      screen.getByTestId("secret-ref-input"),
      "SLACK_BOT_TOKEN_DEV",
    );
    await user.click(screen.getByTestId("register-submit"));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({
      type: "SLACK_READ",
      display_name: "niov-dev-slack",
      secret_ref: "SLACK_BOT_TOKEN_DEV",
    });
  });
});

describe("Connectors — GOOGLE_WORKSPACE_READ C3 admin path", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [] }),
      ),
    );
  });

  it("renders the GOOGLE_WORKSPACE_READ type in the registry card", async () => {
    renderConnectors();
    expect(
      await screen.findByTestId("type-GOOGLE_WORKSPACE_READ"),
    ).toBeInTheDocument();
  });

  it("describes the C3 read-only scope (Calendar + Drive metadata + Gmail IDs)", async () => {
    renderConnectors();
    const tile = await screen.findByTestId("type-GOOGLE_WORKSPACE_READ");
    expect(within(tile).getByText(/Google Workspace/i)).toBeInTheDocument();
    expect(within(tile).getByText(/Calendar/i)).toBeInTheDocument();
    expect(within(tile).getByText(/Drive/i)).toBeInTheDocument();
    expect(within(tile).getByText(/Gmail/i)).toBeInTheDocument();
  });

  it("posts a GOOGLE_WORKSPACE_READ binding with workspace_domain config + access-token secret_ref", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/org/connectors`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            binding: {
              binding_id: "new-google-binding",
              org_entity_id: "org-1",
              type: "GOOGLE_WORKSPACE_READ",
              display_name: "niov-dev-google",
              config: { use_real: false, workspace_domain: "niov-dev-google" },
              secret_ref: "GOOGLE_ACCESS_TOKEN_DEV",
              enabled: true,
              created_by_entity_id: "user-1",
              created_at: "2026-06-01T00:00:00.000Z",
              updated_at: "2026-06-01T00:00:00.000Z",
            },
            audit_event_id: "ae-google-1",
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderConnectors();
    // Switch the type selector to Google Workspace
    const select = await screen.findByTestId("connector-type-select");
    await user.click(select);
    await user.click(
      await screen.findByRole("option", { name: /Google Workspace/i }),
    );
    await user.type(
      screen.getByTestId("display-name-input"),
      "niov-dev-google",
    );
    await user.type(
      screen.getByTestId("secret-ref-input"),
      "GOOGLE_ACCESS_TOKEN_DEV",
    );
    await user.click(screen.getByTestId("register-submit"));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({
      type: "GOOGLE_WORKSPACE_READ",
      display_name: "niov-dev-google",
      secret_ref: "GOOGLE_ACCESS_TOKEN_DEV",
      config: {
        use_real: false,
        workspace_domain: "niov-dev-google",
      },
    });
  });
});

describe("Connectors — GOOGLE_WORKSPACE_READ binding render", () => {
  const googleBinding = {
    binding_id: "00000000-0000-0000-0000-00000000000g",
    org_entity_id: "11111111-1111-1111-1111-111111111111",
    type: "GOOGLE_WORKSPACE_READ",
    display_name: "niov-prod-google",
    config: { use_real: false, workspace_domain: "niov.io" },
    secret_ref: "GOOGLE_ACCESS_TOKEN_PROD",
    enabled: true,
    created_by_entity_id: "22222222-2222-2222-2222-222222222222",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };

  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [googleBinding] }),
      ),
    );
  });

  it("renders the Google binding by testid with C3 read-first badge", async () => {
    renderConnectors();
    const card = await screen.findByTestId(`binding-${googleBinding.binding_id}`);
    expect(within(card).getByText("niov-prod-google")).toBeInTheDocument();
    expect(
      within(card).getByText(/Read-first \(no writes at C3\)/i),
    ).toBeInTheDocument();
  });

  it("renders the GOOGLE_ACCESS_TOKEN env-var NAME but NEVER a concrete ya29.* token", async () => {
    renderConnectors();
    const card = await screen.findByTestId(`binding-${googleBinding.binding_id}`);
    expect(within(card).getByText("GOOGLE_ACCESS_TOKEN_PROD")).toBeInTheDocument();
    // A concrete Google OAuth access token starts with ya29.* per
    // Google docs; the page renders the env-var NAME only.
    const docBody = (await screen.findByText(/niov-prod-google/)).ownerDocument
      .body.textContent ?? "";
    expect(docBody).not.toMatch(/ya29\.[A-Za-z0-9_-]{8,}/);
    // Service-account private-key JSON snippet must NEVER appear
    expect(docBody).not.toMatch(/-----BEGIN PRIVATE KEY-----/);
    expect(docBody).not.toMatch(/"private_key":/);
    expect(docBody.toLowerCase()).not.toContain("bearer ");
  });
});

describe("Connectors — forbidden UI copy guard", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({
          ok: true,
          bindings: [
            {
              binding_id: "bind-1",
              org_entity_id: "org-1",
              type: "SLACK_READ",
              display_name: "demo",
              config: {},
              secret_ref: "SLACK_BOT_TOKEN_DEMO",
              enabled: true,
              created_by_entity_id: "u-1",
              created_at: "2026-06-01T00:00:00.000Z",
              updated_at: "2026-06-01T00:00:00.000Z",
            },
          ],
        }),
      ),
    );
  });

  it.each(FORBIDDEN_UI_COPY)(
    "does NOT contain the forbidden phrase %s as a positive claim",
    async (phrase) => {
      const { container } = renderConnectors();
      // Wait for the list to render
      await screen.findByTestId("bindings-section");
      const text = (container.textContent ?? "").toLowerCase();
      expect(text).not.toContain(phrase.toLowerCase());
    },
  );
});

// ────────────────────────────────────────────────────────────────
// CT C4-A — Jira Cloud admin path tests. Mirrors the C3 Google
// Workspace + C2 Slack admin path tests verbatim. The Foundation
// runtime is LIVE at PR #207 (RECOMMENDATION_READY → RUNTIME_READY);
// these tests verify the CT path graduates the operator-facing
// surface so admins can self-serve JIRA_CLOUD_READ binding
// registration.
// ────────────────────────────────────────────────────────────────

describe("Connectors — JIRA_CLOUD_READ C4-A admin path", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [] }),
      ),
    );
  });

  it("renders the JIRA_CLOUD_READ type in the registry card", async () => {
    renderConnectors();
    expect(
      await screen.findByTestId("type-JIRA_CLOUD_READ"),
    ).toBeInTheDocument();
  });

  it("describes the C4-A read-only scope (myself + project.search + issue.search)", async () => {
    renderConnectors();
    const tile = await screen.findByTestId("type-JIRA_CLOUD_READ");
    // "Jira Cloud" appears in both the title and description; assert
    // at least one match rather than uniqueness.
    expect(within(tile).getAllByText(/Jira Cloud/i).length).toBeGreaterThan(0);
    expect(within(tile).getByText(/myself/)).toBeInTheDocument();
    expect(within(tile).getByText(/project\.search/)).toBeInTheDocument();
    expect(within(tile).getByText(/issue\.search/)).toBeInTheDocument();
    // The catalog short description must surface the
    // status-category-aggregates-only framing to keep operators
    // honest about what the connector returns.
    expect(within(tile).getByText(/status-category/i)).toBeInTheDocument();
  });

  it("posts a JIRA_CLOUD_READ binding with cloud_id config + access-token secret_ref", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/org/connectors`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            binding: {
              binding_id: "new-jira-binding",
              org_entity_id: "org-1",
              type: "JIRA_CLOUD_READ",
              display_name: "niov-dev-jira",
              config: { use_real: false, cloud_id: "niov-dev-jira" },
              secret_ref: "JIRA_ACCESS_TOKEN_DEV",
              enabled: true,
              created_by_entity_id: "user-1",
              created_at: "2026-06-01T00:00:00.000Z",
              updated_at: "2026-06-01T00:00:00.000Z",
            },
            audit_event_id: "ae-jira-1",
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderConnectors();
    // Switch the type selector to Jira Cloud
    const select = await screen.findByTestId("connector-type-select");
    await user.click(select);
    await user.click(
      await screen.findByRole("option", { name: /Jira Cloud/i }),
    );
    await user.type(
      screen.getByTestId("display-name-input"),
      "niov-dev-jira",
    );
    await user.type(
      screen.getByTestId("secret-ref-input"),
      "JIRA_ACCESS_TOKEN_DEV",
    );
    await user.click(screen.getByTestId("register-submit"));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({
      type: "JIRA_CLOUD_READ",
      display_name: "niov-dev-jira",
      secret_ref: "JIRA_ACCESS_TOKEN_DEV",
      config: {
        use_real: false,
        cloud_id: "niov-dev-jira",
      },
    });
  });
});

describe("Connectors — JIRA_CLOUD_READ binding render", () => {
  const jiraBinding = {
    binding_id: "00000000-0000-0000-0000-00000000000j",
    org_entity_id: "11111111-1111-1111-1111-111111111111",
    type: "JIRA_CLOUD_READ",
    display_name: "niov-prod-jira",
    config: {
      use_real: false,
      cloud_id: "00000000-1111-2222-3333-444444444444",
    },
    secret_ref: "JIRA_ACCESS_TOKEN_PROD",
    enabled: true,
    created_by_entity_id: "22222222-2222-2222-2222-222222222222",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };

  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [jiraBinding] }),
      ),
    );
  });

  it("renders the Jira binding by testid with C4-A read-first badge", async () => {
    renderConnectors();
    const card = await screen.findByTestId(`binding-${jiraBinding.binding_id}`);
    expect(within(card).getByText("niov-prod-jira")).toBeInTheDocument();
    expect(
      within(card).getByText(/Read-first \(no writes at C4-A\)/i),
    ).toBeInTheDocument();
  });

  it("renders the JIRA_ACCESS_TOKEN env-var NAME but NEVER a concrete Atlassian PAT or Bearer token", async () => {
    renderConnectors();
    const card = await screen.findByTestId(`binding-${jiraBinding.binding_id}`);
    expect(
      within(card).getByText("JIRA_ACCESS_TOKEN_PROD"),
    ).toBeInTheDocument();
    const docBody = (await screen.findByText(/niov-prod-jira/)).ownerDocument
      .body.textContent ?? "";
    // Atlassian PAT format ATATT3xFfGF0* must NEVER appear on the page.
    expect(docBody).not.toMatch(/ATATT3xFfGF0/);
    // Service-account private-key JSON snippet must NEVER appear.
    expect(docBody).not.toMatch(/-----BEGIN PRIVATE KEY-----/);
    expect(docBody).not.toMatch(/"private_key":/);
    expect(docBody.toLowerCase()).not.toContain("bearer ");
    // Note: a "no issue-key (TEAM-NNN)" guard at this surface
    // would false-positive on legitimate ADR-XXXX references in
    // the page's doctrine prose. The provider itself enforces the
    // no-issue-key rule structurally (tests/unit/c4-a-jira-cloud-
    // read-provider.test.ts privacy invariant suite); at the CT
    // tier the operator-visible page never receives raw issue
    // data so the structural guarantee carries through.
  });
});

// ────────────────────────────────────────────────────────────────
// CT C4-B — Linear admin path tests. Mirrors the C4-A Jira Cloud +
// C3 Google Workspace + C2 Slack admin path tests verbatim. The
// Foundation runtime is LIVE at PR #209 (RECOMMENDATION_READY →
// RUNTIME_READY); these tests verify the CT path graduates the
// operator-facing surface so admins can self-serve LINEAR_READ
// binding registration.
// ────────────────────────────────────────────────────────────────

describe("Connectors — LINEAR_READ C4-B admin path", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [] }),
      ),
    );
  });

  it("renders the LINEAR_READ type in the registry card", async () => {
    renderConnectors();
    expect(
      await screen.findByTestId("type-LINEAR_READ"),
    ).toBeInTheDocument();
  });

  it("describes the C4-B read-only scope (viewer + teams.list + issues.list via GraphQL)", async () => {
    renderConnectors();
    const tile = await screen.findByTestId("type-LINEAR_READ");
    // "Linear" appears in both the title and description; assert
    // at least one match rather than uniqueness.
    expect(within(tile).getAllByText(/Linear/i).length).toBeGreaterThan(0);
    expect(within(tile).getByText(/viewer/)).toBeInTheDocument();
    expect(within(tile).getByText(/teams\.list/)).toBeInTheDocument();
    expect(within(tile).getByText(/issues\.list/)).toBeInTheDocument();
    // The catalog short description must surface state-type
    // aggregates framing so operators understand what the
    // connector returns (counts only, not raw issue identifiers).
    expect(within(tile).getByText(/state-type/i)).toBeInTheDocument();
  });

  it("posts a LINEAR_READ binding with use_real config + access-token secret_ref", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/org/connectors`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            binding: {
              binding_id: "new-linear-binding",
              org_entity_id: "org-1",
              type: "LINEAR_READ",
              display_name: "niov-dev-linear",
              config: { use_real: false },
              secret_ref: "LINEAR_ACCESS_TOKEN_DEV",
              enabled: true,
              created_by_entity_id: "user-1",
              created_at: "2026-06-01T00:00:00.000Z",
              updated_at: "2026-06-01T00:00:00.000Z",
            },
            audit_event_id: "ae-linear-1",
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderConnectors();
    // Switch the type selector to Linear
    const select = await screen.findByTestId("connector-type-select");
    await user.click(select);
    await user.click(
      await screen.findByRole("option", { name: /Linear/i }),
    );
    await user.type(
      screen.getByTestId("display-name-input"),
      "niov-dev-linear",
    );
    await user.type(
      screen.getByTestId("secret-ref-input"),
      "LINEAR_ACCESS_TOKEN_DEV",
    );
    await user.click(screen.getByTestId("register-submit"));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toMatchObject({
      type: "LINEAR_READ",
      display_name: "niov-dev-linear",
      secret_ref: "LINEAR_ACCESS_TOKEN_DEV",
      config: {
        use_real: false,
      },
    });
    // C4-B Linear OAuth tokens are workspace-bound by construction;
    // the config shape is the minimal {use_real} pair — no
    // cloud_id / workspace_id / workspace_domain. The outer
    // expect(posted).not.toBeNull() above narrows posted at runtime;
    // we cast through unknown to satisfy the strict typecheck.
    const config = (posted as unknown as { config: Record<string, unknown> })
      .config;
    expect(config).not.toHaveProperty("cloud_id");
    expect(config).not.toHaveProperty("workspace_id");
    expect(config).not.toHaveProperty("workspace_domain");
  });
});

describe("Connectors — LINEAR_READ binding render", () => {
  const linearBinding = {
    binding_id: "00000000-0000-0000-0000-00000000000l",
    org_entity_id: "11111111-1111-1111-1111-111111111111",
    type: "LINEAR_READ",
    display_name: "niov-prod-linear",
    config: { use_real: false },
    secret_ref: "LINEAR_ACCESS_TOKEN_PROD",
    enabled: true,
    created_by_entity_id: "22222222-2222-2222-2222-222222222222",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };

  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [linearBinding] }),
      ),
    );
  });

  it("renders the Linear binding by testid with C4-B read-first badge", async () => {
    renderConnectors();
    const card = await screen.findByTestId(`binding-${linearBinding.binding_id}`);
    expect(within(card).getByText("niov-prod-linear")).toBeInTheDocument();
    expect(
      within(card).getByText(/Read-first \(no writes at C4-B\)/i),
    ).toBeInTheDocument();
  });

  it("renders the LINEAR_ACCESS_TOKEN env-var NAME but NEVER a concrete Linear OAuth / API key / Bearer token", async () => {
    renderConnectors();
    const card = await screen.findByTestId(`binding-${linearBinding.binding_id}`);
    expect(
      within(card).getByText("LINEAR_ACCESS_TOKEN_PROD"),
    ).toBeInTheDocument();
    const docBody = (await screen.findByText(/niov-prod-linear/)).ownerDocument
      .body.textContent ?? "";
    // Linear OAuth tokens follow lin_oauth_* / lin_api_* per Linear
    // developer docs; both must NEVER appear on the page.
    expect(docBody).not.toMatch(/lin_oauth_/i);
    expect(docBody).not.toMatch(/lin_api_/i);
    // Service-account private-key JSON snippet must NEVER appear.
    expect(docBody).not.toMatch(/-----BEGIN PRIVATE KEY-----/);
    expect(docBody).not.toMatch(/"private_key":/);
    expect(docBody.toLowerCase()).not.toContain("bearer ");
  });
});
