// FILE: tests/unit/collaboration.test.tsx
// PURPOSE: Phase 4D + [OTZAR-LIVE-6] — page tests for the Collaboration employee
//          surface. The "Ask for help" composer is now natural-language: no
//          Target id / entity·project·team id field, no manual routing. Otzar
//          resolves a typed name via the governed resolver and asks ONE focused
//          clarification when it can't.
// CONNECTS TO: src/pages/app/Collaboration.tsx,
//          src/lib/work-os/target-resolution.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
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

function emptyLists() {
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
  it("renders inbound + outbound cards + the ask-for-help composer", async () => {
    emptyLists();
    renderPage();
    expect(await screen.findByText("People & Collaboration")).toBeInTheDocument();
    expect(screen.getByTestId("create-collaboration-form")).toBeInTheDocument();
    expect(screen.getByTestId("inbound-card")).toBeInTheDocument();
    expect(screen.getByTestId("outbound-card")).toBeInTheDocument();
  });

  it("never exposes a Target id / entity·project·team id field or manual routing copy", async () => {
    emptyLists();
    const { container } = renderPage();
    await screen.findByTestId("create-collaboration-form");
    // The old technical field + manual-route control are gone.
    expect(screen.queryByTestId("collab-target-id")).not.toBeInTheDocument();
    expect(screen.queryByTestId("collab-target-type")).not.toBeInTheDocument();
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/target id/i);
    expect(text).not.toMatch(/entity .* id/i);
    expect(text).not.toMatch(/project .* id/i);
    expect(text).not.toMatch(/team id/i);
    expect(text).not.toMatch(/route this request/i);
  });

  it("offers a natural-language 'Who should help?' field (not an id picker) + help chips", async () => {
    emptyLists();
    renderPage();
    const who = await screen.findByTestId("collab-who");
    expect(who.tagName).toBe("INPUT");
    expect(who).toHaveAttribute(
      "placeholder",
      expect.stringMatching(/coworker/i),
    );
    // Optional kind-of-help chips are present (hints, not required fields).
    expect(screen.getByTestId("collab-help-chips")).toBeInTheDocument();
    expect(screen.getByTestId("collab-chip-status")).toBeInTheDocument();
    expect(screen.getByTestId("collab-chip-blocker")).toBeInTheDocument();
  });

  it("submits from natural language alone — no teammate named, no id, Otzar routes", async () => {
    emptyLists();
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(
        `${API_BASE}/otzar/my-twin/collaboration-requests`,
        async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ok: true, collaboration: REQUESTED_FIXTURE });
        },
      ),
    );
    renderPage();
    const summary = await screen.findByTestId("collab-summary");
    fireEvent.change(summary, {
      target: { value: "I need the launch window confirmed." },
    });
    fireEvent.click(screen.getByTestId("collab-submit"));
    await waitFor(() => expect(body).not.toBeNull());
    // EMPLOYEE target_type, NO entity id — backend policy routes it.
    expect(body).toMatchObject({
      target_type: "EMPLOYEE",
      request_type: "STATUS_REQUEST",
      safe_summary: "I need the launch window confirmed.",
    });
    expect(body).not.toHaveProperty("target_entity_id");
    expect(body).not.toHaveProperty("target_team_id");
    expect(body).not.toHaveProperty("target_project_id");
  });

  it("resolves a named coworker through the governed resolver and sends with the resolved id", async () => {
    emptyLists();
    let body: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/work-os/resolve-target`, () =>
        HttpResponse.json({
          ok: true,
          resolution: {
            code: "RESOLVED_INTERNAL_ENTITY",
            match: {
              entity_id: "11111111-1111-1111-1111-111111111111",
              display_name: "David Odie",
              role_title: "Engineer",
            },
            candidates: [],
          },
        }),
      ),
      http.post(
        `${API_BASE}/otzar/my-twin/collaboration-requests`,
        async ({ request }) => {
          body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ ok: true, collaboration: REQUESTED_FIXTURE });
        },
      ),
    );
    renderPage();
    fireEvent.change(await screen.findByTestId("collab-summary"), {
      target: { value: "Is the deployment ready?" },
    });
    fireEvent.change(screen.getByTestId("collab-who"), {
      target: { value: "David" },
    });
    fireEvent.click(screen.getByTestId("collab-submit"));
    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({
      target_type: "EMPLOYEE",
      target_entity_id: "11111111-1111-1111-1111-111111111111",
    });
  });

  it("asks ONE focused clarification when the typed name is ambiguous", async () => {
    emptyLists();
    server.use(
      http.post(`${API_BASE}/work-os/resolve-target`, () =>
        HttpResponse.json({
          ok: true,
          resolution: {
            code: "AMBIGUOUS",
            match: null,
            candidates: [
              {
                entity_id: "aaaaaaaa-1111-1111-1111-111111111111",
                display_name: "David Odie",
                role_title: "Engineer",
              },
              {
                entity_id: "bbbbbbbb-2222-2222-2222-222222222222",
                display_name: "David Stern",
                role_title: "Designer",
              },
            ],
          },
        }),
      ),
    );
    renderPage();
    fireEvent.change(await screen.findByTestId("collab-summary"), {
      target: { value: "Quick review please." },
    });
    fireEvent.change(screen.getByTestId("collab-who"), {
      target: { value: "David" },
    });
    fireEvent.click(screen.getByTestId("collab-submit"));
    const clar = await screen.findByTestId("collab-clarification");
    expect(within(clar).getByText(/who do you mean/i)).toBeInTheDocument();
    // Both candidates + a "let Otzar route it" escape are offered.
    expect(within(clar).getByText("David Odie")).toBeInTheDocument();
    expect(within(clar).getByText("David Stern")).toBeInTheDocument();
    expect(screen.getByTestId("collab-clarify-route")).toBeInTheDocument();
  });

  it("asks one focused clarification (no id leak) when a team/project phrase can't resolve to a person", async () => {
    emptyLists();
    server.use(
      http.post(`${API_BASE}/work-os/resolve-target`, () =>
        HttpResponse.json({
          ok: true,
          resolution: { code: "NOT_FOUND", match: null, candidates: [] },
        }),
      ),
    );
    renderPage();
    fireEvent.change(await screen.findByTestId("collab-summary"), {
      target: { value: "Need a status on the rollout." },
    });
    fireEvent.change(screen.getByTestId("collab-who"), {
      target: { value: "the product team" },
    });
    fireEvent.click(screen.getByTestId("collab-submit"));
    const clar = await screen.findByTestId("collab-clarification");
    expect(within(clar).getByText(/couldn't find/i)).toBeInTheDocument();
    // The escape hatch routes through Otzar — never asks for an id.
    expect(screen.getByTestId("collab-clarify-route")).toBeInTheDocument();
    expect(clar.textContent ?? "").not.toMatch(/id/i);
  });

  it("requires a summary before sending", async () => {
    emptyLists();
    renderPage();
    fireEvent.click(await screen.findByTestId("collab-submit"));
    expect(await screen.findByTestId("collab-error")).toHaveTextContent(
      /what you need/i,
    );
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
    expect(
      screen.queryByTestId(`collab-accept-${BLOCKED_FIXTURE.collaboration_id}`),
    ).not.toBeInTheDocument();
  });

  it("inbound row shows Accept/Reject; outbound shows Complete/Cancel", async () => {
    server.use(
      http.get(
        `${API_BASE}/otzar/my-twin/collaboration-requests/inbound`,
        () => HttpResponse.json({ ok: true, collaborations: [REQUESTED_FIXTURE] }),
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
      screen.getByTestId("collab-complete-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("collab-cancel-eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"),
    ).toBeInTheDocument();
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
