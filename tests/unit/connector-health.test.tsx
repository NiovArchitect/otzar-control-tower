// FILE: tests/unit/connector-health.test.tsx
// PURPOSE: Slice 3 — employee Connect your work tools primary surface.
// CONNECTS TO: src/pages/app/ConnectorHealth.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { ConnectorHealth } from "@/pages/app/ConnectorHealth";
import { useAuthStore } from "@/lib/stores/auth";
import { vi } from "vitest";

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
          headline:
            "Connect the tools you already use so your AI Teammate can help within your permissions.",
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
                  account_label: null,
                },
                {
                  provider: "MICROSOFT_365",
                  label: "Microsoft 365 Calendar",
                  oauth_slug: "microsoft",
                  employee_self_serve: true,
                  status: "not_configured",
                  status_label: "Not set up yet",
                  connect_action: "request_admin",
                  account_label: null,
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
                  account_label: null,
                },
              ],
            },
            {
              capability_id: "engineering",
              label: "Code",
              description: "Repos",
              category: "Engineering",
              status: "not_configured",
              status_label: "Not set up yet",
              providers: [
                {
                  provider: "GITHUB",
                  label: "GitHub",
                  oauth_slug: null,
                  employee_self_serve: false,
                  status: "not_configured",
                  status_label: "Not set up yet",
                  connect_action: "request_admin",
                  account_label: null,
                },
              ],
            },
          ],
        },
      }),
    ),
  );
}

function renderPage(path = "/app/connector-health"): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ConnectorHealth />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAuth(false);
  mockCatalog();
  sessionStorage.clear();
});

describe("ConnectorHealth — Slice 3 primary tool cards", () => {
  it("passes three-second clarity: heading, value, primary tool cards", async () => {
    renderPage();
    expect(
      await screen.findByRole("heading", { name: /connect your work tools/i }),
    ).toBeInTheDocument();
    expect(document.body.textContent).toMatch(
      /tools you already use|AI Teammate|permissions/i,
    );
    const cards = await screen.findAllByTestId("primary-tool-card");
    expect(cards.length).toBe(4);
    expect(screen.getByText("Google Workspace")).toBeInTheDocument();
    expect(screen.getByText("Microsoft 365")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText("GitHub")).toBeInTheDocument();

    // No primary developer terminology.
    const body = (document.body.textContent ?? "").toLowerCase();
    expect(body).not.toMatch(/\bmcp\b/);
    expect(body).not.toMatch(/oauth client id|callback uri|service account/);
    expect(body).not.toMatch(/scope identifier|capability enum|tool harness/);
  });

  it("Connect Google Workspace starts official OAuth", async () => {
    let oauthSlug: string | null = null;
    server.use(
      http.post(
        `${API_BASE}/otzar/enterprise-tools/oauth/:slug/start`,
        ({ params }) => {
          oauthSlug = params.slug as string;
          return HttpResponse.json({
            ok: true,
            authorize_url: "https://accounts.google.com/o/oauth2/v2/auth?x=1",
          });
        },
      ),
    );
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign },
      writable: true,
    });

    const user = userEvent.setup();
    renderPage();
    await screen.findAllByTestId("primary-tool-card");
    const connect = screen
      .getAllByTestId("enterprise-tools-connect")
      .find((b) => b.getAttribute("data-tool") === "GOOGLE_WORKSPACE");
    expect(connect).toBeTruthy();
    expect(connect).toHaveTextContent(/Connect Google Workspace/i);
    await user.click(connect!);
    await waitFor(() => expect(oauthSlug).toBe("google"));
    expect(assign).toHaveBeenCalledWith(
      expect.stringContaining("accounts.google.com"),
    );
  });

  it("Ask admin posts a request for non-self-serve tools", async () => {
    let requested: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/otzar/enterprise-tools/request`, async ({ request }) => {
        requested = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, seed_id: "seed-1" }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Slack");
    const ask = screen
      .getAllByTestId("enterprise-tools-connect")
      .find((b) => b.getAttribute("data-tool") === "SLACK");
    expect(ask).toHaveTextContent(/Ask admin/i);
    await user.click(ask!);
    await waitFor(() =>
      expect(requested).toMatchObject({
        provider: "SLACK",
      }),
    );
  });

  it("shows return context and resume link from deep link", async () => {
    renderPage(
      "/app/connector-health?tool=google&return=/app/my-work&why=Connect%20Google%20Workspace%20to%20draft%20the%20partner%20one-pager",
    );
    expect(await screen.findByTestId("connection-return-context")).toBeInTheDocument();
    expect(screen.getByTestId("connection-why")).toHaveTextContent(
      /partner one-pager/i,
    );
    expect(screen.getByTestId("connection-resume-work")).toHaveAttribute(
      "href",
      "/app/my-work",
    );
  });

  it("admins see organization connections link, not mixed admin maze", async () => {
    setAuth(true);
    renderPage();
    const link = await screen.findByTestId("open-tools-connections");
    expect(link).toHaveAttribute("href", "/tools-connections");
    expect(link).toHaveTextContent(/Organization connections/i);
  });

  it("oauth success shows continue-work when return context exists", async () => {
    sessionStorage.setItem(
      "otzar.connection.return_context",
      JSON.stringify({
        returnPath: "/app/my-work",
        workTitle: "partner one-pager",
        savedAt: new Date().toISOString(),
      }),
    );
    renderPage("/app/connector-health?oauth=connected&tool=google");
    expect(await screen.findByTestId("connection-success-resume")).toBeInTheDocument();
    expect(screen.getByTestId("connection-resume-after-oauth")).toHaveAttribute(
      "href",
      "/app/my-work",
    );
    expect(screen.getByTestId("enterprise-tools-notice")).toHaveTextContent(
      /Google Workspace is connected/i,
    );
  });
});
