// FILE: organization-seeding.test.tsx
// PURPOSE: Admin Organization Seeding is oversight only (ambient DGI law:
//          users do not live in Otzar). Renders governed seeds (human-readable,
//          no raw IDs). Tool/identity seeds: Approve setup / Hold / Dismiss.
//          Structure seeds: ambient copy + Hold/Dismiss only (managers place).
//          Never auto-grants (server-enforced).

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { useAuthStore } from "@/lib/stores/auth";
import { OrganizationSeedingPage } from "@/pages/OrganizationSeeding";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  } as never);
}

function seed(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    seed_id: "led-seed-1",
    seed_type: "grant_tool_access",
    subject_name: "David",
    recommended_action: "GitHub is needed but isn't ready — an admin should connect/authorize it.",
    source_evidence: "David owns the repo access work",
    source_conversation_id: "conv-1",
    confidence: "high",
    approval_required: true,
    policy_status: "needs_review",
    sensitivity: "internal",
    risk_if_ignored: "The committed work is blocked until the tool is connected.",
    status: "SEED_NEEDS_REVIEW",
    resulting_action: null,
    rejection_reason: null,
    hold_reason: null,
    reviewed: false,
    created_at: new Date().toISOString(),
    ...over,
  };
}

function mockSeeds(seeds: ReadonlyArray<Record<string, unknown>>): void {
  server.use(http.get(`${API_BASE}/org/dandelion/seeds`, () => HttpResponse.json({ ok: true, seeds })));
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <OrganizationSeedingPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setAuth();
});

