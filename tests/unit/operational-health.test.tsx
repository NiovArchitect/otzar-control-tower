// FILE: tests/unit/operational-health.test.tsx
// PURPOSE: Phase 1286-A — locks the Operational Health surface: deterministic
//          score/status/counts render as primary; the Python narrative is
//          labeled "Advisory (Python)" only when the envelope is
//          FOUNDATION_VALIDATED and "Foundation (deterministic)" otherwise;
//          Python-down renders honestly; advisory risk renders without replacing
//          Blind Spots (link preserved); empty risk state; no raw UUID labels;
//          error state.
// CONNECTS TO: src/pages/app/OperationalHealth.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { OperationalHealth } from "@/pages/app/OperationalHealth";
import { useAuthStore } from "@/lib/stores/auth";
import type {
  OperationalHealthAssessment,
  PythonAdvisoryEnvelope,
  RiskAssessedFinding,
} from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(email = "sadeil@niovlabs.com"): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

function health(over: Partial<OperationalHealthAssessment> = {}): OperationalHealthAssessment {
  return {
    scope: "personal",
    health_score: 39,
    execution_status: "AT_RISK",
    summary: "12 active items: 3 blocked, 2 overdue. Execution status AT_RISK.",
    top_risks: ["Compliance blocker (CRITICAL)"],
    recurring_blockers: ["Compliance blocker"],
    overloaded_people: ["Vishesh Patel"],
    suggested_focus: ["Compliance blocker"],
    recommended_next_actions: ["Clear the blockers first."],
    total_work: 12,
    overdue_count: 2,
    blocked_count: 3,
    waiting_on_count: 1,
    no_next_action_count: 1,
    stale_work_count: 2,
    high_risk_count: 2,
    critical_risk_count: 1,
    recent_completed_count: 4,
    recent_failed_count: 1,
    confidence: "HIGH",
    reasoning_summary: null,
    human_review_needed: true,
    provenance: "foundation:deterministic-analytics",
    ...over,
  };
}

function envelope(over: Partial<PythonAdvisoryEnvelope> = {}): PythonAdvisoryEnvelope {
  return {
    status: "NOT_CONFIGURED",
    source: "PYTHON_ADVISORY",
    authority: null,
    capability: "OPERATIONAL_ANALYTICS",
    latency_ms: null,
    provenance: "foundation:deterministic-analytics",
    warnings: [],
    updated_at: new Date().toISOString(),
    ...over,
  };
}

function riskFinding(over: Partial<RiskAssessedFinding> = {}): RiskAssessedFinding {
  return {
    finding_id: "UNRESOLVED_BLOCKER:led-1",
    watcher_type: "UNRESOLVED_BLOCKER",
    severity: "HIGH",
    title: "Compliance sign-off blocker",
    summary: "Open blocker.",
    org_id: "org-1",
    owner: { entity_id: "ent-vish", display_name: "Vishesh Patel", unresolved: false },
    requester: null,
    target: null,
    related_person: { entity_id: "ent-vish", display_name: "Vishesh Patel", unresolved: false },
    source: { source_system: "work_ledger", ledger_entry_id: "led-1", source_message_id: null, source_thread_key: null, relationship_key: null },
    detection: { rule_id: "UNRESOLVED_BLOCKER_V1", detected_at: new Date().toISOString(), age_hours: 50, due_at: null, threshold_hours: null, reason: "active BLOCKER" },
    recommendation: { next_action: "Resolve or escalate.", action_kind: "review_blocker" },
    risk_assessment: {
      risk_score: 90,
      severity: "CRITICAL",
      confidence: "HIGH",
      reason: "blocked; critical risk.",
      contributing_signals: ["BLOCKED", "HIGH_BASE_SEVERITY"],
      suggested_next_action: "Escalate to unblock this work.",
      human_review_needed: true,
      provenance: "foundation:deterministic-risk",
    },
    ...over,
  };
}

function mock(opts: {
  healthBody?: unknown;
  healthStatus?: number;
  riskBody?: unknown;
  riskStatus?: number;
}): void {
  server.use(
    http.get(`${API_BASE}/work-os/operational-health`, () =>
      HttpResponse.json(opts.healthBody ?? { ok: true, health: health(), envelope: envelope() }, { status: opts.healthStatus ?? 200 }),
    ),
    http.get(`${API_BASE}/work-os/risk/assessment`, () =>
      HttpResponse.json(opts.riskBody ?? { ok: true, findings: [riskFinding()], envelope: envelope({ capability: "RISK_SCORING" }) }, { status: opts.riskStatus ?? 200 }),
    ),
  );
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <OperationalHealth />
    </MemoryRouter>,
  );
}

