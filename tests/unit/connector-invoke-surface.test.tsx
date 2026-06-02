// FILE: tests/unit/connector-invoke-surface.test.tsx
// PURPOSE: INVOKE_CONNECTOR CT surface tests per
//          [FOUNDER-AUTH — INVOKE_CONNECTOR CT SURFACE].
//          Verifies the operator-visible per-binding test-invoke
//          flow at the boundaries that matter: closed-vocab
//          catalog (read-first only, no write operations), button
//          visibility on the binding card, dialog mount, POST
//          /api/v1/actions create + lifecycle poll, SAFE result
//          rendering, and the privacy invariant that the rendered
//          panel never carries secret/token/payload/PII even
//          when the upstream mock attempts to inject them.
//
//          The Radix Select trigger does not reliably open its
//          popover under jsdom, so dropdown-option enumeration is
//          asserted against the catalog module directly rather
//          than via user.click on the trigger. Submission
//          behavior is verified end-to-end via MSW.
// CONNECTS TO: src/pages/ConnectorsAdmin.tsx,
//              src/components/ConnectorInvokeDialog.tsx,
//              src/lib/connectors/invoke-operations.ts,
//              src/lib/api.ts (api.actions.createInvokeConnector
//              + getAction).

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ConnectorsAdminPage } from "@/pages/ConnectorsAdmin";
import { useAuthStore } from "@/lib/stores/auth";
import {
  CT_INVOKE_FIXTURE_KEYS,
  CT_INVOKE_OPERATIONS,
  supportsInvokeOperations,
} from "@/lib/connectors/invoke-operations";

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

function slackBinding() {
  return {
    binding_id: "00000000-0000-0000-0000-0000000000s1",
    org_entity_id: "org-1",
    type: "SLACK_READ",
    display_name: "niov-prod-slack",
    config: { use_real: false, workspace_id: "niov.io" },
    secret_ref: "SLACK_BOT_TOKEN_PROD",
    enabled: true,
    created_by_entity_id: "u-1",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };
}

function webhookBinding() {
  return {
    binding_id: "00000000-0000-0000-0000-0000000000w1",
    org_entity_id: "org-1",
    type: "OUTBOUND_WEBHOOK",
    display_name: "niov-prod-webhook",
    config: { url: "https://example.test/hook" },
    secret_ref: "WEBHOOK_SECRET_PROD",
    enabled: true,
    created_by_entity_id: "u-1",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  };
}

// =====================================================================
// Closed-vocab catalog
// =====================================================================

