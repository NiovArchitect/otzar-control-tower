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
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    // ...and the next step is real: the honest routing text PLUS the working
    // in-place Assign action ([PROD-UX-ASSIGN] — no fake buttons: this one is
    // wired to POST /org/assignments).
    expect(item).toHaveTextContent("Next step: Assign Shweta to their first project or workspace.");
    const buttons = item.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    const labels = [...buttons].map((b) => b.textContent ?? "");
    expect(labels.some((l) => /hide for now/i.test(l))).toBe(true);
    expect(labels.some((l) => /assign project\/workspace/i.test(l))).toBe(true);
    // NEVER the misleading flattening — and no raw backend codes as copy.
    const text = item.textContent ?? "";
    expect(text).not.toMatch(/isn't connected|not connected|disconnected/i);
    expect(text).not.toContain("NEEDS_PROJECT_OR_WORKSPACE");
    expect(text).not.toContain("CONNECT_TEAMMATE");
    expect(text).not.toContain("ent-shweta"); // stable id keys, never rendered
  });

  // ── [PROD-UX-ASSIGN] fix the gap in place ──────────────────────────────────
  function mockTargets(targets: Array<Record<string, unknown>>): void {
    server.use(
      http.get(`${API_BASE}/org/assignment-targets`, () =>
        HttpResponse.json({ ok: true, targets }),
      ),
    );
  }
  const TWO_TARGETS = [
    { kind: "project", target_id: "proj-1", label: "Launch Project", status: "ACTIVE", created_at: new Date().toISOString() },
    { kind: "workspace", target_id: "ws-1", label: "Launch Workspace", status: "ACTIVE", created_at: new Date().toISOString() },
  ];

  it("the Assign affordance renders ONLY on NEEDS_PROJECT_OR_WORKSPACE cards that carry the stable person id", async () => {
    const withContext = growthWithNeedsProject();
    const noContext = growthWithNeedsProject();
    delete (noContext.growth.recommendations[0] as Record<string, unknown>).context;
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () => HttpResponse.json(withContext)),
    );
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByTestId("dandelion-assign-open")).toBeInTheDocument(),
    );
    // The item exposes the STABLE person id as a DOM hook (never a display
    // name) so live smokes can target the right card by identity.
    expect(screen.getByTestId("dandelion-growth-item")).toHaveAttribute(
      "data-person-entity-id",
      withContext.growth.recommendations[0]?.context?.person_entity_id,
    );
    cleanup();
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () => HttpResponse.json(noContext)),
    );
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByTestId("dandelion-growth-card")).toBeInTheDocument(),
    );
    // Context missing + other kinds → no assign affordance anywhere.
    expect(screen.queryByTestId("dandelion-assign-open")).toBeNull();
  });

  it("the picker loads org targets grouped Projects / Workspaces, human labels only", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithNeedsProject()),
      ),
    );
    mockTargets(TWO_TARGETS);
    renderWithProviders(<Collaboration />);
    await waitFor(() => expect(screen.getByTestId("dandelion-assign-open")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("dandelion-assign-open"));
    const picker = await screen.findByTestId("dandelion-assign-picker");
    expect(picker).toHaveTextContent("Choose where Shweta should start.");
    expect(picker).toHaveTextContent("Projects");
    expect(picker).toHaveTextContent("Workspaces");
    const buttons = await screen.findAllByTestId("dandelion-assign-target");
    expect(buttons).toHaveLength(2);
    expect(picker).toHaveTextContent("Launch Project");
    expect(picker).toHaveTextContent("Launch Workspace");
    // Stable ids drive the buttons but are never rendered as copy.
    expect(picker.textContent).not.toContain("proj-1");
    expect(picker.textContent).not.toContain("ent-shweta");
  });

  it("no targets → honest empty copy, no fake action", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithNeedsProject()),
      ),
    );
    renderWithProviders(<Collaboration />); // default targets handler: []
    await waitFor(() => expect(screen.getByTestId("dandelion-assign-open")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("dandelion-assign-open"));
    const empty = await screen.findByTestId("dandelion-assign-empty");
    expect(empty).toHaveTextContent("No active projects or workspaces yet.");
    expect(empty).toHaveTextContent("Create or activate a project/workspace first.");
    expect(screen.queryByTestId("dandelion-assign-target")).toBeNull();
  });

  it("assigning posts STABLE ids and the card disappears only after the server recompute drops it", async () => {
    let assignBody: Record<string, unknown> | null = null;
    let assigned = false;
    server.use(
      // The growth feed flips once the assignment lands (server truth).
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(
          assigned
            ? { ok: true, growth: { headline: "Your organization looks healthy this week.", recommendations: [], signals: { members_count: 4, external_collaborators_count: 0, unowned_external_count: 0, members_without_project_count: 0 }, generated_at: new Date().toISOString() } }
            : growthWithNeedsProject(),
        ),
      ),
      http.post(`${API_BASE}/org/assignments`, async ({ request }) => {
        assignBody = (await request.json()) as Record<string, unknown>;
        assigned = true;
        return HttpResponse.json({
          ok: true,
          target_kind: assignBody.target_kind,
          target_id: assignBody.target_id,
          person_entity_id: assignBody.person_entity_id,
          membership_id: "mem-1",
          audit_event_id: "audit-1",
        });
      }),
    );
    mockTargets(TWO_TARGETS);
    renderWithProviders(<Collaboration />);
    await waitFor(() => expect(screen.getByTestId("dandelion-assign-open")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("dandelion-assign-open"));
    const buttons = await screen.findAllByTestId("dandelion-assign-target");
    // Pick the WORKSPACE (second) — proves kind+id travel together.
    await userEvent.click(buttons[1]!);
    await waitFor(() => expect(assignBody).not.toBeNull());
    expect(assignBody).toEqual({
      person_entity_id: "ent-shweta",
      target_kind: "workspace",
      target_id: "ws-1",
    });
    // The card leaves only via the server refetch (the truth changed).
    await waitFor(() =>
      expect(screen.queryByTestId("dandelion-growth-item")).toBeNull(),
    );
  });

  it("no optimistic hiding: while the server still returns the recommendation, a successful assign shows the success note and the card STAYS", async () => {
    server.use(
      // The growth feed keeps returning the rec (recompute hasn't dropped it).
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithNeedsProject()),
      ),
      http.post(`${API_BASE}/org/assignments`, () =>
        HttpResponse.json({
          ok: true,
          target_kind: "project",
          target_id: "proj-1",
          person_entity_id: "ent-shweta",
          membership_id: "mem-1",
          audit_event_id: "audit-1",
        }),
      ),
    );
    mockTargets(TWO_TARGETS);
    renderWithProviders(<Collaboration />);
    await waitFor(() => expect(screen.getByTestId("dandelion-assign-open")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("dandelion-assign-open"));
    const buttons = await screen.findAllByTestId("dandelion-assign-target");
    await userEvent.click(buttons[0]!);
    const success = await screen.findByTestId("dandelion-assign-success");
    expect(success).toHaveTextContent("Recorded in your organization's audit trail");
    // Nothing hidden optimistically — the item is still there until the
    // server recompute drops it.
    expect(screen.getByTestId("dandelion-growth-item")).toBeInTheDocument();
  });

  it("a failed assignment keeps the card and shows human copy — never a raw code", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithNeedsProject()),
      ),
      http.post(`${API_BASE}/org/assignments`, () =>
        HttpResponse.json({ ok: false, code: "TARGET_NOT_FOUND" }, { status: 404 }),
      ),
    );
    mockTargets(TWO_TARGETS);
    renderWithProviders(<Collaboration />);
    await waitFor(() => expect(screen.getByTestId("dandelion-assign-open")).toBeInTheDocument());
    await userEvent.click(screen.getByTestId("dandelion-assign-open"));
    const buttons = await screen.findAllByTestId("dandelion-assign-target");
    await userEvent.click(buttons[0]!);
    const err = await screen.findByTestId("dandelion-assign-error");
    expect(err).toHaveTextContent("That project or workspace no longer exists.");
    expect(err.textContent).not.toContain("TARGET_NOT_FOUND");
    // The card stays — nothing was hidden on failure.
    expect(screen.getByTestId("dandelion-growth-item")).toBeInTheDocument();
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

