// FILE: tests/unit/go-live.test.tsx
// PURPOSE: [GAP-U SLICE-4] the Go-Live Readiness Gate: deterministic
//          verdicts (not ready / needs admin setup / ready for first
//          workflow), next-step priority, founder actions labeled apart
//          from customer blockers, positive proof alongside problems, the
//          always-rendered self-serve limitation, leak + overclaim sweeps,
//          and GET-only loading.
// CONNECTS TO: src/lib/setup/go-live-readiness.ts, src/pages/GoLive.tsx.

import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { GoLivePage } from "@/pages/GoLive";
import { deriveGoLiveReadiness } from "@/lib/setup/go-live-readiness";
import type { SetupInputs } from "@/lib/setup/setup-journey";

const API = "http://localhost:3000/api/v1";
const ORG = "99999999-0000-0000-0000-000000000000";

function person(id: string, activation: string) {
  return {
    entity_id: `00000000-0000-0000-0000-0000000000${id}`,
    entity_type: "PERSON",
    display_name: `Person ${id}`,
    email: `p${id}@org.test`,
    status: "ACTIVE",
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

describe("[GAP-U SLICE-4] deriveGoLiveReadiness — deterministic verdicts", () => {
  it("empty org → Not ready; invited-only → Needs admin setup; one active → Ready for first workflow", () => {
    expect(deriveGoLiveReadiness(base).verdict).toBe("not_ready");
    expect(deriveGoLiveReadiness(base).nextStep.to).toBe("/setup/import-people");

    const invitedOnly = { ...base, people: [person("01", "activation_pending")] as never };
    const g2 = deriveGoLiveReadiness(invitedOnly);
    expect(g2.verdict).toBe("needs_admin_setup");
    expect(g2.nextStep.to).toBe("/users");

    const oneActive = { ...base, people: [person("01", "active")] as never };
    const g3 = deriveGoLiveReadiness(oneActive);
    expect(g3.verdict).toBe("ready_first_workflow");
    expect(g3.verdictLabel).toBe("Ready to run a first workflow");
    expect(g3.nextStep.title).toContain("Run the first workflow");
    // Pending others don't block once one person is active.
    const mixed = {
      ...base,
      people: [person("01", "active"), person("02", "activation_pending")] as never,
    };
    expect(deriveGoLiveReadiness(mixed).verdict).toBe("ready_first_workflow");
    expect(
      deriveGoLiveReadiness(mixed).warnings.some((w) => w.label.includes("still need activation")),
    ).toBe(true);
  });

  it("founder actions are ALWAYS listed apart, and the self-serve limitation always renders", () => {
    const g = deriveGoLiveReadiness({ ...base, people: [person("01", "active")] as never });
    expect(g.founderActions.length).toBeGreaterThanOrEqual(2);
    expect(g.founderActions.every((f) => f.severity === "founder_action")).toBe(true);
    expect(g.blockers.every((b) => b.severity === "blocker")).toBe(true);
    expect(g.limitation).toContain("does not mean founder-free self-serve onboarding is complete");
    // Positive proof exists alongside warnings.
    expect(g.readySignals.length).toBeGreaterThan(0);
  });

  it("warnings never fake-block: no roles / no managers / twins-not-ready / no tools stay warnings", () => {
    const g = deriveGoLiveReadiness({
      ...base,
      people: [person("01", "active")] as never,
      twins: [
        {
          entity_id: "11111111-0000-0000-0000-000000000001",
          display_name: "T",
          status: "ACTIVE",
          created_at: "",
          config: { twin_id: "t", autonomy_level: "APPROVAL_REQUIRED", role_template: null },
          owner_entity_id: person("01", "active").entity_id,
          owner_display_name: "Person 01",
          tool_readiness: { status: "not_configured", missing_tools: [], connected_tools_count: 0, required_tools_count: 0 },
        },
      ] as never,
    });
    expect(g.verdict).toBe("ready_first_workflow");
    expect(g.blockers).toEqual([]);
    const labels = g.warnings.map((w) => w.label).join(" | ");
    expect(labels).toMatch(/needs? a role/);
    expect(labels).toContain("no manager mapped");
    expect(labels).toContain("still need setup");
  });
});

describe("[GAP-U SLICE-4] GoLive page — calm, honest, read-only", () => {
  function mockAll(over: { people?: unknown[]; seeds?: unknown[]; analytics?: Record<string, unknown> } = {}) {
    server.use(
      http.get(`${API}/org/entities`, () =>
        HttpResponse.json({ ok: true, items: over.people ?? [], total: 0, skip: 0, take: 250 }),
      ),
      http.get(`${API}/org/hierarchy`, () =>
        HttpResponse.json({ ok: true, org_entity_id: ORG, memberships: [] }),
      ),
      http.get(`${API}/org/ai-teammates`, () =>
        HttpResponse.json({ ok: true, items: [], total: 0, skip: 0, take: 100, twin_autonomy_ceiling: "APPROVAL_REQUIRED" }),
      ),
      http.get(`${API}/connectors/oauth/status`, () =>
        HttpResponse.json({ ok: true, providers: [] }),
      ),
      http.get(`${API}/org/dandelion/seeds`, () =>
        HttpResponse.json({ ok: true, seeds: over.seeds ?? [] }),
      ),
      http.get(`${API}/org/analytics`, () =>
        HttpResponse.json({
          ok: true, org_entity_id: ORG, pending_approvals_count: 0, active_twins: 0,
          capsule_count: 0, compound_score: 0, decision_count: 0, pattern_count: 0,
          vocab_count: 0, external_count: 0, completion_rate: 0, ...(over.analytics ?? {}),
        }),
      ),
      http.get(`${API}/org/settings`, () =>
        HttpResponse.json({ ok: true, settings: { require_human_approval: true, audit_ai_actions: true } }),
      ),
    );
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <GoLivePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("ready state renders verdict + tally + limitation; no overclaim, no leaks; GET-only", async () => {
    const methods: string[] = [];
    server.events.on("request:start", ({ request }) => methods.push(request.method));
    mockAll({ people: [person("01", "active")], analytics: { decision_count: 4 }, seeds: [] });
    const verdict = await screen.findByTestId("go-live-verdict");
    expect(verdict.textContent).toContain("Ready to run a first workflow");
    expect(screen.getByTestId("go-live-tally").textContent).toContain("ready");
    expect(screen.getByTestId("go-live-limitation").textContent).toContain(
      "does not mean founder-free self-serve onboarding is complete",
    );
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/launch certified|production ready|fully onboarded|compliance ready|all integrations ready|self-serve complete/i);
    expect(body).not.toMatch(/retention (is )?configured/i);
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(body).not.toMatch(/EXECUTIVE_OVERRIDE|activation_pending|APP_CREDENTIALS_MISSING|not_configured/);
    // Founder actions section renders, labeled apart.
    expect(screen.getByTestId("go-live-section-founder").textContent).toContain("smoke organization");
    await waitFor(() => expect(methods.length).toBeGreaterThan(0));
    expect(methods.every((m) => m === "GET")).toBe(true);
  });

  it("empty org renders Not ready with the import next step", async () => {
    mockAll();
    const verdict = await screen.findByTestId("go-live-verdict");
    expect(verdict.textContent).toContain("Not ready yet");
    expect(screen.getByTestId("go-live-next-link").getAttribute("href")).toBe("/setup/import-people");
  });
});
