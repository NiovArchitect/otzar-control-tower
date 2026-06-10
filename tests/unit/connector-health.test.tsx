// FILE: tests/unit/connector-health.test.tsx
// PURPOSE: Phase 1220 — locks the employee-facing Connector Health
//          view. Covers: honest static catalogue (10 categories
//          grouped by Productivity / Communications / Engineering /
//          Settlement / AI), backend status overlay when admin, 403
//          fallback for non-admin, admin link visibility, mock-mode
//          handling, error state, privacy invariants.
// CONNECTS TO: src/pages/app/ConnectorHealth.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ConnectorHealth } from "@/pages/app/ConnectorHealth";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(admin: boolean): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "x@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: admin,
      can_admin_niov: false,
    },
  });
}

function mockProviders403(): void {
  server.use(
    http.get(`${API_BASE}/orgs/me/connector-providers`, () =>
      HttpResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 }),
    ),
  );
}

function mockProviders(
  providers: Array<{ provider_id: string; display_name: string }>,
): void {
  server.use(
    http.get(`${API_BASE}/orgs/me/connector-providers`, () =>
      HttpResponse.json({
        ok: true,
        providers: providers.map((p) => ({
          provider_id: p.provider_id,
          display_name: p.display_name,
          supported_auth_modes: ["OAUTH2"],
          read_supported: true,
          draft_supported: false,
          write_supported: false,
          default_write_mode: "DRAFT_ONLY",
          compliance_tags: [],
          connector_write_founder_gated: false,
        })),
      }),
    ),
  );
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <ConnectorHealth />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAuth(false);
});

describe("ConnectorHealth — honest static catalogue", () => {
  it("renders all 5 Founder-mandated category groups + 10 entries", async () => {
    mockProviders403();
    setAuth(true);
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("connector-health-group").length).toBe(5);
    });
    const groups = screen
      .getAllByTestId("connector-health-group")
      .map((el) => el.getAttribute("data-group"));
    expect(groups.sort()).toEqual([
      "AI",
      "Communications",
      "Engineering",
      "Productivity",
      "Settlement",
    ]);
    expect(screen.getAllByTestId("connector-health-row")).toHaveLength(10);
  });

  it("each row carries the directive-listed category", async () => {
    mockProviders403();
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("connector-health-row")).toHaveLength(10),
    );
    const keys = screen
      .getAllByTestId("connector-health-row")
      .map((el) => el.getAttribute("data-category-key"));
    for (const required of [
      "GOOGLE_WORKSPACE",
      "SLACK",
      "ZOOM",
      "MICROSOFT_TEAMS",
      "JIRA",
      "EMAIL",
      "VOICE",
      "OCR",
      "CIRCLE_USDC",
      "BASE",
    ]) {
      expect(keys).toContain(required);
    }
  });
});

describe("ConnectorHealth — backend status overlay (admin)", () => {
  it("renders 'Connected' status for providers returned by the backend", async () => {
    setAuth(true);
    mockProviders([
      { provider_id: "SLACK", display_name: "Slack" },
      { provider_id: "JIRA", display_name: "Jira" },
    ]);
    renderPage();
    // The page initially renders all rows as NOT_CONFIGURED (statuses
    // map is null), then re-renders after the API result lands. Wait
    // for the SLACK row to flip to CONFIGURED before reading the
    // others.
    await waitFor(() => {
      const r = screen
        .getAllByTestId("connector-health-row")
        .find((el) => el.getAttribute("data-category-key") === "SLACK");
      expect(r?.getAttribute("data-status")).toBe("CONFIGURED");
    });
    const rows = screen.getAllByTestId("connector-health-row");
    const jiraRow = rows.find(
      (r) => r.getAttribute("data-category-key") === "JIRA",
    )!;
    const zoomRow = rows.find(
      (r) => r.getAttribute("data-category-key") === "ZOOM",
    )!;
    expect(jiraRow.getAttribute("data-status")).toBe("CONFIGURED");
    expect(zoomRow.getAttribute("data-status")).toBe("NOT_CONFIGURED");
  });

  it("shows the 'You can manage connectors' caller card + admin link when admin", async () => {
    setAuth(true);
    mockProviders([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("connector-health-caller")).toHaveTextContent(
        /can manage connectors/i,
      ),
    );
    expect(
      screen.getByTestId("connector-health-admin-link"),
    ).toBeInTheDocument();
  });
});

describe("ConnectorHealth — non-admin fallback", () => {
  it("shows the 'View only' card + no admin link when 403 + non-admin", async () => {
    setAuth(false);
    mockProviders403();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("connector-health-caller")).toHaveTextContent(
        /view only/i,
      ),
    );
    expect(screen.queryByTestId("connector-health-admin-link")).toBeNull();
  });

  it("all 10 rows render as 'NOT_CONFIGURED' on 403", async () => {
    setAuth(false);
    mockProviders403();
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("connector-health-row")).toHaveLength(10),
    );
    const rows = screen.getAllByTestId("connector-health-row");
    for (const r of rows) {
      expect(r.getAttribute("data-status")).toBe("NOT_CONFIGURED");
    }
  });
});

describe("ConnectorHealth — error state", () => {
  it("shows the error card on unexpected API failure but still renders catalogue", async () => {
    setAuth(true);
    server.use(
      http.get(`${API_BASE}/orgs/me/connector-providers`, () =>
        HttpResponse.json(
          { ok: false, code: "SESSION_EXPIRED" },
          { status: 401 },
        ),
      ),
    );
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("connector-health-error")).toBeInTheDocument(),
    );
    expect(screen.getAllByTestId("connector-health-row")).toHaveLength(10);
  });
});

describe("ConnectorHealth — reassurance footer", () => {
  it("renders the 'missing connectors don't block the core product' reassurance", async () => {
    setAuth(true);
    mockProviders([]);
    renderPage();
    await waitFor(() =>
      expect(
        screen.getByTestId("connector-health-reassurance"),
      ).toBeInTheDocument(),
    );
    const text = screen
      .getByTestId("connector-health-reassurance")
      .textContent ?? "";
    expect(text).toMatch(/don't block the core product/i);
    expect(text).toMatch(/honest mock-mode/i);
    expect(text).toMatch(/explicit governed approval/i);
  });
});

describe("ConnectorHealth — privacy invariants", () => {
  it("never renders raw secrets / api keys / connection ids / scope grant ids", async () => {
    setAuth(true);
    mockProviders([{ provider_id: "SLACK", display_name: "Slack" }]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("connector-health-page")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("connector-health-page").outerHTML;
    expect(html).not.toMatch(/api[_-]?key/i);
    expect(html).not.toMatch(/secret/i);
    expect(html).not.toMatch(/oauth[_-]?token/i);
    expect(html).not.toMatch(/access[_-]?token/i);
    expect(html).not.toMatch(/connection[_-]?id/i);
    expect(html).not.toMatch(/scope[_-]?grant[_-]?id/i);
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/bearer/i);
  });
});