// ── [GAP-B] The truthful full setup queue behind the capped card list ────────

function growthWithFullQueue() {
  const base = growthWithNeedsProject();
  base.growth.headline = "Otzar found 5 ways to strengthen your organization this week.";
  base.growth.signals.members_without_project_count = 10;
  (base.growth as Record<string, unknown>).needs_first_project_people = [
    { person_entity_id: "ent-shweta", display_name: "Shweta" },
    ...Array.from({ length: 9 }, (_, i) => ({
      person_entity_id: `ent-q${i + 1}`,
      display_name: `Queued Person ${i + 1}`,
    })),
  ];
  return base;
}

describe("[GAP-B] full setup queue — the surface never understates the scale", () => {
  it("10 total, 1 card → truthful 'Showing 1 of 10' + a server-backed queue of the other 9 with real assign", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithFullQueue()),
      ),
    );
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByTestId("dandelion-queue-copy")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("dandelion-queue-copy")).toHaveTextContent(
      "Showing 1 of 10 people who need a first project or workspace.",
    );
    // Calm by default: the queue expands on demand.
    expect(screen.queryByTestId("dandelion-queue")).toBeNull();
    const toggle = screen.getByTestId("dandelion-queue-toggle");
    expect(toggle).toHaveTextContent("Show the 9 more");
    await userEvent.click(toggle);
    const items = screen.getAllByTestId("dandelion-queue-item");
    expect(items).toHaveLength(9);
    // Server-backed people only — the carded person is not duplicated.
    for (const it of items) {
      expect(it).not.toHaveTextContent("Shweta");
      expect(it).toHaveTextContent("needs a first project or workspace");
    }
    // The queue carries the REAL assign rail, stable-id keyed.
    expect(items[0]?.getAttribute("data-person-entity-id")).toBe("ent-q1");
    const assigns = items
      .map((it) => it.querySelector('[data-testid="dandelion-assign-open"]'))
      .filter((el) => el !== null);
    expect(assigns).toHaveLength(9);
    // No developer language anywhere on the card.
    const card = screen.getByTestId("dandelion-growth-card");
    for (const banned of ["MAX_RECOMMENDATIONS", "signals", "ent-q1", "uncapped"]) {
      expect(card.textContent ?? "").not.toContain(banned);
    }
  });

  it("no overflow → no scale copy (exactly as many cards as people)", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json({
          ...growthWithNeedsProject(),
          growth: {
            ...growthWithNeedsProject().growth,
            needs_first_project_people: [
              { person_entity_id: "ent-shweta", display_name: "Shweta" },
            ],
          },
        }),
      ),
    );
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByTestId("dandelion-growth-card")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("dandelion-queue-copy")).toBeNull();
    expect(screen.queryByTestId("dandelion-queue-toggle")).toBeNull();
  });

  it("an older backend without the queue field renders exactly as before", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithNeedsProject()),
      ),
    );
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByTestId("dandelion-growth-card")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("dandelion-queue-copy")).toBeNull();
    expect(screen.getByTestId("dandelion-assign-open")).toBeInTheDocument();
  });

  it("'Hide for now' hides the card but never changes the truthful scale copy", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/dandelion/org-growth`, () =>
        HttpResponse.json(growthWithFullQueue()),
      ),
    );
    renderWithProviders(<Collaboration />);
    await waitFor(() =>
      expect(screen.getByTestId("dandelion-queue-copy")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getAllByTestId("dandelion-growth-dismiss")[0]!);
    // Card gone (session-local) — the scale copy stays true to server truth.
    expect(screen.queryAllByTestId("dandelion-growth-item")).toHaveLength(0);
    expect(screen.getByTestId("dandelion-queue-copy")).toHaveTextContent(
      "Showing 1 of 10",
    );
  });
});
