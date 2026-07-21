// FILE: tests/unit/decision-evidence.test.tsx
// PURPOSE: [OTZAR STAGE-2 TRUTH-EVIDENCE §O] Locks the Action Center Decision
//          Evidence surface: the stale-basis lane (prominent stale, quiet
//          current, silent when nothing to show) + the evidence drawer
//          (captured-vs-live distinction, non-accusatory mandated copy,
//          inaccessible source shown as unavailable, explicit recheck with
//          duplicate-submit guard + server reconciliation + typed failure), and
//          the privacy invariant (no raw source text / secrets leak).
// CONNECTS TO: src/pages/app/ActionCenter.tsx (DecisionEvidenceLane),
//              src/components/otzar/DecisionEvidenceDrawer.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse, delay } from "msw";
import { server } from "../msw/server";
import { ActionCenter } from "@/pages/app/ActionCenter";
import { DecisionEvidenceDrawer } from "@/components/otzar/DecisionEvidenceDrawer";
import { useAuthStore } from "@/lib/stores/auth";
import type {
  EvidenceSnapshotView,
  ObligationWithBasis,
} from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(write = true): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "sadeil@niovlabs.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: write,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

function decision(overrides: Partial<ObligationWithBasis> = {}): ObligationWithBasis {
  return {
    obligation_id: "obl-1",
    obligation_type: "ACTION_CONFIRMATION",
    title: "Confirm the vendor migration plan",
    details: {},
    state: "COMPLETED",
    priority: "ROUTINE",
    required_response_class: null,
    source_channel: "CHAT",
    provenance_class: "CONVERSATION",
    conversation_id: null,
    source_turn_id: null,
    responsible_entity_id: "ent-1",
    has_action: true,
    has_completion_evidence: true,
    is_escalated: false,
    is_terminal: true,
    version: 3,
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
    due_at: null,
    acknowledged_at: null,
    completed_at: new Date(Date.now() - 1_800_000).toISOString(),
    ...overrides,
  };
}

function snapshot(overrides: Partial<EvidenceSnapshotView> = {}): EvidenceSnapshotView {
  return {
    snapshot_id: "snap-1",
    decision_point: "OBLIGATION_COMPLETION",
    source_record_type: "OBLIGATION",
    source_record_id: "obl-1",
    source_version: 3,
    source_hash: "abc123def456",
    source_timestamp: null,
    source_system: null,
    source_integrity_state: "AVAILABLE",
    communication_act: "decision",
    truth_class: "authorized_decision",
    truth_weight_rank: 2,
    authority_class: "within_authority",
    currentness: "current",
    conflict_indicator: false,
    superseded_at_capture: false,
    captured_at: new Date(Date.now() - 1_800_000).toISOString(),
    resolver_version: "truth-evidence/1",
    evidence_fingerprint: "fingerprintdeadbeef0001",
    obligation_id: "obl-1",
    handoff_id: null,
    current_source_status: "unchanged",
    ...overrides,
  };
}

function mockObligations(obligations: ObligationWithBasis[]): void {
  server.use(
    http.get(`${API_BASE}/otzar/obligations`, () =>
      HttpResponse.json({ ok: true, obligations }),
    ),
  );
}
function mockEvidence(evidence: EvidenceSnapshotView[]): void {
  server.use(
    http.get(`${API_BASE}/otzar/obligations/:id/evidence`, () =>
      HttpResponse.json({ ok: true, evidence }),
    ),
  );
}

function renderActionCenter(): void {
  render(
    <MemoryRouter>
      <ActionCenter />
    </MemoryRouter>,
  );
}

beforeEach(() => setAuth());

describe("DecisionEvidenceLane — stale surfacing in the Action Center", () => {
  it("surfaces a stale decision prominently with the mandated non-accusatory copy", async () => {
    mockObligations([decision({ basis_status: "stale" })]);
    renderActionCenter();
    const card = await screen.findByTestId("decision-evidence-lane-card");
    expect(within(card).getByText("Confirm the vendor migration plan")).toBeInTheDocument();
    expect(within(card).getByTestId("decision-evidence-lane-badge")).toHaveTextContent("Review required");
    expect(within(card).getByTestId("decision-evidence-lane-headline")).toHaveTextContent(
      "Evidence changed. Review required",
    );
    // The framing is review, not blame: the card headline is the mandated
    // "review required" phrase (asserted above), never an "error"/"invalid" verdict.
    expect(within(card).queryByText(/invalid decision|was incorrect|you were wrong/i)).toBeNull();
  });

  it("stays quiet when all decisions are current (calm all-clear, no cards)", async () => {
    mockObligations([decision({ basis_status: "current" }), decision({ obligation_id: "obl-2", basis_status: "current" })]);
    renderActionCenter();
    const clear = await screen.findByTestId("decision-evidence-lane-allclear");
    expect(clear).toHaveTextContent("Decision basis remains current");
    expect(screen.queryByTestId("decision-evidence-lane-card")).toBeNull();
  });

  it("renders no lane at all when there is nothing recorded to review", async () => {
    mockObligations([decision({ basis_status: "none" })]);
    renderActionCenter();
    // The action list resolves (empty), so the page is up; the evidence lane is absent.
    await waitFor(() => expect(screen.getByTestId("action-tab-pending")).toBeInTheDocument());
    // Let the async obligations fetch settle, then assert the lane rendered nothing.
    await waitFor(() => expect(screen.queryByTestId("decision-evidence-lane-loading")).toBeNull());
    expect(screen.queryByTestId("decision-evidence-lane")).toBeNull();
  });
});

