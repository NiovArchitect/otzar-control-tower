// FILE: tests/unit/org-setup.test.tsx
// PURPOSE: [GAP-U SLICE-1] the Organization Setup page: read-only
//          composition of existing truth into a guided journey. Locks:
//          (1) empty-org, partial, and ready-ish states render honestly;
//          (2) the deterministic next-best-step priority;
//          (3) the leak sweep — no UUIDs, no raw backend enums, no raw
//              activation statuses, no autonomy tokens;
//          (4) the overclaim sweep — no "email sent", no fake "ingesting",
//              no "retention configured", no self-serve claims;
//          (5) every primary action links to a registered existing route;
//          (6) page load fires GET requests ONLY (no writes, ever).
// CONNECTS TO: src/pages/OrgSetup.tsx, src/lib/setup/setup-journey.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { OrgSetupPage } from "@/pages/OrgSetup";
import { deriveSetupJourney, type SetupInputs } from "@/lib/setup/setup-journey";

const API = "http://localhost:3000/api/v1";

// Routes registered in App.tsx that setup actions may point to.
const REGISTERED = new Set([
  "/",
  "/users",
  "/ai-teammates",
  "/tools-connections",
  "/data-knowledge",
  "/organization-seeding",
  "/settings",
]);

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const RAW_ENUM_RE =
  /EXECUTIVE_OVERRIDE|APPROVAL_REQUIRED|activation_pending|SEED_NEEDS_REVIEW|APP_CREDENTIALS_MISSING|READY_FOR_CONSENT|CONNECTED_UNVERIFIED|not_configured|needs_setup/;

function person(id: string, activation: string, status = "ACTIVE") {
  return {
    entity_id: `00000000-0000-0000-0000-0000000000${id}`,
    entity_type: "PERSON",
    display_name: `Person ${id}`,
    email: `p${id}@org.test`,
    status,
    clearance_level: 4,
    public_key: "pk",
    failed_auth_attempts: 0,
    suspended_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    activation_status: activation,
  };
}

function twin(ownerIdSuffix: string, readiness: string, roleTemplate: string | null) {
  return {
    entity_id: `11111111-0000-0000-0000-0000000000${ownerIdSuffix}`,
    display_name: `Twin ${ownerIdSuffix}`,
    status: "ACTIVE",
    created_at: "2026-01-01T00:00:00Z",
    config: { twin_id: "t", autonomy_level: "APPROVAL_REQUIRED", role_template: roleTemplate },
    owner_entity_id: `00000000-0000-0000-0000-0000000000${ownerIdSuffix}`,
    owner_display_name: `Person ${ownerIdSuffix}`,
    tool_readiness: {
      status: readiness,
      missing_tools: [],
      connected_tools_count: 0,
      required_tools_count: 0,
    },
  };
}

const ORG = "99999999-0000-0000-0000-000000000000";

function mockAll(over: {
  people?: unknown[];
  memberships?: unknown[];
  twins?: unknown[];
  providers?: unknown[];
  seeds?: unknown[];
  analytics?: Record<string, unknown>;
  settings?: Record<string, unknown>;
} = {}) {
  server.use(
    http.get(`${API}/org/entities`, () =>
      HttpResponse.json({ ok: true, items: over.people ?? [], total: (over.people ?? []).length, skip: 0, take: 250 }),
    ),
    http.get(`${API}/org/hierarchy`, () =>
      HttpResponse.json({ ok: true, org_entity_id: ORG, memberships: over.memberships ?? [] }),
    ),
    http.get(`${API}/org/ai-teammates`, () =>
      HttpResponse.json({
        ok: true,
        items: over.twins ?? [],
        total: (over.twins ?? []).length,
        skip: 0,
        take: 100,
        twin_autonomy_ceiling: "APPROVAL_REQUIRED",
      }),
    ),
    http.get(`${API}/connectors/oauth/status`, () =>
      HttpResponse.json({ ok: true, providers: over.providers ?? [] }),
    ),
    http.get(`${API}/org/dandelion/seeds`, () =>
      HttpResponse.json({ ok: true, seeds: over.seeds ?? [] }),
    ),
    http.get(`${API}/org/analytics`, () =>
      HttpResponse.json({
        ok: true,
        org_entity_id: ORG,
        pending_approvals_count: 0,
        active_twins: 0,
        capsule_count: 0,
        compound_score: 0,
        decision_count: 0,
        pattern_count: 0,
        vocab_count: 0,
        external_count: 0,
        completion_rate: 0,
        ...(over.analytics ?? {}),
      }),
    ),
    http.get(`${API}/org/settings`, () =>
      HttpResponse.json({
        ok: true,
        settings: {
          require_human_approval: true,
          audit_ai_actions: true,
          twin_autonomy_ceiling: "APPROVAL_REQUIRED",
          industry: null,
          default_jurisdiction: null,
          ...(over.settings ?? {}),
        },
      }),
    ),
  );
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OrgSetupPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  // no default handlers — each test declares its truth
});

