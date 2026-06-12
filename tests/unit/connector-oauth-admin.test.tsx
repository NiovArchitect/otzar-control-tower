// FILE: tests/unit/connector-oauth-admin.test.tsx
// PURPOSE: Phase 1261 locks for the Priority C OAuth admin surface
//          on /admin/connector-rails:
//          - the four providers render with humanized statuses
//            (raw enum text never reaches the page)
//          - "Verified" renders ONLY for status VERIFIED (no fake
//            green for connected-but-unverified rows)
//          - Connect is disabled when app credentials are missing
//          - Connect opens the server-built authorize_url in the
//            browser (never builds OAuth URLs client-side)
//          - no token material anywhere in the rendered page
// CONNECTS TO: src/pages/ConnectorRailsAdmin.tsx,
//              src/lib/api.ts (api.otzar.oauth*),
//              Foundation /connectors/oauth/* (Phase 1261).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import ConnectorRailsAdmin from "@/pages/ConnectorRailsAdmin";
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

function oauthRow(overrides: Record<string, unknown>) {
  return {
    provider: "GOOGLE_WORKSPACE",
    display_name: "Google Workspace",
    slug: "google",
    app_credentials_present: true,
    status: "READY_FOR_CONSENT",
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    account_label: null,
    connected_at: null,
    last_verified_at: null,
    redirect_uri:
      "http://localhost:3000/api/v1/connectors/oauth/callback/google",
    ...overrides,
  };
}

function mockOAuthStatus(rows: unknown[]) {
  server.use(
    http.get(`${API_BASE}/connectors/oauth/status`, () =>
      HttpResponse.json({ ok: true, providers: rows }),
    ),
    // The page's sibling queries — empty-honest.
    http.get(`${API_BASE}/orgs/me/connector-providers`, () =>
      HttpResponse.json({ ok: true, providers: [] }),
    ),
    http.get(`${API_BASE}/orgs/me/mcp-connections`, () =>
      HttpResponse.json({ ok: true, connections: [] }),
    ),
    http.get(`${API_BASE}/orgs/me/mcp-tool-policies`, () =>
      HttpResponse.json({ ok: true, policies: [] }),
    ),
  );
}

const FOUR_ROWS = [
  oauthRow({}),
  oauthRow({
    provider: "SLACK",
    display_name: "Slack",
    slug: "slack",
    app_credentials_present: false,
    status: "APP_CREDENTIALS_MISSING",
  }),
  oauthRow({
    provider: "MICROSOFT_365",
    display_name: "Microsoft 365",
    slug: "microsoft",
    status: "CONNECTED_UNVERIFIED",
    connected_at: "2026-06-12T00:00:00.000Z",
  }),
  oauthRow({
    provider: "ZOOM",
    display_name: "Zoom",
    slug: "zoom",
    status: "VERIFIED",
    connected_at: "2026-06-12T00:00:00.000Z",
    last_verified_at: "2026-06-12T01:00:00.000Z",
  }),
];

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ConnectorRailsAdmin />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  cleanup();
  setAuth();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Phase 1261 — OAuth connections admin surface", () => {
  it("renders all four Priority C providers with humanized statuses", async () => {
    mockOAuthStatus(FOUR_ROWS);
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("oauth-provider-row").length).toBe(4);
    });
    const section = screen.getByTestId("oauth-connections-section");
    const text = section.textContent ?? "";
    // Humanized copy renders…
    expect(text).toContain("Ready to connect");
    expect(text).toContain("Needs app credentials");
    expect(text).toContain("Connected — verify to confirm");
    expect(text).toContain("Verified");
    // …raw enum text never does.
    expect(text).not.toContain("READY_FOR_CONSENT");
    expect(text).not.toContain("APP_CREDENTIALS_MISSING");
    expect(text).not.toContain("CONNECTED_UNVERIFIED");
  });

  it("no fake green: only the VERIFIED row carries the Verified badge", async () => {
    mockOAuthStatus(FOUR_ROWS);
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("oauth-provider-row").length).toBe(4);
    });
    const rows = screen.getAllByTestId("oauth-provider-row");
    for (const row of rows) {
      const badge = row.querySelector(
        '[data-testid="oauth-status-badge"]',
      ) as HTMLElement;
      if (row.getAttribute("data-status") === "VERIFIED") {
        expect(badge.textContent).toBe("Verified");
      } else {
        expect(badge.textContent).not.toBe("Verified");
      }
    }
  });

  it("Connect is disabled when app credentials are missing", async () => {
    mockOAuthStatus(FOUR_ROWS);
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("oauth-provider-row").length).toBe(4);
    });
    const slackRow = screen
      .getAllByTestId("oauth-provider-row")
      .find((r) => r.getAttribute("data-provider") === "SLACK")!;
    const connect = slackRow.querySelector(
      '[data-testid="oauth-connect-button"]',
    ) as HTMLButtonElement;
    expect(connect.disabled).toBe(true);
  });

  it("Connect opens the server-built authorize_url (never client-built)", async () => {
    mockOAuthStatus(FOUR_ROWS);
    const AUTHORIZE_URL =
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=server-built";
    server.use(
      http.post(`${API_BASE}/connectors/oauth/google/start`, () =>
        HttpResponse.json({ ok: true, authorize_url: AUTHORIZE_URL }),
      ),
    );
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue(null as unknown as Window);
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("oauth-provider-row").length).toBe(4);
    });
    const googleRow = screen
      .getAllByTestId("oauth-provider-row")
      .find((r) => r.getAttribute("data-provider") === "GOOGLE_WORKSPACE")!;
    await userEvent.click(
      googleRow.querySelector('[data-testid="oauth-connect-button"]')!,
    );
    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith(AUTHORIZE_URL, "_blank");
    });
  });

  it("no token material renders anywhere on the page", async () => {
    mockOAuthStatus(FOUR_ROWS);
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("oauth-provider-row").length).toBe(4);
    });
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/ya29\./);
    expect(text).not.toMatch(/xoxb-/);
    expect(text).not.toContain("access_token");
    expect(text).not.toContain("client_secret");
  });
});