describe("DecisionEvidenceDrawer — captured vs live, recheck, safety", () => {
  function renderDrawer(d: ObligationWithBasis = decision({ basis_status: "stale" })): { onRechecked: () => number } {
    let rechecks = 0;
    render(
      <MemoryRouter>
        <DecisionEvidenceDrawer
          decision={d}
          open
          onOpenChange={() => {}}
          onRechecked={() => { rechecks += 1; }}
        />
      </MemoryRouter>,
    );
    return { onRechecked: () => rechecks };
  }

  it("shows the captured classifications AND a separate live status", async () => {
    mockEvidence([snapshot({ current_source_status: "changed" })]);
    renderDrawer();
    const snap = await screen.findByTestId("decision-evidence-snapshot");
    // Live status (separate projection) uses the mandated review copy.
    expect(within(snap).getByTestId("decision-evidence-live-status")).toHaveTextContent(
      "Evidence changed. Review required",
    );
    // Captured basis classifications are humanized, shown as history.
    expect(within(snap).getByText("Authorized Decision")).toBeInTheDocument(); // truth_class
    expect(within(snap).getByText("Within Authority")).toBeInTheDocument();    // authority_class
    expect(within(snap).getByText(/Recorded at the time of the decision/i)).toBeInTheDocument();
  });

  it("renders an inaccessible source as unavailable — never hidden content", async () => {
    mockEvidence([snapshot({ current_source_status: "retracted", source_integrity_state: "SOURCE_DELETED" })]);
    renderDrawer();
    const snap = await screen.findByTestId("decision-evidence-snapshot");
    expect(within(snap).getByTestId("decision-evidence-live-status")).toHaveTextContent(
      "Source is no longer available",
    );
    expect(snap).toHaveAttribute("data-current-source-status", "retracted");
  });

  it("explicit recheck fires the POST, reconciles from the server, and shows the review-item link", async () => {
    mockEvidence([snapshot({ current_source_status: "changed" })]);
    server.use(
      http.post(`${API_BASE}/otzar/obligations/:id/evidence/recheck`, () =>
        HttpResponse.json({
          ok: true,
          status: "remediation_open",
          stale: [{ snapshot_id: "snap-1", decision_point: "OBLIGATION_COMPLETION", current_source_status: "changed" }],
          remediation_obligation_id: "rem-42",
          remediation_created: true,
        }),
      ),
    );
    const h = renderDrawer();
    const btn = await screen.findByTestId("decision-evidence-recheck");
    await userEvent.click(btn);
    const result = await screen.findByTestId("decision-evidence-recheck-remediation");
    expect(result).toHaveTextContent("Evidence changed. Review required");
    expect(screen.getByTestId("decision-evidence-remediation-id")).toHaveTextContent("rem-42");
    // Server reconciliation: onRechecked bubbled so the lane refetches.
    expect(h.onRechecked()).toBeGreaterThanOrEqual(1);
  });

  it("prevents duplicate submissions — the button is disabled while in-flight", async () => {
    mockEvidence([snapshot({ current_source_status: "changed" })]);
    server.use(
      http.post(`${API_BASE}/otzar/obligations/:id/evidence/recheck`, async () => {
        await delay(60);
        return HttpResponse.json({ ok: true, status: "current", stale: [], remediation_obligation_id: null, remediation_created: false });
      }),
    );
    renderDrawer();
    const btn = await screen.findByTestId("decision-evidence-recheck");
    await userEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled()); // in-flight guard
    await waitFor(() => expect(btn).not.toBeDisabled()); // settles
  });

  it("surfaces a typed failure when the recheck call fails", async () => {
    mockEvidence([snapshot({ current_source_status: "changed" })]);
    server.use(
      http.post(`${API_BASE}/otzar/obligations/:id/evidence/recheck`, () =>
        HttpResponse.json({ ok: false, code: "OTZAR_OBLIGATION_AUDIT_UNCOMMITTED", message: "The recheck could not be recorded. Please retry." }, { status: 503 }),
      ),
    );
    renderDrawer();
    await userEvent.click(await screen.findByTestId("decision-evidence-recheck"));
    expect(await screen.findByTestId("decision-evidence-recheck-error")).toHaveTextContent(/could not be recorded/i);
  });

  it("hides the recheck action from a read-only user (no write capability)", async () => {
    setAuth(false);
    mockEvidence([snapshot()]);
    renderDrawer();
    await screen.findByTestId("decision-evidence-snapshot");
    expect(screen.queryByTestId("decision-evidence-recheck")).toBeNull();
  });

  it("privacy invariant: the drawer never renders raw source text, tokens, or the opaque details", async () => {
    mockEvidence([snapshot({ current_source_status: "changed" })]);
    renderDrawer(decision({ basis_status: "stale", details: { secret_note: "PATIENT SSN 123-45-6789" } }));
    await screen.findByTestId("decision-evidence-snapshot");
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/PATIENT SSN|123-45-6789|secret_note|Bearer|token/i);
  });
});