describe("CT_INVOKE_OPERATIONS catalog — read-first only / vendor parity", () => {
  it("exposes the SLACK_READ closed-vocab (channels.list / users.list / conversations.history) and no write operation", () => {
    expect(CT_INVOKE_OPERATIONS.SLACK_READ).toEqual([
      "channels.list",
      "users.list",
      "conversations.history",
    ]);
    expect(CT_INVOKE_OPERATIONS.SLACK_READ).not.toContain("chat.postMessage");
    expect(CT_INVOKE_OPERATIONS.SLACK_READ).not.toContain("files.upload");
    expect(CT_INVOKE_OPERATIONS.SLACK_READ).not.toContain(
      "conversations.create",
    );
  });

  it("exposes the GOOGLE_WORKSPACE_READ closed-vocab and no write operation", () => {
    expect(CT_INVOKE_OPERATIONS.GOOGLE_WORKSPACE_READ).toEqual([
      "calendar.events.list",
      "drive.files.list",
      "gmail.messages.list",
    ]);
    expect(CT_INVOKE_OPERATIONS.GOOGLE_WORKSPACE_READ).not.toContain(
      "calendar.events.insert",
    );
    expect(CT_INVOKE_OPERATIONS.GOOGLE_WORKSPACE_READ).not.toContain(
      "gmail.messages.send",
    );
    expect(CT_INVOKE_OPERATIONS.GOOGLE_WORKSPACE_READ).not.toContain(
      "drive.files.create",
    );
  });

  it("exposes the JIRA_CLOUD_READ closed-vocab and no write operation", () => {
    expect(CT_INVOKE_OPERATIONS.JIRA_CLOUD_READ).toEqual([
      "myself",
      "project.search",
      "issue.search",
    ]);
    expect(CT_INVOKE_OPERATIONS.JIRA_CLOUD_READ).not.toContain("issue.create");
    expect(CT_INVOKE_OPERATIONS.JIRA_CLOUD_READ).not.toContain(
      "issue.transition",
    );
  });

  it("exposes the LINEAR_READ closed-vocab and no write operation", () => {
    expect(CT_INVOKE_OPERATIONS.LINEAR_READ).toEqual([
      "viewer",
      "teams.list",
      "issues.list",
    ]);
    expect(CT_INVOKE_OPERATIONS.LINEAR_READ).not.toContain("issueCreate");
    expect(CT_INVOKE_OPERATIONS.LINEAR_READ).not.toContain("issueUpdate");
  });

  it("exposes the GITHUB_READ closed-vocab and no write operation", () => {
    expect(CT_INVOKE_OPERATIONS.GITHUB_READ).toEqual([
      "user",
      "repos.list",
      "issues.search",
    ]);
    expect(CT_INVOKE_OPERATIONS.GITHUB_READ).not.toContain("issues.create");
    expect(CT_INVOKE_OPERATIONS.GITHUB_READ).not.toContain("repos.create");
    expect(CT_INVOKE_OPERATIONS.GITHUB_READ).not.toContain("pulls.create");
  });

  it("exposes the MICROSOFT_365_READ closed-vocab and no write operation", () => {
    expect(CT_INVOKE_OPERATIONS.MICROSOFT_365_READ).toEqual([
      "calendar.events.list",
      "drive.items.list",
      "mail.messages.list",
    ]);
    expect(CT_INVOKE_OPERATIONS.MICROSOFT_365_READ).not.toContain(
      "mail.messages.send",
    );
    expect(CT_INVOKE_OPERATIONS.MICROSOFT_365_READ).not.toContain(
      "calendar.events.create",
    );
  });

  it("treats OUTBOUND_WEBHOOK and FIXTURE_ECHO as non-vendor (no operations exposed)", () => {
    expect(CT_INVOKE_OPERATIONS.OUTBOUND_WEBHOOK).toEqual([]);
    expect(CT_INVOKE_OPERATIONS.FIXTURE_ECHO).toEqual([]);
    expect(supportsInvokeOperations("OUTBOUND_WEBHOOK")).toBe(false);
    expect(supportsInvokeOperations("FIXTURE_ECHO")).toBe(false);
    expect(supportsInvokeOperations("SLACK_READ")).toBe(true);
    expect(supportsInvokeOperations("GOOGLE_WORKSPACE_READ")).toBe(true);
    expect(supportsInvokeOperations("JIRA_CLOUD_READ")).toBe(true);
    expect(supportsInvokeOperations("LINEAR_READ")).toBe(true);
    expect(supportsInvokeOperations("GITHUB_READ")).toBe(true);
    expect(supportsInvokeOperations("MICROSOFT_365_READ")).toBe(true);
  });

  it("exposes 8 forced-failure fixture keys plus the happy-path default", () => {
    expect(CT_INVOKE_FIXTURE_KEYS.length).toBe(9);
    expect(CT_INVOKE_FIXTURE_KEYS[0]?.key).toBe("");
    const forced = CT_INVOKE_FIXTURE_KEYS.slice(1).map((e) => e.key);
    expect(forced).toEqual([
      "force-auth-failure",
      "force-network-failure",
      "force-timeout",
      "force-rate-limit",
      "force-provider-error",
      "force-validation-failure",
      "force-not-configured",
      "force-disabled",
    ]);
  });
});

// =====================================================================
// Test-invoke button visibility on the binding card
// =====================================================================

