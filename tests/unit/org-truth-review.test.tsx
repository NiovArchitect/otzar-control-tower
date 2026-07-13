// FILE: tests/unit/org-truth-review.test.tsx
// PURPOSE: [SECTION-10 ORG-TRUTH REVIEW] Locks the Action Center org-truth review
//          lane (open conflicts prominent, silent when none/unauthorized) + the
//          review drawer (distinct candidate signals, higher weight does NOT
//          auto-select, current shown separately, expected-version-guarded
//          resolve with duplicate-submit guard + server reconciliation + typed
//          stale/auth failure), and the privacy invariant (no raw source leak).
// CONNECTS TO: src/pages/app/ActionCenter.tsx (OrgTruthReviewLane),
//              src/components/otzar/OrgTruthReviewDrawer.tsx.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse, delay } from "msw";
import { server } from "../msw/server";
import { ActionCenter } from "@/pages/app/ActionCenter";
import { OrgTruthReviewDrawer } from "@/components/otzar/OrgTruthReviewDrawer";
import { useAuthStore } from "@/lib/stores/auth";
import type {
  ConflictCandidate,
  ConflictSet,
  ConflictSetWithCount,
  OrgTruthRecord,
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

function conflictSet(overrides: Partial<ConflictSet> = {}): ConflictSet {
  return {
    conflict_set_id: "cf-1",
    org_entity_id: "org-1",
    truth_key: "org-1:deadline:proj-x:launch-date",
    decision_domain: "deadline",
    subject_ref: null,
    state: "OPEN",
    version: 2,
    review_obligation_id: "obl-9",
    candidate_set_fingerprint: "fp",
    resulting_truth_record_id: null,
    resolution_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
function withCount(s: ConflictSet, n: number): ConflictSetWithCount {
  return { ...s, candidate_count: n };
}
function candidate(overrides: Partial<ConflictCandidate> = {}): ConflictCandidate {
  return {
    source_record_type: "WORK_LEDGER",
    source_record_id: "src-A",
    source_version: 1,
    communication_act: "decision",
    truth_class: "authorized_decision",
    truth_weight_rank: 2,
    authority_status: "within_authority",
    currentness: "current",
    source_integrity_state: "AVAILABLE",
    permission_eligible: true,
    superseded: false,
    retracted: false,
    is_winner: false,
    ...overrides,
  };
}

function serveConflictList(conflicts: ConflictSetWithCount[]): void {
  server.use(http.get(`${API_BASE}/otzar/org-truth/conflicts`, () => HttpResponse.json({ ok: true, conflicts })));
}
function serveConflictDetail(set: ConflictSet, candidates: ConflictCandidate[], current: OrgTruthRecord | null = null): void {
  server.use(http.get(`${API_BASE}/otzar/org-truth/conflicts/:id`, () => HttpResponse.json({ ok: true, conflict: { set, candidates, current_promoted_truth: current } })));
}

function renderCenter(): void {
  render(
    <MemoryRouter>
      <ActionCenter />
    </MemoryRouter>,
  );
}

beforeEach(() => setAuth(true));

describe("Organizational Truth Review — lane", () => {
  it("renders an open conflict prominently with the candidate count + review-assigned hint", async () => {
    serveConflictList([withCount(conflictSet(), 2)]);
    renderCenter();
    const lane = await screen.findByTestId("org-truth-review-lane");
    expect(within(lane).getByTestId("org-truth-review-lane-card")).toBeInTheDocument();
    expect(within(lane).getByText(/2 competing sources/)).toBeInTheDocument();
    expect(within(lane).getByText(/review assigned/)).toBeInTheDocument();
    expect(within(lane).getByTestId("org-truth-review-lane-badge")).toHaveTextContent(/Review required/);
  });

  it("is silent when there are no open conflicts (default handler = empty)", async () => {
    renderCenter();
    // The actions surface loads; the org-truth lane never appears.
    await waitFor(() => expect(screen.queryByTestId("org-truth-review-lane-loading")).not.toBeInTheDocument());
    expect(screen.queryByTestId("org-truth-review-lane")).not.toBeInTheDocument();
  });

  it("is silent (does not reveal existence) when the caller is unauthorized (list returns failure)", async () => {
    server.use(http.get(`${API_BASE}/otzar/org-truth/conflicts`, () => HttpResponse.json({ ok: false, code: "SESSION_INVALID", message: "no" }, { status: 403 })));
    renderCenter();
    await waitFor(() => expect(screen.queryByTestId("org-truth-review-lane-loading")).not.toBeInTheDocument());
    expect(screen.queryByTestId("org-truth-review-lane")).not.toBeInTheDocument();
  });

  it("a list failure never breaks the rest of the Action Center", async () => {
    server.use(http.get(`${API_BASE}/otzar/org-truth/conflicts`, () => HttpResponse.error()));
    renderCenter();
    // The action tablist still renders.
    expect(await screen.findByRole("tablist")).toBeInTheDocument();
  });
});

describe("Organizational Truth Review — drawer", () => {
  function renderDrawer(conflict: ConflictSetWithCount, onResolved = () => {}): void {
    render(<OrgTruthReviewDrawer conflict={conflict} open onOpenChange={() => {}} onResolved={onResolved} />);
  }

  it("shows distinct candidate signals + the mandated truth-weight copy; higher weight is not auto-selected; current shown separately as none", async () => {
    const set = conflictSet();
    serveConflictDetail(set, [candidate({ source_record_id: "A", truth_weight_rank: 2 }), candidate({ source_record_id: "B", truth_weight_rank: 4, currentness: "stale" })]);
    renderDrawer(withCount(set, 2));
    await screen.findByTestId("org-truth-drawer-candidates");
    // Distinct signals present.
    expect(screen.getAllByText(/Authority:/).length).toBe(2);
    expect(screen.getAllByText(/Integrity:/).length).toBe(2);
    expect(screen.getAllByText(/Truth weight:/).length).toBe(2);
    // Mandated copy.
    expect(screen.getByText(/Higher truth weight informs review but does not automatically authorize promotion\./)).toBeInTheDocument();
    // NOTHING auto-selected (no candidate has data-selected=true).
    const cands = screen.getAllByTestId("org-truth-candidate");
    expect(cands.every((c) => c.getAttribute("data-selected") === "false")).toBe(true);
    // Current shown separately as "no current answer".
    expect(screen.getByTestId("org-truth-drawer-current-none")).toBeInTheDocument();
  });

  it("an open conflict WITH a current promoted truth shows it distinctly + what the selection would replace", async () => {
    const set = conflictSet();
    const current: OrgTruthRecord = {
      truth_record_id: "cur-1", state: "PROMOTED", value: {}, decision_domain: "deadline", org_entity_id: "o",
      subject_ref: null, subject_ref_class: null, truth_key: set.truth_key, version: 3,
      winning_source_record_type: "WORK_LEDGER", winning_source_record_id: "X", winning_source_version: 2,
      promotion_evidence_snapshot_id: null, truth_class: "authorized_decision", truth_weight_rank: 2, authority_ref: null,
      promoter_entity_id: null, promoted_at: null, supersedes_truth_record_id: null, superseded_by_truth_record_id: null,
      retraction_reason: null, conflict_set_ref: null, title: "Ship on Oct 1", value_type: "date",
      visibility_scope: "SUBJECT", created_at: "", updated_at: "",
    };
    serveConflictDetail(set, [candidate({ source_record_id: "A" }), candidate({ source_record_id: "B" })], current);
    renderDrawer(withCount(set, 2));
    // Current promoted answer rendered (NOT the "no current answer" placeholder).
    const cur = await screen.findByTestId("org-truth-drawer-current");
    expect(cur).toHaveTextContent("Ship on Oct 1");
    expect(cur).toHaveTextContent("v3");
    expect(screen.queryByTestId("org-truth-drawer-current-none")).toBeNull();
    // Selecting a candidate surfaces what it would replace.
    expect(screen.queryByTestId("org-truth-drawer-would-replace")).toBeNull();
    fireEvent.click((await screen.findAllByTestId("org-truth-candidate"))[0]!);
    expect(await screen.findByTestId("org-truth-drawer-would-replace")).toBeInTheDocument();
  });

  it("resolve: select a candidate + reason → POST fires with expected_conflict_version → resolved; duplicate submit prevented", async () => {
    const set = conflictSet({ version: 7 });
    serveConflictDetail(set, [candidate({ source_record_id: "A" }), candidate({ source_record_id: "B" })]);
    let bodySeen: { expected_conflict_version?: number; winner?: { source_record_id?: string }; reason?: string } | null = null;
    let calls = 0;
    server.use(http.post(`${API_BASE}/otzar/org-truth/conflicts/:id/resolve`, async ({ request }) => {
      calls += 1;
      bodySeen = (await request.json()) as typeof bodySeen;
      await delay(20);
      return HttpResponse.json({ ok: true, result: { kind: "promoted", record: { truth_record_id: "t-1", state: "PROMOTED", value: {}, decision_domain: "deadline", org_entity_id: "o", subject_ref: null, subject_ref_class: null, truth_key: set.truth_key, version: 1, winning_source_record_type: "WORK_LEDGER", winning_source_record_id: "A", winning_source_version: 1, promotion_evidence_snapshot_id: null, truth_class: null, truth_weight_rank: null, authority_ref: null, promoter_entity_id: null, promoted_at: null, supersedes_truth_record_id: null, superseded_by_truth_record_id: null, retraction_reason: null, conflict_set_ref: null, title: null, value_type: null, visibility_scope: "SUBJECT", created_at: "", updated_at: "" }, created: true } });
    }));
    let resolvedCbs = 0;
    renderDrawer(withCount(set, 2), () => { resolvedCbs += 1; });
    const cands = await screen.findAllByTestId("org-truth-candidate");
    const user = userEvent.setup();
    await user.click(cands[0]!);
    await user.type(screen.getByTestId("org-truth-reason"), "owner selected the confirmed launch date");
    const btn = screen.getByTestId("org-truth-resolve");
    await user.click(btn);
    // In-flight: the button is disabled (duplicate submit prevented).
    expect(btn).toBeDisabled();
    await user.click(btn); // second click no-ops
    await screen.findByTestId("org-truth-drawer-resolved");
    expect(calls).toBe(1);
    expect(bodySeen).not.toBeNull();
    expect(bodySeen!.expected_conflict_version).toBe(7);
    expect(bodySeen!.winner?.source_record_id).toBe("A");
    expect(typeof bodySeen!.reason).toBe("string");
    expect(resolvedCbs).toBeGreaterThanOrEqual(1);
  });

  it("resolve stale → typed STATE_CHANGED shows the re-review copy, no optimistic promotion", async () => {
    const set = conflictSet();
    serveConflictDetail(set, [candidate({ source_record_id: "A" })]);
    server.use(http.post(`${API_BASE}/otzar/org-truth/conflicts/:id/resolve`, () => HttpResponse.json({ ok: false, code: "OTZAR_ORG_TRUTH_STATE_CHANGED", message: "changed" }, { status: 409 })));
    renderDrawer(withCount(set, 1));
    const cands = await screen.findAllByTestId("org-truth-candidate");
    const user = userEvent.setup();
    await user.click(cands[0]!);
    await user.type(screen.getByTestId("org-truth-reason"), "reason");
    await user.click(screen.getByTestId("org-truth-resolve"));
    const err = await screen.findByTestId("org-truth-resolve-error");
    expect(err).toHaveTextContent(/The conflict changed while you were reviewing it/);
    expect(screen.queryByTestId("org-truth-drawer-resolved")).not.toBeInTheDocument();
  });

  it("resolve authorization failure shows a safe denial and reveals nothing", async () => {
    const set = conflictSet();
    serveConflictDetail(set, [candidate({ source_record_id: "A" })]);
    server.use(http.post(`${API_BASE}/otzar/org-truth/conflicts/:id/resolve`, () => HttpResponse.json({ ok: false, code: "OTZAR_ORG_TRUTH_UNAUTHORIZED", message: "You are not authorized to promote this answer." }, { status: 403 })));
    renderDrawer(withCount(set, 1));
    const cands = await screen.findAllByTestId("org-truth-candidate");
    const user = userEvent.setup();
    await user.click(cands[0]!);
    await user.type(screen.getByTestId("org-truth-reason"), "reason");
    await user.click(screen.getByTestId("org-truth-resolve"));
    expect(await screen.findByTestId("org-truth-resolve-error")).toBeInTheDocument();
    expect(screen.queryByTestId("org-truth-drawer-resolved")).not.toBeInTheDocument();
  });

  it("a retracted/ineligible candidate cannot be selected and is shown as unavailable", async () => {
    const set = conflictSet();
    serveConflictDetail(set, [candidate({ source_record_id: "A", retracted: true, source_integrity_state: "SOURCE_DELETED" })]);
    renderDrawer(withCount(set, 1));
    const cand = (await screen.findAllByTestId("org-truth-candidate"))[0]!;
    expect(cand).toBeDisabled();
    expect(screen.getByText(/A source used in this conflict is no longer available\./)).toBeInTheDocument();
  });

  it("privacy: the drawer renders classifications only — no raw source content/secrets", async () => {
    const set = conflictSet();
    serveConflictDetail(set, [candidate({ source_record_id: "A" })]);
    const { container } = render(<OrgTruthReviewDrawer conflict={withCount(set, 1)} open onOpenChange={() => {}} onResolved={() => {}} />);
    await screen.findByTestId("org-truth-drawer-candidates");
    expect(container.textContent ?? "").not.toMatch(/password|secret|token|bearer|raw_/i);
  });
});
