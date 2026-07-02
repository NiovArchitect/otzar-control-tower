// FILE: tests/unit/dandelion.test.tsx
// PURPOSE: Phase 1237 — locks the Dandelion surfaces: the admin
//          "Help your organization grow" card on People &
//          Collaboration (admin-gated, dismissible, suggestions-only)
//          and the voice-first Welcome page (greeting, consent-gated
//          memory submit → Action Center approval copy, intros,
//          calm language).
// CONNECTS TO: src/pages/app/Collaboration.tsx (DandelionGrowthCard),
//          src/pages/app/Welcome.tsx, tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "../msw/server";
import { Collaboration } from "@/pages/app/Collaboration";
import { Welcome } from "@/pages/app/Welcome";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(admin: boolean): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
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

beforeEach(() => setAuth(true));

function renderWithProviders(element: JSX.Element): void {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function growthWithRecommendations() {
  return {
    ok: true,
    growth: {
      headline: "Otzar found 2 ways to strengthen your organization this week.",
      recommendations: [
        {
          kind: "ASSIGN_INTERNAL_OWNER",
          title: "Assign an internal owner for Maria (MICE Global)",
          why: "External relationships without an internal owner tend to stall.",
          people: ["Maria"],
          suggested_next_step:
            "Pick the teammate who knows this relationship best.",
        },
        {
          kind: "REDUCE_OVERLOAD",
          title: "David may need support",
          why: "David owns 4 open commitments — more than anyone should carry alone.",
          people: ["David"],
          suggested_next_step: "Review their commitments in the workspace.",
        },
      ],
      signals: {
        members_count: 4,
        external_collaborators_count: 1,
        unowned_external_count: 1,
        members_without_project_count: 0,
      },
      generated_at: new Date().toISOString(),
    },
  };
}

// [PROD-UX-BUGD] A NEEDS_PROJECT_OR_WORKSPACE recommendation as the fixed
// backend returns it: accurate org-placement copy + structured context.
function growthWithNeedsProject() {
  return {
    ok: true,
    growth: {
      headline: "Otzar found 1 way to strengthen your organization this week.",
      recommendations: [
        {
          kind: "NEEDS_PROJECT_OR_WORKSPACE",
          title: "Shweta needs a first project or workspace",
          why: "Shweta is already part of your organization on David Odie's team, but isn't assigned to a project or workspace yet. Adding them to one helps Otzar connect their work, tools, and context more accurately.",
          people: ["Shweta"],
          suggested_next_step: "Assign Shweta to their first project or workspace.",
          context: {
            person_entity_id: "ent-shweta",
            org_member: true,
            has_department: true,
            has_manager: true,
            has_project_or_workspace: false,
            missing_connection_type: "PROJECT_OR_WORKSPACE",
          },
        },
      ],
      signals: {
        members_count: 4,
        external_collaborators_count: 0,
        unowned_external_count: 0,
        members_without_project_count: 1,
      },
      generated_at: new Date().toISOString(),
    },
  };
}

describe("Dandelion — admin growth card (Phase 1237)", () => {
  it("admins see the headline and governed recommendations with dismiss", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithRecommendations()),
      ),
    );
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByTestId("dandelion-growth-card")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("dandelion-growth-headline")).toHaveTextContent(
      "Otzar found 2 ways to strengthen your organization this week.",
    );
    const items = screen.getAllByTestId("dandelion-growth-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Assign an internal owner for Maria");
    expect(items[1]).toHaveTextContent("David may need support");

    // Dismiss is local and non-destructive.
    const firstDismiss = screen.getAllByTestId("dandelion-growth-dismiss")[0];
    if (firstDismiss === undefined) throw new Error("expected dismiss");
    await userEvent.click(firstDismiss);
    expect(screen.getAllByTestId("dandelion-growth-item")).toHaveLength(1);

    // Suggestions-only honesty line.
    expect(screen.getByTestId("dandelion-growth-card")).toHaveTextContent(
      "Suggestions only — nothing happens without you.",
    );
  });

  it("non-admins never see the growth card", async () => {
    setAuth(false);
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByText("People & Collaboration")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("dandelion-growth-card")).toBeNull();
  });

  // [PROD-UX-BUGD] Connectedness truth: an org member missing only a project/
  // workspace is described as ALREADY part of the organization — never as
  // "not connected".
  it("an org member without a project reads as 'already part of your organization', names the missing piece, and never says 'not connected'", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithNeedsProject()),
      ),
    );
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByTestId("dandelion-growth-card")).toBeInTheDocument(),
    );
    const item = screen.getByTestId("dandelion-growth-item");
    expect(item).toHaveAttribute("data-kind", "NEEDS_PROJECT_OR_WORKSPACE");
    // States the TRUE relationship first (org member, on a real team)...
    expect(item).toHaveTextContent("Shweta is already part of your organization on David Odie's team");
    // ...names the ONE missing object...
    expect(item).toHaveTextContent("needs a first project or workspace");
    // ...and the next step is honest text routing to real admin work — the
    // card offers no fake "Add to workspace" action button (only Hide for now).
    expect(item).toHaveTextContent("Next step: Assign Shweta to their first project or workspace.");
    const buttons = item.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.textContent).toMatch(/hide for now/i);
    // NEVER the misleading flattening — and no raw backend codes as copy.
    const text = item.textContent ?? "";
    expect(text).not.toMatch(/isn't connected|not connected|disconnected/i);
    expect(text).not.toContain("NEEDS_PROJECT_OR_WORKSPACE");
    expect(text).not.toContain("CONNECT_TEAMMATE");
    expect(text).not.toContain("ent-shweta"); // stable id keys, never rendered
  });

  it("hiding a recommendation is honest about being temporary ('Hide for now', keyed by stable id)", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithNeedsProject()),
      ),
    );
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByTestId("dandelion-growth-item")).toBeInTheDocument(),
    );
    const hide = screen.getByTestId("dandelion-growth-dismiss");
    // The control never claims durable dismissal.
    expect(hide).toHaveTextContent("Hide for now");
    expect(hide.textContent).not.toMatch(/^dismiss$/i);
    await userEvent.click(hide);
    expect(screen.queryByTestId("dandelion-growth-item")).toBeNull();
  });
});