describe("[GAP-U] Organization Setup — guided read-only journey", () => {
  it("empty org: next step is inviting people; nothing overclaims; GET-only", async () => {
    const methods: string[] = [];
    server.events.on("request:start", ({ request }) => {
      methods.push(request.method);
    });
    mockAll();
    renderPage();
    const next = await screen.findByTestId("setup-next-step");
    expect(next.textContent).toContain("Invite your first team members");
    // All seven sections render.
    for (const key of ["foundation", "people", "roles", "twins", "tools", "governance", "workflows"]) {
      expect(screen.getByTestId(`setup-section-${key}`)).toBeInTheDocument();
    }
    const body = document.body.textContent ?? "";
    // Leak sweep.
    expect(body).not.toMatch(UUID_RE);
    expect(body).not.toMatch(RAW_ENUM_RE);
    // Overclaim sweep.
    expect(body).not.toMatch(/email sent|invite delivered/i);
    expect(body).not.toMatch(/self-serve onboarding/i);
    expect(body).toContain("Bulk import is not available yet");
    expect(body).toContain("Retention controls are not configurable in-product yet");
    // Read-only proof: only GETs fired.
    await waitFor(() => expect(methods.length).toBeGreaterThan(0));
    expect(methods.every((m) => m === "GET")).toBe(true);
  });

  it("partial org: activation blockers outrank roles; counts read as repair guidance", async () => {
    mockAll({
      people: [person("01", "active"), person("02", "activation_pending"), person("03", "expired")],
      memberships: [
        { membership_id: "m1", parent_id: ORG, child_id: person("01", "active").entity_id, role_title: "ADMIN", department: null, hierarchy_level: 0, is_admin: true, is_active: true, created_at: "2026-01-01T00:00:00Z" },
      ],
      twins: [twin("01", "not_configured", null)],
    });
    renderPage();
    const next = await screen.findByTestId("setup-next-step");
    expect(next.textContent).toContain("finish activation");
    const people = screen.getByTestId("setup-section-people");
    expect(people.textContent).toContain("1 person is waiting on activation");
    expect(people.textContent).toContain("1 activation link has expired");
    expect(people.textContent).toContain("admin-level authority");
    expect(people.textContent).toContain("minimum access");
    // Hierarchy ≠ permission copy present.
    expect(screen.getByTestId("setup-section-roles").textContent).toContain(
      "it is not permission",
    );
    // Twin truth: never "ready" when the projection says otherwise.
    const twins = screen.getByTestId("setup-section-twins");
    expect(twins.textContent).toContain("still needs setup before Otzar can call them ready");
    expect(twins.textContent).not.toMatch(/Teammates are ready/);
  });

  it("ready-ish org: connector honesty (connected ≠ ingesting) and seeds review as next step", async () => {
    const activePeople = [person("01", "active"), person("02", "active")];
    mockAll({
      people: activePeople,
      memberships: [
        { membership_id: "m1", parent_id: ORG, child_id: activePeople[0]!.entity_id, role_title: "ADMIN", department: null, hierarchy_level: 0, is_admin: true, is_active: true, created_at: "2026-01-01T00:00:00Z" },
        { membership_id: "m2", parent_id: activePeople[0]!.entity_id, child_id: activePeople[1]!.entity_id, role_title: null, department: null, hierarchy_level: 1, is_admin: false, is_active: true, created_at: "2026-01-01T00:00:00Z" },
        { membership_id: "m3", parent_id: activePeople[1]!.entity_id, child_id: activePeople[0]!.entity_id, role_title: null, department: null, hierarchy_level: 1, is_admin: false, is_active: true, created_at: "2026-01-01T00:00:00Z" },
      ],
      twins: [twin("01", "ready", "operations"), twin("02", "ready", "engineering")],
      providers: [
        { provider: "ZOOM", display_name: "Zoom", slug: "zoom", app_credentials_present: true, status: "VERIFIED", scopes: [], account_label: "Org", connected_at: "2026-01-01T00:00:00Z", last_verified_at: null, redirect_uri: "" },
        { provider: "SLACK", display_name: "Slack", slug: "slack", app_credentials_present: false, status: "APP_CREDENTIALS_MISSING", scopes: [], account_label: null, connected_at: null, last_verified_at: null, redirect_uri: "" },
      ],
      seeds: [{ seed_id: "s", seed_type: "grant_tool_access", subject_name: "D", subject_entity_id: null, subject_key: "k", recommended_action: "r", source_evidence: null, source_conversation_id: null, confidence: "low", approval_required: true, policy_status: "needs_review", sensitivity: "internal", risk_if_ignored: null, status: "SEED_NEEDS_REVIEW", resulting_action: null, rejection_reason: null, hold_reason: null, reviewed: false, created_at: "2026-01-01T00:00:00Z" }],
      analytics: { decision_count: 12, capsule_count: 3 },
    });
    renderPage();
    const tools = await screen.findByTestId("setup-section-tools");
    expect(tools.textContent).toContain("ambient ingestion is not automatic yet");
    expect(tools.textContent).toContain("not available yet");
    const workflows = screen.getByTestId("setup-section-workflows");
    expect(workflows.textContent).toContain("Work is flowing");
    const next = screen.getByTestId("setup-next-step");
    expect(next.textContent).toContain("Review 1 suggestion in Organization Seeding");
    // Every action link targets a registered route.
    // Button asChild renders the Link AS the testid element itself.
    for (const key of ["foundation", "people", "roles", "twins", "tools", "governance", "workflows"]) {
      const el = screen.getByTestId(`setup-action-${key}`);
      const href = el.getAttribute("href") ?? el.querySelector("a")?.getAttribute("href") ?? "";
      expect(REGISTERED.has(href)).toBe(true);
    }
    const nextEl = screen.getByTestId("setup-next-step-link");
    const nextHref = nextEl.getAttribute("href") ?? nextEl.querySelector("a")?.getAttribute("href") ?? "";
    expect(REGISTERED.has(nextHref)).toBe(true);
  });
});

