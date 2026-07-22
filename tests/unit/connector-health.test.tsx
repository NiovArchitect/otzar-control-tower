// FILE: tests/unit/connector-health.test.tsx
// PURPOSE: Phase E.1 — employee click-and-play tools surface.
// CONNECTS TO: src/pages/app/ConnectorHealth.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function mockCatalog(): void {
  server.use(
    http.get(`${API_BASE}/otzar/enterprise-tools/catalog`, () =>
      HttpResponse.json({
        ok: true,
        catalog: {
          headline: "Tools are ready — connect the ones your role needs.",
          generated_at: new Date().toISOString(),
          capabilities: [
            {
              capability_id: "calendars",
              label: "Calendars",
              description: "Meetings and availability.",
              category: "Productivity",
              status: "ready_to_connect",
              status_label: "Ready to connect",
              providers: [
                {
                  provider: "GOOGLE_WORKSPACE",
                  label: "Google Calendar",
                  oauth_slug: "google",
                  employee_self_serve: true,
                  status: "ready_to_connect",
                  status_label: "Ready to connect",
                  connect_action: "oauth_start",
                },
              ],
            },
            {
              capability_id: "chat",
              label: "Team chat",
              description: "Channels and DMs.",
              category: "Communications",
              status: "not_configured",
              status_label: "Not set up yet",
              providers: [
                {
                  provider: "SLACK",
                  label: "Slack",
                  oauth_slug: "slack",
                  employee_self_serve: true,
                  status: "not_configured",
                  status_label: "Not set up yet",
                  connect_action: "request_admin",
                },
              ],
            },
          ],
        },
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
  mockCatalog();
});

describe("ConnectorHealth — Phase E.1 click-and-play", () => {
  it("renders capability catalog in human language", async () => {
    renderPage();
    expect(await screen.findByTestId("enterprise-tools-headline")).toHaveTextContent(
      /connect the ones your role needs/i,
    );
    expect(screen.getAllByTestId("enterprise-tools-capability").length).toBe(2);
    expect(screen.getByText("Calendars")).toBeInTheDocument();
    expect(screen.getByText("Team chat")).toBeInTheDocument();
    // O-01: MCP may appear only as denial ("does not ask you to configure MCP"),
    // never as the product lead. Capability-first banner must stay primary.
    const banner = screen.getByTestId("tools-capability-first-banner");
    expect(banner.textContent).toMatch(/capability|calendar|document|meet/i);
    expect((banner.textContent ?? "").trim()).not.toMatch(
      /^(MCP|model context protocol)\b/i,
    );
    expect(document.body.textContent).toMatch(
      /does not ask you to configure MCP|nobody needs mcp/i,
    );
  });

  it("Connect starts oauth; Ask admin posts a request", async () => {
    let oauthSlug: string | null = null;
    let requested: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/otzar/enterprise-tools/oauth/:slug/start`, ({ params }) => {
        oauthSlug = params.slug as string;
        return HttpResponse.json({
          ok: true,
          authorize_url: "https://accounts.example/oauth",
        });
      }),
      http.post(`${API_BASE}/otzar/enterprise-tools/request`, async ({ request }) => {
        requested = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, seed_id: "seed-1" }, { status: 201 });
      }),
    );
    // Prevent actual navigation
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign },
      writable: true,
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Calendars");
    const connectBtns = screen.getAllByTestId("enterprise-tools-connect");
    const connect = connectBtns.find((b) => b.getAttribute("data-action") === "oauth_start");
    const ask = connectBtns.find((b) => b.getAttribute("data-action") === "request_admin");
    expect(connect).toBeTruthy();
    expect(ask).toBeTruthy();
    await user.click(connect!);
    await waitFor(() => expect(oauthSlug).toBe("google"));
    await user.click(ask!);
    await waitFor(() =>
      expect(requested).toMatchObject({
        capability_id: "chat",
        provider: "SLACK",
      }),
    );
  });

  it("admins see link to Connections", async () => {
    setAuth(true);
    renderPage();
    const link = await screen.findByTestId("open-tools-connections");
    expect(link).toHaveAttribute("href", "/tools-connections");
    expect(link).toHaveTextContent(/^Connections$/);
  });
});

// vitest vi
import { vi } from "vitest";
