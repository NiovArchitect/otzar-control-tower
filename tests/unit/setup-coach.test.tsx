// FILE: tests/unit/setup-coach.test.tsx
// PURPOSE: [GAP-U SLICE-5] the setup coach: grouped recommendations derived
//          from the shared setup facts — one per category (never per
//          person), stable keys, disappears when fixed, quiet when nothing
//          needs coaching, clearly separated from operational work, every
//          recommendation carrying a repair path. Copy sweep bans task/
//          system/enum language and AI overclaims.
// CONNECTS TO: src/lib/setup/setup-coach.ts, src/pages/OrgSetup.tsx.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { OrgSetupPage } from "@/pages/OrgSetup";
import { deriveSetupCoach } from "@/lib/setup/setup-coach";
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

describe("[GAP-U SLICE-5] deriveSetupCoach — grouped, deduped, quiet when fixed", () => {
  it("groups per CATEGORY, never per person — 5 waiting people = ONE recommendation", () => {
    const recs = deriveSetupCoach({
      ...base,
      people: [
        person("01", "activation_pending"), person("02", "activation_pending"),
        person("03", "activation_pending"), person("04", "activation_pending"),
        person("05", "activation_pending"),
      ] as never,
    });
    const stalls = recs.filter((r) => r.key === "activation_stall");
    expect(stalls.length).toBe(1);
    expect(stalls[0]!.label).toBe("5 invited people haven't activated Otzar yet.");
    // Stable keys — a second derivation is identical (no re-mint drift).
    const again = deriveSetupCoach({
      ...base,
      people: [
        person("01", "activation_pending"), person("02", "activation_pending"),
        person("03", "activation_pending"), person("04", "activation_pending"),
        person("05", "activation_pending"),
      ] as never,
    });
    expect(again).toEqual(recs);
  });

  it("recommendations DISAPPEAR when the issue is fixed; a healthy flowing org coaches nothing", () => {
    const stalled = deriveSetupCoach({
      ...base,
      people: [person("01", "activation_pending")] as never,
    });
    expect(stalled.some((r) => r.key === "activation_stall")).toBe(true);
    const fixed = deriveSetupCoach({
      ...base,
      people: [person("01", "active")] as never,
      twins: [
        {
          entity_id: "11111111-0000-0000-0000-000000000001",
          display_name: "T", status: "ACTIVE", created_at: "",
          config: { twin_id: "t", autonomy_level: "APPROVAL_REQUIRED", role_template: "ops" },
          owner_entity_id: person("01", "active").entity_id,
          owner_display_name: "Person 01",
          tool_readiness: { status: "ready", missing_tools: [], connected_tools_count: 1, required_tools_count: 1 },
        },
      ] as never,
      analytics: {
        ok: true, org_entity_id: ORG, pending_approvals_count: 0, active_twins: 1,
        capsule_count: 2, compound_score: 0, decision_count: 5, pattern_count: 0,
        vocab_count: 0, external_count: 0, completion_rate: 1,
      } as never,
    });
    expect(fixed.some((r) => r.key === "activation_stall")).toBe(false);
    // One active person, roled, ready twin, work flowing, no seeds → quiet.
    expect(fixed).toEqual([]);
    // Unloaded truth never coaches (no guessing).
    expect(deriveSetupCoach({ ...base, people: null })).toEqual([]);
  });

  it("first-workflow coaching points at the REAL Comms route; every recommendation has a repair path", () => {
    const recs = deriveSetupCoach({
      ...base,
      people: [person("01", "active")] as never,
    });
    const first = recs.find((r) => r.key === "first_workflow_pending");
    expect(first?.repair.to).toBe("/app/comms");
    for (const r of recs) {
      expect(r.repair.to.startsWith("/")).toBe(true);
      expect(r.whyItMatters.length).toBeGreaterThan(0);
      expect(typeof r.blocksGoLive).toBe("boolean");
    }
  });
});

describe("[GAP-U SLICE-5] setup coach card — calm, separated, honest", () => {
  function mockAll(over: { people?: unknown[] } = {}) {
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
      http.get(`${API}/connectors/oauth/status`, () => HttpResponse.json({ ok: true, providers: [] })),
      http.get(`${API}/org/dandelion/seeds`, () => HttpResponse.json({ ok: true, seeds: [] })),
      http.get(`${API}/org/analytics`, () =>
        HttpResponse.json({
          ok: true, org_entity_id: ORG, pending_approvals_count: 0, active_twins: 0,
          capsule_count: 0, compound_score: 0, decision_count: 0, pattern_count: 0,
          vocab_count: 0, external_count: 0, completion_rate: 0,
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
          <OrgSetupPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("renders 'Otzar noticed' with the separation promise, max 3 items, no chore/enum language", async () => {
    mockAll({
      people: [
        person("01", "active"),
        person("02", "activation_pending"),
        person("03", "expired"),
        person("04", "invited"),
      ],
    });
    const coach = await screen.findByTestId("setup-coach");
    expect(coach.textContent).toContain("Otzar noticed");
    expect(coach.textContent).toContain("separate from your team's operational work");
    expect(coach.textContent).toContain("disappears once it's fixed");
    // Max 3 rendered even though more categories fired.
    const items = coach.querySelectorAll("li");
    expect(items.length).toBeLessThanOrEqual(3);
    const body = coach.textContent ?? "";
    expect(body).not.toMatch(/task generated|system seed|seed_type|AI decided|error/i);
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
  });

  it("a quiet org renders NO coach card — silence, not an empty box", async () => {
    mockAll({ people: [] });
    await screen.findByTestId("setup-summary");
    expect(screen.queryByTestId("setup-coach")).toBeNull();
  });
});