describe("[GAP-U] deriveSetupJourney — deterministic priority", () => {
  const base: SetupInputs = {
    people: [],
    memberships: [],
    orgEntityId: ORG,
    twins: [],
    twinAutonomyCeiling: "APPROVAL_REQUIRED",
    connectors: [],
    seeds: [],
    analytics: null,
    settings: { require_human_approval: true, audit_ai_actions: true },
  };

  it("walks the priority ladder: activate → roles → managers → tools → ingest", () => {
    expect(deriveSetupJourney(base).nextStep.title).toContain("Invite your first team members");

    const p1 = person("01", "active");
    const withUnroled = { ...base, people: [p1] as never };
    expect(deriveSetupJourney(withUnroled).nextStep.title).toContain("Assign roles");

    const withRole = {
      ...withUnroled,
      twins: [twin("01", "ready", "ops")] as never,
    };
    expect(deriveSetupJourney(withRole).nextStep.title).toContain("Map managers");

    const withManager = {
      ...withRole,
      memberships: [
        { membership_id: "m", parent_id: "boss", child_id: p1.entity_id, role_title: null, department: null, hierarchy_level: 1, is_admin: false, is_active: true, created_at: "" },
      ] as never,
    };
    expect(deriveSetupJourney(withManager).nextStep.title).toContain("Connect your first tool");

    const withTool = {
      ...withManager,
      connectors: [
        { provider: "ZOOM", display_name: "Zoom", slug: "zoom", app_credentials_present: true, status: "VERIFIED", scopes: [], account_label: null, connected_at: null, last_verified_at: null, redirect_uri: "" },
      ] as never,
    };
    expect(deriveSetupJourney(withTool).nextStep.title).toContain("Ingest your first conversation");
  });

  it("unloadable truth renders honest 'couldn't check' — never invented state", () => {
    const j = deriveSetupJourney({
      ...base,
      people: null,
      twins: null,
      connectors: null,
      settings: null,
      seeds: null,
      analytics: null,
      memberships: null,
    });
    const labels = j.sections.map((s) => s.stateLabel);
    expect(labels.filter((l) => l === "Couldn't check").length).toBeGreaterThanOrEqual(4);
    const allText = JSON.stringify(j);
    expect(allText).not.toMatch(RAW_ENUM_RE);
  });
});