beforeEach(() => setAuth());

describe("OperationalHealth — deterministic primary", () => {
  it("renders the deterministic score, status, and counts", async () => {
    mock({});
    renderPage();
    await waitFor(() => expect(screen.getByTestId("ops-health-score")).toBeInTheDocument());
    expect(screen.getByTestId("ops-health-score").textContent).toContain("39");
    expect(screen.getByTestId("ops-execution-status").textContent).toContain("at risk");
    const blocked = screen.getByTestId("ops-health-header").querySelector('[data-stat="blocked"]');
    expect(blocked?.textContent).toContain("3");
  });

  it("labels the narrative Foundation (deterministic) when Python is not validated", async () => {
    mock({});
    renderPage();
    await waitFor(() => expect(screen.getByTestId("ops-narrative-label")).toBeInTheDocument());
    expect(screen.getByTestId("ops-narrative-label").textContent).toBe("Foundation (deterministic)");
    expect(screen.getByTestId("ops-provenance").textContent).toMatch(/Deterministic Foundation analysis/);
  });

  it("labels the narrative Advisory (Python) only when FOUNDATION_VALIDATED + python provenance", async () => {
    mock({
      healthBody: {
        ok: true,
        health: health({ provenance: "python:operational-analytics", summary: "Team is under pressure." }),
        envelope: envelope({ status: "PYTHON_ENRICHED", authority: "FOUNDATION_VALIDATED", provenance: "python:operational-analytics", latency_ms: 35 }),
      },
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("ops-narrative-label")).toBeInTheDocument());
    expect(screen.getByTestId("ops-narrative-label").textContent).toBe("Advisory (Python)");
    expect(screen.getByTestId("ops-summary").textContent).toContain("under pressure");
    expect(screen.getByTestId("ops-provenance").textContent).toMatch(/Advisory analysis by Python/);
  });

  it("renders honestly when Python is down (deterministic still shows)", async () => {
    mock({
      healthBody: { ok: true, health: health(), envelope: envelope({ status: "UNHEALTHY", authority: null }) },
    });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("ops-health-score")).toBeInTheDocument());
    expect(screen.getByTestId("ops-narrative-label").textContent).toBe("Foundation (deterministic)");
    expect(screen.getByTestId("ops-provenance").textContent).toMatch(/unhealthy/);
  });
});

describe("OperationalHealth — advisory risk without replacing Blind Spots", () => {
  it("renders advisory risk cards and keeps the Blind Spots link", async () => {
    mock({});
    renderPage();
    await waitFor(() => expect(screen.getByTestId("ops-risk-list")).toBeInTheDocument());
    const card = screen.getByTestId("ops-risk-card");
    expect(within(card).getByTestId("ops-risk-score").textContent).toContain("90");
    expect(within(card).getByTestId("ops-risk-severity").textContent).toContain("critical");
    // Deterministic Blind Spots remain primary — the link is present.
    const link = screen.getByRole("link", { name: /blind spots/i });
    expect(link).toHaveAttribute("href", "/app/blind-spots");
  });

  it("shows an honest empty state when there are no risks", async () => {
    mock({ riskBody: { ok: true, findings: [], envelope: envelope({ capability: "RISK_SCORING" }) } });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("ops-risk-empty")).toBeInTheDocument());
  });

  it("renders the title as the primary label, never a raw finding id / UUID", async () => {
    mock({});
    renderPage();
    await waitFor(() => expect(screen.getByTestId("ops-risk-card")).toBeInTheDocument());
    const card = screen.getByTestId("ops-risk-card");
    expect(within(card).getByText("Compliance sign-off blocker")).toBeInTheDocument();
    expect(card.textContent).not.toContain("UNRESOLVED_BLOCKER:led-1"); // finding_id never shown as a label
    expect(card.textContent).toContain("Vishesh Patel"); // identity = display name
  });
});

describe("OperationalHealth — failure handling", () => {
  it("shows an error when operational-health cannot load", async () => {
    mock({ healthBody: { ok: false, code: "API_ERROR" }, healthStatus: 500 });
    renderPage();
    await waitFor(() => expect(screen.getByTestId("operational-health-error")).toBeInTheDocument());
  });
});
