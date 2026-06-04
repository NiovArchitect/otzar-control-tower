// FILE: tests/unit/collaboration.test.tsx
// PURPOSE: Phase 4D — page tests for the Collaboration employee surface.
// CONNECTS TO: src/pages/app/Collaboration.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Collaboration } from "@/pages/app/Collaboration";
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
    <QueryClientProvider client={qc}>
      <Collaboration />
    </QueryClientProvider>,
  );
}

const REQUESTED_FIXTURE = {
  collaboration_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  target_type: "EMPLOYEE" as const,
  request_type: "STATUS_REQUEST" as const,
  state: "REQUESTED" as const,
  sensitivity_class: "MODERATE" as const,
  safe_summary: "Can you confirm the launch window?",
  requested_by_ai: false,
  requires_approval: false,
  blocked_reason: null,
  has_target_entity: true,
  has_target_twin: false,
  has_target_team: false,
  has_target_project: false,
  expires_at: null,
  completed_at: null,
  created_at: new Date().toISOString(),
};

const BLOCKED_FIXTURE = {
  ...REQUESTED_FIXTURE,
  collaboration_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  target_type: "PROJECT" as const,
  request_type: "PROJECT_COORDINATION" as const,
  state: "BLOCKED" as const,
  blocked_reason: "MISSING_PROJECT_MEMBERSHIP" as const,
  safe_summary: "Sync up on the Phoenix project",
};

beforeEach(() => {
  setAuth();
});

describe("Collaboration page", () => {
  it("renders inbound + outbound cards + create form", async () => {
    server.use(
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/inbound`,
        () => HttpResponse.json({ ok: true, collaborations: [] }),
      ),
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/outbound`,
        () => HttpResponse.json({ ok: true, collaborations: [] }),
      ),
    );
    renderPage();
    expect(await screen.findByText("Collaboration")).toBeInTheDocument();
    expect(screen.getByTestId("create-collaboration-form")).toBeInTheDocument();
    expect(screen.getByTestId("inbound-card")).toBeInTheDocument();
    expect(screen.getByTestId("outbound-card")).toBeInTheDocument();
  });

  it("exposes all 6 target_types + 10 request_types in the form", async () => {
    server.use(
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/inbound`,
        () => HttpResponse.json({ ok: true, collaborations: [] }),
      ),
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/outbound`,
        () => HttpResponse.json({ ok: true, collaborations: [] }),
      ),
    );
    renderPage();
    const target = await screen.findByTestId("collab-target-type");
    const req = screen.getByTestId("collab-request-type");
    expect(within(target).getAllByRole("option")).toHaveLength(6);
    expect(within(req).getAllByRole("option")).toHaveLength(10);
  });

  it("inbound row shows Accept/Reject; outbound shows Complete/Cancel", async () => {
    server.use(
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/inbound`,
        () =>
          HttpResponse.json({
            ok: true,
            collaborations: [REQUESTED_FIXTURE],
          }),
      ),
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/outbound`,
        () =>
          HttpResponse.json({
            ok: true,
            collaborations: [
              {
                ...REQUESTED_FIXTURE,
                collaboration_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
                safe_summary: "Outbound — mine",
              },
            ],
          }),
      ),
    );
    renderPage();
    await screen.findByText("Can you confirm the launch window?");
    expect(
      screen.getByTestId(`collab-accept-${REQUESTED_FIXTURE.collaboration_id}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`collab-reject-${REQUESTED_FIXTURE.collaboration_id}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        "collab-complete-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        "collab-cancel-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      ),
    ).toBeInTheDocument();
  });

  it("BLOCKED row renders friendly blocked-reason badge", async () => {
    server.use(
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/inbound`,
        () => HttpResponse.json({ ok: true, collaborations: [BLOCKED_FIXTURE] }),
      ),
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/outbound`,
        () => HttpResponse.json({ ok: true, collaborations: [] }),
      ),
    );
    renderPage();
    expect(
      await screen.findByText("You aren't a member of that project"),
    ).toBeInTheDocument();
    // BLOCKED rows do NOT show Accept/Reject/Cancel/Complete.
    expect(
      screen.queryByTestId(`collab-accept-${BLOCKED_FIXTURE.collaboration_id}`),
    ).not.toBeInTheDocument();
  });

  it("no surveillance / score / monitoring / spy language in the rendered DOM", async () => {
    server.use(
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/inbound`,
        () =>
          HttpResponse.json({
            ok: true,
            collaborations: [REQUESTED_FIXTURE, BLOCKED_FIXTURE],
          }),
      ),
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/outbound`,
        () => HttpResponse.json({ ok: true, collaborations: [] }),
      ),
    );
    const { container } = renderPage();
    await screen.findByText("Can you confirm the launch window?");
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/surveillance/i);
    expect(text).not.toMatch(/employee score/i);
    expect(text).not.toMatch(/productivity score/i);
    expect(text).not.toMatch(/spy/i);
    expect(text).not.toMatch(/manager monitoring/i);
  });
});