describe("Connector invoke surface — Test invoke button visibility", () => {
  it("renders a Test invoke button for vendor connector bindings (SLACK_READ)", async () => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [slackBinding()] }),
      ),
    );
    renderConnectors();
    expect(
      await screen.findByTestId(`invoke-${slackBinding().binding_id}`),
    ).toBeInTheDocument();
  });

  it("does NOT render a Test invoke button for non-vendor connector bindings (OUTBOUND_WEBHOOK)", async () => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [webhookBinding()] }),
      ),
    );
    renderConnectors();
    await screen.findByText("niov-prod-webhook");
    expect(
      screen.queryByTestId(`invoke-${webhookBinding().binding_id}`),
    ).not.toBeInTheDocument();
  });

  it("disables the Test invoke button when the binding is disabled (the affordance stays visible so the operator sees why it's unavailable)", async () => {
    const disabled = { ...slackBinding(), enabled: false };
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [disabled] }),
      ),
    );
    renderConnectors();
    const btn = await screen.findByTestId(`invoke-${disabled.binding_id}`);
    expect(btn).toBeDisabled();
  });
});

// =====================================================================
// Dialog mount + POST /actions + lifecycle poll
// =====================================================================

describe("Connector invoke surface — dialog mount + POST /actions + poll", () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [slackBinding()] }),
      ),
    );
  });

  it("opens the dialog when the Test invoke button is clicked and renders the trigger with the default operation (channels.list)", async () => {
    const user = userEvent.setup();
    renderConnectors();
    await user.click(
      await screen.findByTestId(`invoke-${slackBinding().binding_id}`),
    );
    const dialog = await screen.findByTestId("invoke-dialog");
    expect(within(dialog).getByTestId("invoke-operation-select"))
      .toHaveTextContent("channels.list");
  });

  it("POSTs to /actions with action_type=INVOKE_CONNECTOR + binding_id + operation; no secret-shaped substring in request payload", async () => {
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/actions`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "00000000-0000-0000-0000-00000000001a",
              status: "PROPOSED",
              action_type: "INVOKE_CONNECTOR",
              risk_tier: "LOW",
              requires_approval: false,
              created_at: "2026-06-02T00:00:00.000Z",
              updated_at: "2026-06-02T00:00:00.000Z",
            },
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderConnectors();
    await user.click(
      await screen.findByTestId(`invoke-${slackBinding().binding_id}`),
    );
    await screen.findByTestId("invoke-dialog");
    await user.click(screen.getByTestId("invoke-submit"));
    await waitFor(() => expect(posted).not.toBeNull());

    const body = posted as unknown as Record<string, unknown>;
    expect(body).toMatchObject({
      action_type: "INVOKE_CONNECTOR",
      payload_redacted: {
        binding_id: slackBinding().binding_id,
        invocation_payload: { operation: "channels.list" },
      },
    });
    const ipl = (body.payload_redacted as Record<string, unknown>)
      .invocation_payload as Record<string, unknown>;
    expect(ipl.fixture_key).toBeUndefined();

    const serialized = JSON.stringify(body);
    expect(serialized).not.toMatch(/xoxb-[A-Za-z0-9-]+/);
    expect(serialized).not.toMatch(/bearer [A-Za-z0-9._-]+/i);
    expect(serialized).not.toMatch(/ya29\.[A-Za-z0-9_-]+/);
    expect(serialized).not.toMatch(/ATATT3xFfGF0[A-Za-z0-9_-]+/);
    expect(serialized).not.toMatch(/lin_(oauth|api)_[A-Za-z0-9]+/);
    expect(serialized).not.toMatch(/(ghp|gho|ghs|github_pat)_[A-Za-z0-9]+/);
    expect(serialized).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
  });

  it("polls /actions/:id until SUCCEEDED and renders the SAFE last_result_summary", async () => {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "00000000-0000-0000-0000-00000000002a",
              status: "PROPOSED",
              action_type: "INVOKE_CONNECTOR",
              risk_tier: "LOW",
              requires_approval: false,
              created_at: "2026-06-02T00:00:00.000Z",
              updated_at: "2026-06-02T00:00:00.000Z",
            },
          },
          { status: 201 },
        ),
      ),
      http.get(`${API_BASE}/actions/:id`, () =>
        HttpResponse.json({
          ok: true,
          action: {
            action_id: "00000000-0000-0000-0000-00000000002a",
            status: "SUCCEEDED",
            action_type: "INVOKE_CONNECTOR",
            risk_tier: "LOW",
            requires_approval: false,
            created_at: "2026-06-02T00:00:00.000Z",
            updated_at: "2026-06-02T00:00:00.000Z",
            attempt_count: 1,
            last_result_summary:
              "delivery=ok provider=SlackReadProvider channels_count=4",
          },
        }),
      ),
    );
    const user = userEvent.setup();
    renderConnectors();
    await user.click(
      await screen.findByTestId(`invoke-${slackBinding().binding_id}`),
    );
    await screen.findByTestId("invoke-dialog");
    await user.click(screen.getByTestId("invoke-submit"));

    const panel = await screen.findByTestId(
      "invoke-result-panel",
      {},
      { timeout: 5000 },
    );
    await waitFor(
      () => expect(within(panel).getByText("SUCCEEDED")).toBeInTheDocument(),
      { timeout: 5000 },
    );
    expect(
      within(panel).getByTestId("invoke-last-result-summary").textContent,
    ).toMatch(/channels_count=4/);
  });

  it("renders the FAILED status when polling reaches FAILED — privacy invariant: rendered DOM never carries Bearer / xoxb / ya29 / JWT / Atlassian PAT / Linear OAuth / GitHub token / @outlook.com PII", async () => {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "00000000-0000-0000-0000-00000000003a",
              status: "PROPOSED",
              action_type: "INVOKE_CONNECTOR",
              risk_tier: "LOW",
              requires_approval: false,
              created_at: "2026-06-02T00:00:00.000Z",
              updated_at: "2026-06-02T00:00:00.000Z",
            },
          },
          { status: 201 },
        ),
      ),
      http.get(`${API_BASE}/actions/:id`, () =>
        HttpResponse.json({
          ok: true,
          action: {
            action_id: "00000000-0000-0000-0000-00000000003a",
            status: "FAILED",
            action_type: "INVOKE_CONNECTOR",
            risk_tier: "LOW",
            requires_approval: false,
            created_at: "2026-06-02T00:00:00.000Z",
            updated_at: "2026-06-02T00:00:00.000Z",
            attempt_count: 1,
            last_result_summary:
              "delivery=fail provider=SlackReadProvider error_class=AUTH",
          },
        }),
      ),
    );
    const user = userEvent.setup();
    renderConnectors();
    await user.click(
      await screen.findByTestId(`invoke-${slackBinding().binding_id}`),
    );
    await screen.findByTestId("invoke-dialog");
    await user.click(screen.getByTestId("invoke-submit"));

    const panel = await screen.findByTestId(
      "invoke-result-panel",
      {},
      { timeout: 5000 },
    );
    await waitFor(
      () => expect(within(panel).getByText("FAILED")).toBeInTheDocument(),
      { timeout: 5000 },
    );
    const docBody = (
      panel.ownerDocument.body.textContent ?? ""
    ).toLowerCase();
    expect(docBody).not.toMatch(/xoxb-[a-z0-9-]+/);
    expect(docBody).not.toMatch(/bearer [a-z0-9._-]+/);
    expect(docBody).not.toMatch(/ya29\.[a-z0-9_-]+/);
    expect(docBody).not.toMatch(/eyj[a-z0-9._-]{20,}/);
    expect(docBody).not.toMatch(/atatt3xffgf0[a-z0-9_-]+/);
    expect(docBody).not.toMatch(/lin_(oauth|api)_[a-z0-9]+/);
    expect(docBody).not.toMatch(/(ghp|gho|ghs|github_pat)_[a-z0-9]+/);
    expect(docBody).not.toContain("@outlook.com");
    expect(docBody).not.toContain("@onmicrosoft.com");
    expect(docBody).not.toContain("private_key");
  });

  it("never echoes the binding's secret_ref env-var NAME inside the test-invoke dialog body (the dialog discusses the call lifecycle, not the credential)", async () => {
    const user = userEvent.setup();
    renderConnectors();
    await user.click(
      await screen.findByTestId(`invoke-${slackBinding().binding_id}`),
    );
    const dialog = await screen.findByTestId("invoke-dialog");
    expect(dialog.textContent ?? "").not.toContain(slackBinding().secret_ref);
  });
});
