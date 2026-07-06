// FILE: tests/unit/data-flow.test.tsx
// PURPOSE: [GAP-U SLICE-3] the per-source data-flow trust panel: honest
//          status per connector state (connected ≠ ingesting), the always-
//          true rows (manual comms, external context, memory boundary),
//          the ownership/portability doctrine on every render, leak sweep
//          (no ids/enums/tokens), overclaim sweep (no ambient/sync/
//          retention-configured/portability claims), and GET-only loading.
// CONNECTS TO: src/lib/setup/data-flow.ts, src/pages/DataFlow.tsx.

import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { DataFlowPage } from "@/pages/DataFlow";
import { deriveDataFlows } from "@/lib/setup/data-flow";
import type { OAuthStatusRow } from "@/lib/types/foundation";

const API = "http://localhost:3000/api/v1";

function provider(slug: string, name: string, status: string): OAuthStatusRow {
  return {
    provider: slug.toUpperCase(),
    display_name: name,
    slug,
    app_credentials_present: status !== "APP_CREDENTIALS_MISSING",
    status: status as OAuthStatusRow["status"],
    scopes: [],
    account_label: null,
    connected_at: null,
    last_verified_at: null,
    redirect_uri: "",
  };
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const RAW_ENUM_RE =
  /APP_CREDENTIALS_MISSING|READY_FOR_CONSENT|CONNECTED_UNVERIFIED|ERROR_NEEDS_RECONNECT|source_lineage|connector_id|source_id|MEMORY_CAPSULE/;

describe("[GAP-U SLICE-3] deriveDataFlows — honest per-source truth", () => {
  it("connected Zoom says manual ingest; connected Slack says NOT ingesting; missing creds say not available", () => {
    const rows = deriveDataFlows([
      provider("zoom", "Zoom", "VERIFIED"),
      provider("slack", "Slack", "VERIFIED"),
      provider("google", "Google Workspace", "APP_CREDENTIALS_MISSING"),
    ]);
    const zoom = rows.find((r) => r.key === "zoom")!;
    expect(zoom.status).toContain("manual ingest");
    expect(zoom.pulls).toContain("Ambient ingestion is not automatic yet");
    expect(zoom.pushes).toContain("does not write to Zoom");
    const slack = rows.find((r) => r.key === "slack")!;
    expect(slack.status).toContain("not ingesting automatically");
    expect(slack.lands).toContain("No Slack data lands anywhere yet");
    const google = rows.find((r) => r.key === "google")!;
    expect(google.status).toContain("Not available yet");
    expect(google.lands).toContain("isn't connected");
  });

  it("the always-true rows exist with the boundary doctrine; every row carries honest retention", () => {
    const rows = deriveDataFlows(null);
    const keys = rows.map((r) => r.key);
    expect(keys).toEqual(["manual_comms", "external_context", "memory_boundary"]);
    const ext = rows.find((r) => r.key === "external_context")!;
    expect(ext.pulls).toContain("never trusted automatically");
    expect(ext.ownership).toContain("never becomes portable personal memory");
    const mem = rows.find((r) => r.key === "memory_boundary")!;
    expect(mem.lands).toContain("they cannot take the company's work");
    for (const r of rows) {
      expect(r.retention).toContain("Retention windows and deletion are not configurable yet");
      expect(r.ownership.length).toBeGreaterThan(0);
    }
  });
});

describe("[GAP-U SLICE-3] DataFlow page — calm, read-only, no overclaim", () => {
  function renderPage(providers: OAuthStatusRow[]) {
    server.use(
      http.get(`${API}/connectors/oauth/status`, () =>
        HttpResponse.json({ ok: true, providers }),
      ),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <DataFlowPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("renders every source with the six trust fields; leak + overclaim sweeps pass; GET-only", async () => {
    const methods: string[] = [];
    server.events.on("request:start", ({ request }) => {
      methods.push(request.method);
    });
    renderPage([
      provider("zoom", "Zoom", "VERIFIED"),
      provider("slack", "Slack", "APP_CREDENTIALS_MISSING"),
      provider("google", "Google Workspace", "APP_CREDENTIALS_MISSING"),
      provider("microsoft", "Microsoft 365", "APP_CREDENTIALS_MISSING"),
    ]);
    await screen.findByTestId("dataflow-row-zoom");
    for (const key of ["manual_comms", "zoom", "slack", "google", "microsoft", "external_context", "memory_boundary"]) {
      expect(screen.getByTestId(`dataflow-row-${key}`)).toBeInTheDocument();
    }
    const body = document.body.textContent ?? "";
    // The six questions render as labeled fields.
    for (const label of ["What Otzar pulls", "What Otzar pushes back", "Where it lands", "Who owns it", "Who can see it", "Retention"]) {
      expect(body).toContain(label);
    }
    // Doctrine on the page.
    expect(screen.getByTestId("dataflow-doctrine").textContent).toContain(
      "they cannot take the company's work",
    );
    // Leak sweep.
    expect(body).not.toMatch(UUID_RE);
    expect(body).not.toMatch(RAW_ENUM_RE);
    // Overclaim sweep: no ambient/sync/retention-configured/portability lies.
    expect(body).not.toMatch(/synced|syncing/i);
    expect(body).not.toMatch(/ambient ingest(ion)? is (on|enabled|active)/i);
    expect(body).not.toMatch(/retention (is )?configured/i);
    expect(body).not.toMatch(/email sent/i);
    expect(body).toContain("retired from active use (audit preserved)");
    // Repair + footer links target real routes.
    expect(screen.getByTestId("dataflow-retention-link").getAttribute("href")).toBe("/retention");
    expect(screen.getByTestId("dataflow-back-to-setup").getAttribute("href")).toBe("/setup");
    expect(screen.getByTestId("dataflow-repair-zoom").getAttribute("href")).toBe("/tools-connections");
    // Read-only proof.
    await waitFor(() => expect(methods.length).toBeGreaterThan(0));
    expect(methods.every((m) => m === "GET")).toBe(true);
  });
});