describe("Organization Seeding — admin seed queue", () => {
  it("renders a seed with its human-readable action, evidence, and review controls", async () => {
    mockSeeds([seed()]);
    renderPage();
    const card = await screen.findByTestId("org-seed-card");
    expect(card.textContent).toMatch(/Tool access needed/);
    expect(card.textContent).toMatch(/David/);
    expect(card.textContent).toMatch(/GitHub is needed/);
    expect(screen.getByTestId("org-seed-evidence").textContent).toMatch(/repo access work/);
    // Tool seeds: Approve setup / Hold / Dismiss (not admin placement theater).
    expect(screen.getByTestId("org-seed-approve")).toHaveTextContent(/Approve setup/i);
    expect(screen.getByTestId("org-seed-hold")).toBeInTheDocument();
    expect(screen.getByTestId("org-seed-reject")).toBeInTheDocument();
    // No raw ledger id leaks as visible text.
    expect(card.textContent).not.toContain("led-seed-1");
  });

  it("structure seeds: ambient default + admin assign exception when needed", async () => {
    mockSeeds([
      seed({
        seed_id: "led-struct-1",
        seed_type: "add_project_membership",
        subject_name: "Alex",
        recommended_action: "Place Alex on a first project",
        source_evidence: "Alex has no active project membership",
      }),
    ]);
    server.use(
      http.get(`${API_BASE}/org/assignment-targets`, () =>
        HttpResponse.json({
          ok: true,
          targets: [
            { target_id: "proj-1", kind: "project", label: "Launch" },
          ],
        }),
      ),
    );
    let approvedBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/org/dandelion/seeds/:id/approve`, async ({ request }) => {
        approvedBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          ok: true,
          seed: seed({
            seed_id: "led-struct-1",
            seed_type: "add_project_membership",
            status: "SEED_APPROVED",
            resulting_action: "Placed on project",
          }),
        });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    const ambient = await screen.findByTestId("org-seed-structure-ambient");
    expect(ambient.textContent).toMatch(/manager or project lead/i);
    expect(ambient.textContent).toMatch(/assign.*yourself when needed/i);
    // Admin exception path is available — not the only path.
    const select = await screen.findByTestId("org-seed-project-select");
    await user.selectOptions(select, "proj-1");
    await user.click(screen.getByTestId("org-seed-assign-project"));
    await waitFor(() => expect(approvedBody).toEqual({ project_id: "proj-1" }));
    expect(screen.getByTestId("org-seed-hold")).toHaveTextContent(/Hold oversight/i);
    expect(screen.getByTestId("org-seed-reject")).toHaveTextContent(/Dismiss signal/i);
  });

  it("Approve setup calls the governed endpoint (server enforces no auto-grant)", async () => {
    let approved: string | null = null;
    mockSeeds([seed()]);
    server.use(
      http.post(`${API_BASE}/org/dandelion/seeds/:id/approve`, ({ params }) => {
        approved = params.id as string;
        return HttpResponse.json({ ok: true, seed: seed({ status: "SEED_APPROVED", resulting_action: "setup action created — access is NOT granted automatically" }) });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("org-seed-approve");
    await user.click(screen.getByTestId("org-seed-approve"));
    await waitFor(() => expect(approved).toBe("led-seed-1"));
  });

  it("shows an admin-only message when the API denies a non-admin", async () => {
    server.use(http.get(`${API_BASE}/org/dandelion/seeds`, () => HttpResponse.json({ ok: false, code: "OPERATION_NOT_PERMITTED" }, { status: 403 })));
    renderPage();
    expect(await screen.findByTestId("org-seeding-denied")).toHaveTextContent(/organization admins/i);
  });

  it("shows a calm empty state when there are no suggestions", async () => {
    mockSeeds([]);
    renderPage();
    const empty = await screen.findByTestId("org-seeding-empty");
    expect(empty).toHaveTextContent(/Nothing needs oversight right now/i);
    expect(empty).toHaveTextContent(/people do not live on this page/i);
  });

  it("oversight strip states ambient path — not a daily placement home", async () => {
    mockSeeds([]);
    renderPage();
    const strip = await screen.findByTestId("dandelion-order-strip");
    expect(strip.textContent).toMatch(/What you do here/i);
    expect(strip.textContent).toMatch(/ambient for managers|hierarchy/i);
    expect(screen.getByTestId("dandelion-sync-growth")).toHaveTextContent(
      /Refresh structure signals/i,
    );
  });
});

describe("Organization Seeding — grouped queues (P0E scale)", () => {
  it("five suggestions for the same person render as ONE grouped card, not five", async () => {
    mockSeeds([
      seed({ seed_id: "s1", seed_type: "confirm_or_activate_person", subject_name: "David", subject_key: "name:david", recommended_action: "Confirm or activate David", source_conversation_id: "c1" }),
      seed({ seed_id: "s2", seed_type: "confirm_or_activate_person", subject_name: "David", subject_key: "name:david", recommended_action: "Confirm or activate David", source_conversation_id: "c2" }),
      seed({ seed_id: "s3", seed_type: "confirm_or_activate_person", subject_name: "David", subject_key: "name:david", recommended_action: "Confirm or activate David", source_conversation_id: "c3" }),
      seed({ seed_id: "s4", seed_type: "confirm_or_activate_person", subject_name: "David", subject_key: "name:david", recommended_action: "Confirm or activate David", source_conversation_id: "c4" }),
      seed({ seed_id: "s5", seed_type: "confirm_or_activate_person", subject_name: "David", subject_key: "name:david", recommended_action: "Confirm or activate David", source_conversation_id: "c5" }),
    ]);
    renderPage();
    await screen.findByTestId("org-seeding-queues");
    // One grouped card for David (not five separate person cards).
    const groups = screen.getAllByTestId("org-seed-group");
    expect(groups).toHaveLength(1);
    expect(groups[0]!.getAttribute("data-subject-key")).toBe("name:david");
    // The People-to-review queue is present and the grouping is surfaced.
    expect(screen.getByTestId("org-seeding-queue-people_to_review")).toBeInTheDocument();
    expect(screen.getByText(/5 suggestions from 5 conversations/i)).toBeInTheDocument();
  });

  it("two distinct people are two grouped cards", async () => {
    mockSeeds([
      seed({ seed_id: "a", seed_type: "confirm_or_activate_person", subject_name: "David", subject_key: "name:david" }),
      seed({ seed_id: "b", seed_type: "confirm_or_activate_person", subject_name: "Dishant", subject_key: "name:dishant" }),
    ]);
    renderPage();
    await screen.findByTestId("org-seeding-queues");
    expect(screen.getAllByTestId("org-seed-group")).toHaveLength(2);
  });
});

// CX-SLICE-3 — "Review a meeting for follow-ups": the admin picks a
// recording; Otzar ingests it through the ONE governed pipeline. Consent
// stated; failures are sentences; Zoom-missing routes to Tools & Connections.
describe("Organization Seeding — meeting ingest card (CX-SLICE-3)", () => {
  function seedsEmpty() {
    server.use(
      http.get(`${API_BASE}/org/dandelion/seeds`, () =>
        HttpResponse.json({ ok: true, seeds: [] }),
      ),
    );
  }
  const RECORDING = {
    meeting_uuid: "uu-1", topic: "Launch sync", start_time: "2026-07-01T10:00:00Z",
    duration_minutes: 30, recording_count: 1, total_size_bytes: 100, file_types: ["TRANSCRIPT"],
  };

  it("lists recordings, ingests one, and shows where to look next", async () => {
    seedsEmpty();
    let posted: Record<string, unknown> | null = null;
    server.use(
      http.get(`${API_BASE}/zoom/recordings`, () =>
        HttpResponse.json({ ok: true, provider: "zoom", recordings: [RECORDING] }),
      ),
      http.post(`${API_BASE}/zoom/recordings/ingest`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ok: true, result: { work_items: [{}, {}], dandelion_seeds: [{}] } });
      }),
    );
    render(<MemoryRouter><OrganizationSeedingPage /></MemoryRouter>);
    await screen.findByText("Launch sync");
    await userEvent.click(screen.getByTestId("meeting-ingest-go"));
    const notice = await screen.findByTestId("meeting-ingest-notice");
    expect(notice).toHaveTextContent(/2 work items and 1 new seed/);
    expect(notice).toHaveTextContent(/Team Work/);
    expect(notice).toHaveTextContent(/Every step was recorded/);
    expect(posted).toEqual({ meeting_id: "uu-1" });
    // No raw provider material anywhere.
    expect(document.body.textContent).not.toMatch(/download_url|Bearer|access_token/);
  });

  it("Zoom not connected → honest copy + Connections deep link", async () => {
    seedsEmpty();
    server.use(
      http.get(`${API_BASE}/zoom/recordings`, () =>
        HttpResponse.json({ ok: false, code: "NOT_CONNECTED" }, { status: 409 }),
      ),
    );
    render(<MemoryRouter><OrganizationSeedingPage /></MemoryRouter>);
    const state = await screen.findByTestId("meeting-ingest-not-connected");
    expect(state).toHaveTextContent(/isn't connected/i);
    expect(state).toHaveTextContent(/Connect it in Connections/i);
    expect(state).not.toHaveTextContent(/Tools & Connections/i);
    expect(state.querySelector("a")).toHaveAttribute("href", "/tools-connections");
  });

  it("a non-admin (403 list) sees NO meeting card — no fake affordance", async () => {
    seedsEmpty();
    server.use(
      http.get(`${API_BASE}/zoom/recordings`, () =>
        HttpResponse.json({ ok: false, code: "SESSION_INVALID" }, { status: 403 }),
      ),
    );
    render(<MemoryRouter><OrganizationSeedingPage /></MemoryRouter>);
    await screen.findByTestId("org-seeding-empty");
    expect(screen.queryByTestId("meeting-ingest-card")).toBeNull();
  });

  it("no-transcript failure reads as a sentence, never a code", async () => {
    seedsEmpty();
    server.use(
      http.get(`${API_BASE}/zoom/recordings`, () =>
        HttpResponse.json({ ok: true, provider: "zoom", recordings: [RECORDING] }),
      ),
      http.post(`${API_BASE}/zoom/recordings/ingest`, () =>
        HttpResponse.json({ ok: false, code: "NO_TRANSCRIPT" }, { status: 404 }),
      ),
    );
    render(<MemoryRouter><OrganizationSeedingPage /></MemoryRouter>);
    await screen.findByText("Launch sync");
    await userEvent.click(screen.getByTestId("meeting-ingest-go"));
    const notice = await screen.findByTestId("meeting-ingest-notice");
    expect(notice).toHaveTextContent(/doesn't have a transcript/i);
    expect(notice).not.toHaveTextContent(/NO_TRANSCRIPT/);
  });
});

// ── [T-2] external-collaborator review seed — calm copy, review-first ──
describe("Organization Seeding — external collaborator review (T-2)", () => {
  it("renders the external review seed with calm human copy and NO raw enums/emails", async () => {
    mockSeeds([
      seed({
        seed_id: "led-seed-ext-1",
        seed_type: "review_external_party",
        subject_name: "Jordan Vale",
        recommended_action:
          'Review external contact "Jordan Vale" — track as a governed external collaborator?',
        source_evidence: "Jordan Vale: we will send the signed SOW Friday",
        risk_if_ignored:
          "External asks from this contact stay unlabeled and client context is lost.",
      }),
    ]);
    renderPage();
    const card = await screen.findByTestId("org-seed-card");
    expect(card.textContent).toMatch(/External collaborator review/);
    expect(card.textContent).toMatch(/Jordan Vale/);
    expect(card.textContent).toMatch(/track as a governed external collaborator/);
    // Approve exists (the governed promotion), and nothing claims auto-add.
    expect(screen.getByTestId("org-seed-approve")).toBeInTheDocument();
    expect(card.textContent).not.toContain("review_external_party");
    expect(card.textContent).not.toContain("led-seed-ext-1");
    expect(card.textContent).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i);
    expect(card.textContent).not.toMatch(/pipeline|deal stage/i);
  });
});

// ── [T-3C] the possible-match review chooser — admin decides, never silent ──
describe("Organization Seeding — external possible-match chooser (T-3C)", () => {
  const extSeed = () =>
    seed({
      seed_id: "led-seed-choose-1",
      seed_type: "review_external_party",
      subject_name: "Jordy Vale",
      recommended_action:
        'Review external contact "Jordy Vale" — track as a governed external collaborator?',
      possible_matches: [
        {
          external_collaborator_id: "col-1",
          display_label: "Jordan Vale",
          company_label: "Acme",
          relationship_label: "Client",
          reason: "Similar name in this account",
          confidence: "low",
        },
      ],
    });

  it("renders candidates with calm review-first copy and NO ids/emails", async () => {
    mockSeeds([extSeed()]);
    renderPage();
    const block = await screen.findByTestId("org-seed-possible-matches");
    expect(block.textContent).toContain("Possible existing collaborator. Review before linking.");
    expect(block.textContent).toContain("Otzar will not merge this automatically.");
    expect(block.textContent).toContain("Jordan Vale · Acme (Client)");
    expect(block.textContent).toContain("Similar name in this account");
    expect(block.textContent).not.toContain("col-1");
    expect(block.textContent).not.toMatch(/@|verified match|automatically matched|CRM/i);
  });

  it("Link to existing and Track as new post the explicit decision", async () => {
    const decisions: Array<Record<string, unknown>> = [];
    mockSeeds([extSeed()]);
    server.use(
      http.post(`${API_BASE}/org/dandelion/seeds/:id/approve`, async ({ request }) => {
        decisions.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, seed: extSeed() });
      }),
    );
    renderPage();
    await screen.findByTestId("org-seed-possible-matches");
    await userEvent.click(screen.getByTestId("org-seed-link-existing"));
    await waitFor(() => expect(decisions.length).toBe(1));
    expect(decisions[0]).toEqual({
      decision: "link_existing",
      link_external_collaborator_id: "col-1",
    });

    mockSeeds([extSeed()]);
    renderPage();
    const trackButtons = await screen.findAllByTestId("org-seed-track-new");
    await userEvent.click(trackButtons[trackButtons.length - 1]!);
    await waitFor(() => expect(decisions.length).toBe(2));
    expect(decisions[1]).toEqual({ decision: "track_new" });
  });
});
