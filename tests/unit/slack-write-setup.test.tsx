// FILE: tests/unit/slack-write-setup.test.tsx
// PURPOSE: PROD-UX-P0F — the admin connects governed Slack posting FROM THE
//          UI (no terminal): the setup card registers the Slice-F
//          SLACK_WRITE binding through POST /work-os/connector-bindings/
//          slack-write; an already-connected org sees the idempotent truth;
//          a flag-off deployment sees the honest disabled state (never a
//          crash); an existing enabled binding renders as Connected with no
//          duplicate form. The blocked-work count only appears when the
//          blind-spots feed really carries Slack-blocked items.
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ConnectorsAdminPage } from "@/pages/ConnectorsAdmin";
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

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConnectorsAdminPage />
    </QueryClientProvider>,
  );
}

function useBindings(bindings: unknown[]) {
  server.use(
    http.get(`${API_BASE}/org/connectors`, () =>
      HttpResponse.json({ ok: true, bindings }),
    ),
    http.get(`${API_BASE}/work-os/blind-spots`, () =>
      HttpResponse.json({ ok: true, items: [] }),
    ),
  );
}

beforeEach(() => setAuth());

describe("Slack posting setup (P0F)", () => {
  it("connects governed Slack posting from the UI and reports success", async () => {
    useBindings([]);
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/work-os/connector-bindings/slack-write`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ok: true,
          created: true,
          binding_id: "00000000-0000-0000-0000-00000000abcd",
          type: "SLACK_WRITE",
          audit_event_id: "aud-1",
        });
      }),
    );
    renderPage();
    await userEvent.type(
      await screen.findByTestId("slack-write-channel-input"),
      "C0123456789",
    );
    await userEvent.click(screen.getByTestId("slack-write-connect"));
    await waitFor(() => expect(posted).not.toBeNull());
    expect(posted).toEqual({ default_channel: "C0123456789" });
    expect(await screen.findByTestId("slack-write-notice")).toHaveTextContent(
      /Slack posting is connected/i,
    );
  });

  it("idempotent re-connect reports 'already connected' honestly", async () => {
    useBindings([]);
    server.use(
      http.post(`${API_BASE}/work-os/connector-bindings/slack-write`, () =>
        HttpResponse.json({
          ok: true,
          created: false,
          binding_id: "00000000-0000-0000-0000-00000000abcd",
          type: "SLACK_WRITE",
        }),
      ),
    );
    renderPage();
    await userEvent.type(
      await screen.findByTestId("slack-write-channel-input"),
      "C0123456789",
    );
    await userEvent.click(screen.getByTestId("slack-write-connect"));
    expect(await screen.findByTestId("slack-write-notice")).toHaveTextContent(
      /already connected — nothing changed/i,
    );
  });

  it("a flag-off deployment shows the honest disabled state — no crash, no fake success", async () => {
    useBindings([]);
    server.use(
      http.post(`${API_BASE}/work-os/connector-bindings/slack-write`, () =>
        HttpResponse.json({ ok: false, code: "FEATURE_DISABLED" }, { status: 404 }),
      ),
    );
    renderPage();
    await userEvent.type(
      await screen.findByTestId("slack-write-channel-input"),
      "C0123456789",
    );
    await userEvent.click(screen.getByTestId("slack-write-connect"));
    expect(await screen.findByTestId("slack-write-notice")).toHaveTextContent(
      /isn't enabled for this deployment yet/i,
    );
  });

  it("an existing enabled SLACK_WRITE binding renders as Connected (no duplicate form)", async () => {
    useBindings([
      {
        binding_id: "00000000-0000-0000-0000-00000000abcd",
        type: "SLACK_WRITE",
        display_name: "Slack (governed write-back)",
        enabled: true,
        secret_ref: "SLACK_BOT_TOKEN",
        config: { use_real: true, default_channel: "C0123456789" },
        created_at: "2026-07-01T00:00:00.000Z",
        updated_at: "2026-07-01T00:00:00.000Z",
      },
    ]);
    renderPage();
    expect(await screen.findByTestId("slack-write-connected")).toHaveTextContent(
      /Connected — Otzar can post to Slack once each message is approved/i,
    );
    expect(screen.queryByTestId("slack-write-channel-input")).toBeNull();
  });

  it("shows the REAL count of work items blocked on Slack setup (and no claim when none)", async () => {
    server.use(
      http.get(`${API_BASE}/org/connectors`, () =>
        HttpResponse.json({ ok: true, bindings: [] }),
      ),
      http.get(`${API_BASE}/work-os/blind-spots`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            { ledger_entry_id: "l1", execution_plan: { requiredConnector: "SLACK", capabilityState: "not_connected" } },
            { ledger_entry_id: "l2", execution_plan: { requiredConnector: "SLACK", capabilityState: "available_needs_admin_auth" } },
            { ledger_entry_id: "l3", execution_plan: { requiredConnector: "SLACK", capabilityState: "available_and_authorized" } },
            { ledger_entry_id: "l4", execution_plan: { requiredConnector: "JIRA", capabilityState: "not_connected" } },
          ],
        }),
      ),
    );
    renderPage();
    expect(await screen.findByTestId("slack-write-blocked-count")).toHaveTextContent(
      /2 work items are waiting on this connection/i,
    );
  });
});