describe("Dandelion — Welcome page (Phase 1237)", () => {
  it("greets warmly with a hear-it voice affordance and consent note", async () => {
    renderWithProviders(<Welcome />);
    await waitFor(() =>
      expect(screen.getByTestId("welcome-greeting")).toHaveTextContent(
        "I'm Otzar",
      ),
    );
    expect(screen.getByTestId("welcome-hear-greeting")).toBeInTheDocument();
    expect(screen.getByTestId("welcome-page")).toHaveTextContent(
      "Otzar only remembers what you approve",
    );
    expect(
      screen.getByLabelText("How should I pronounce your name?"),
    ).toBeInTheDocument();
  });

  it("consent submit sends only offered fields and points to Action Center", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post(
        `${API_BASE}/otzar/dandelion/onboarding/memory-candidates`,
        async ({ request }) => {
          bodies.push((await request.json()) as Record<string, unknown>);
          return HttpResponse.json(
            {
              ok: true,
              action: {
                action_id: "a-1",
                status: "PROPOSED",
                action_type: "RECORD_CAPSULE",
                risk_tier: "LOW",
                requires_approval: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            },
            { status: 201 },
          );
        },
      ),
    );
    renderWithProviders(<Welcome />);
    await userEvent.type(
      screen.getByLabelText("What should Otzar call you?"),
      "Sadeil",
    );
    await userEvent.type(
      screen.getByLabelText("How should I pronounce your name?"),
      "sah-DAYL",
    );
    await userEvent.click(screen.getByTestId("welcome-save"));
    await waitFor(() =>
      expect(screen.getByTestId("welcome-submitted")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("welcome-submitted")).toHaveTextContent(
      "only after you approve it",
    );
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toEqual({
      preferred_name: "Sadeil",
      pronunciation: "sah-DAYL",
    });
  });

  it("save stays disabled until something is offered; intros render scoped data", async () => {
    renderWithProviders(<Welcome />);
    await waitFor(() =>
      expect(screen.getByTestId("welcome-intros")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("welcome-save")).toBeDisabled();
    expect(screen.getByTestId("welcome-teammates")).toHaveTextContent(
      "David Odie",
    );
    expect(screen.getByTestId("welcome-workspaces")).toHaveTextContent(
      "Launch Collaboration",
    );
  });

  it("welcome copy never uses developer vocabulary", async () => {
    renderWithProviders(<Welcome />);
    await waitFor(() =>
      expect(screen.getByTestId("welcome-page")).toBeInTheDocument(),
    );
    const text = document.body.textContent ?? "";
    for (const banned of [
      "payload",
      "schema",
      "capsule_id",
      "wallet_id",
      "DMW object",
      "COSMP capsule",
      "raw JSON",
    ]) {
      expect(text).not.toContain(banned);
    }
  });
});
