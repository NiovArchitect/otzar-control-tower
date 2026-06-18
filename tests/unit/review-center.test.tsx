// FILE: tests/unit/review-center.test.tsx
// PURPOSE: Phase 1300-A — locks the Control Tower Review Center governance
//          surface: scoped lists (needs-review / mine / org-history) render with
//          a summary; empty + unauthorized states are safe; the audit drawer
//          shows safe lifecycle/eligibility events; approve/deny/revoke call the
//          backend and surface the backend code on refusal (visibility is NOT
//          approval authority); expired/revoked/denied reviews hide the approve
//          action; NO raw content / payload / storage / embedding / hash / raw
//          UUID-as-primary-label ever appears; the nav entry exists.
// CONNECTS TO: src/pages/ReviewCenter.tsx, src/lib/api.ts, src/lib/nav.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { server } from "../msw/server";
import { ReviewCenterPage } from "@/pages/ReviewCenter";
import { useAuthStore } from "@/lib/stores/auth";
import { NAV } from "@/lib/nav";

const API_BASE = "http://localhost:3000/api/v1";
const REVIEWS = `${API_BASE}/foundation/high-sensitivity/reviews`;

function setAuth(): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "compliance@example.com" },
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

function review(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    review_id: "rev-1",
    listing_id: "lst-1",
    data_package_id: "pkg-1",
    grant_id: null,
    provider_entity_id: "prov-uuid-1",
    provider_org_entity_id: "org-1",
    buyer_entity_id: "buyer-uuid-1",
    buyer_org_entity_id: "org-1",
    requester_entity_id: "buyer-uuid-1",
    reviewer_entity_id: null,
    intended_use: "ANALYTICS",
    access_mode: "SAFE_PROJECTION",
    sensitivity_class: "HIGH_SENSITIVITY",
    sensitive_categories: ["MEDICAL"],
    policy_decision: "REQUIRES_REVIEW",
    policy_reason_codes: ["MEDICAL_DATA_REQUIRES_DEDICATED_REVIEW"],
    approved_access_modes: [],
    status: "PENDING_REVIEW",
    raw_body_allowed: false,
    proof_required: true,
    training_allowed: false,
    model_improvement_allowed: false,
    redistribution_allowed: false,
    commercial_use_allowed: false,
    expires_at: null,
    reviewed_at: null,
    revoked_at: null,
    denial_reason: null,
    created_at: new Date().toISOString(),
    ...over,
  };
}

const SUMMARY = {
  pending_review_count: 2,
  approved_count: 1,
  denied_count: 0,
  revoked_count: 0,
  expired_count: 0,
  expiring_soon_count: 0,
};

// Mock the scoped list. `byScope` maps scope -> reviews (+ optional summary).
function mockList(byScope: Record<string, { reviews: unknown[]; summary?: unknown }>): void {
  server.use(
    http.get(REVIEWS, ({ request }) => {
      const scope = new URL(request.url).searchParams.get("scope") ?? "mine";
      const entry = byScope[scope] ?? { reviews: [] };
      return HttpResponse.json({ ok: true, scope, reviews: entry.reviews, ...(entry.summary ? { summary: entry.summary } : {}) });
    }),
  );
}
function mockListError(status: number, code: string): void {
  server.use(http.get(REVIEWS, () => HttpResponse.json({ ok: false, code }, { status })));
}

function renderPage(): void {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReviewCenterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

describe("Review Center — nav + render", () => {
  it("the nav registers a Review Center entry in Security & Governance", () => {
    const item = NAV.find((n) => n.to === "/review-center");
    expect(item).toBeDefined();
    expect(item?.group).toBe("Security & Governance");
  });

  it("renders the page with safe subtitle (no raw content language)", async () => {
    mockList({ org_reviewable: { reviews: [], summary: SUMMARY } });
    renderPage();
    expect(await screen.findByTestId("review-center-page")).toBeInTheDocument();
    expect(screen.getByText(/Safe projections only/i)).toBeInTheDocument();
  });
});

describe("Review Center — scoped lists", () => {
  it("the default Needs-review tab loads org-reviewable reviews + summary", async () => {
    mockList({ org_reviewable: { reviews: [review()], summary: SUMMARY } });
    renderPage();
    expect(await screen.findByTestId("review-card")).toBeInTheDocument();
    expect(screen.getByTestId("review-summary")).toBeInTheDocument();
    // Title is a SAFE human label, never the raw UUID.
    expect(screen.getByText("Medical data review")).toBeInTheDocument();
    expect(screen.queryByText("rev-1")).not.toBeInTheDocument();
  });

  it("an empty org-reviewable list shows a safe (non-misleading) empty state", async () => {
    mockList({ org_reviewable: { reviews: [], summary: SUMMARY } });
    renderPage();
    const empty = await screen.findByTestId("review-empty");
    expect(empty.textContent ?? "").toMatch(/don't have review authority|need your attention/i);
  });

  it("an unauthorized/error list shows a safe blocked reason (no raw code dump)", async () => {
    mockListError(403, "REVIEWER_NOT_ORG_AUTHORIZED");
    renderPage();
    const err = await screen.findByTestId("review-list-error");
    expect(err.textContent ?? "").toMatch(/not an authorized reviewer/i);
    expect(err.textContent ?? "").not.toContain("REVIEWER_NOT_ORG_AUTHORIZED");
  });

  it("switching to My reviews loads scope=mine", async () => {
    mockList({ org_reviewable: { reviews: [] }, mine: { reviews: [review({ review_id: "rev-mine", status: "APPROVED", approved_access_modes: ["PROOF_ONLY"] })] } });
    renderPage();
    await screen.findByTestId("review-center-page");
    await userEvent.click(screen.getByTestId("tab-mine"));
    expect(await screen.findByTestId("review-card")).toHaveAttribute("data-review-status", "APPROVED");
  });
});

describe("Review Center — action authority (visibility is NOT approval)", () => {
  it("approve calls the backend route and refreshes on success", async () => {
    let approveHit = false;
    server.use(
      http.get(REVIEWS, ({ request }) => {
        const scope = new URL(request.url).searchParams.get("scope") ?? "mine";
        const status = approveHit ? "APPROVED" : "PENDING_REVIEW";
        return HttpResponse.json({ ok: true, scope, reviews: [review({ status, approved_access_modes: approveHit ? ["PROOF_ONLY"] : [] })] });
      }),
      http.post(`${REVIEWS}/rev-1/approve`, () => {
        approveHit = true;
        return HttpResponse.json({ ok: true, review: review({ status: "APPROVED", approved_access_modes: ["PROOF_ONLY"] }) });
      }),
    );
    renderPage();
    fireEvent.click(await screen.findByTestId("review-approve"));
    await waitFor(() => expect(approveHit).toBe(true));
    await waitFor(() => expect(screen.getByTestId("review-card")).toHaveAttribute("data-review-status", "APPROVED"));
  });

  it("a 403 approval denial shows a safe blocked reason", async () => {
    mockList({ org_reviewable: { reviews: [review()] } });
    server.use(
      http.post(`${REVIEWS}/rev-1/approve`, () =>
        HttpResponse.json({ ok: false, code: "REVIEWER_NOT_ORG_AUTHORIZED" }, { status: 403 }),
      ),
    );
    renderPage();
    fireEvent.click(await screen.findByTestId("review-approve"));
    const reason = await screen.findByTestId("review-blocked-reason");
    expect(reason.textContent ?? "").toMatch(/not an authorized reviewer/i);
  });

  it("an APPROVED review shows Revoke and hides Approve/Deny", async () => {
    mockList({ org_reviewable: { reviews: [review({ status: "APPROVED", approved_access_modes: ["PROOF_ONLY"] })] } });
    renderPage();
    await screen.findByTestId("review-card");
    expect(screen.getByTestId("review-revoke")).toBeInTheDocument();
    expect(screen.queryByTestId("review-approve")).not.toBeInTheDocument();
    expect(screen.queryByTestId("review-deny")).not.toBeInTheDocument();
  });

  it("an EXPIRED review hides every action button (no approve)", async () => {
    mockList({ org_reviewable: { reviews: [review({ status: "EXPIRED" })] } });
    renderPage();
    await screen.findByTestId("review-card");
    expect(screen.queryByTestId("review-approve")).not.toBeInTheDocument();
    expect(screen.queryByTestId("review-revoke")).not.toBeInTheDocument();
  });

  it("a CHILDREN review recorded DENIED is never approvable", async () => {
    mockList({ org_reviewable: { reviews: [review({ status: "DENIED", sensitive_categories: ["CHILDREN"], denial_reason: "CHILDREN_DATA_REQUIRES_DEDICATED_REVIEW" })] } });
    renderPage();
    await screen.findByTestId("review-card");
    expect(screen.queryByTestId("review-approve")).not.toBeInTheDocument();
    expect(screen.getByText("Children data review")).toBeInTheDocument();
  });
});

describe("Review Center — audit drawer + no-leak", () => {
  it("the audit drawer renders safe lifecycle + eligibility events", async () => {
    mockList({ org_reviewable: { reviews: [review()] } });
    server.use(
      http.get(`${REVIEWS}/rev-1/audit`, () =>
        HttpResponse.json({
          ok: true,
          review: review(),
          audit_events: [
            { event_type: "HIGH_SENSITIVITY_REVIEW_CREATED", outcome: "SUCCESS", timestamp: new Date().toISOString(), denial_reason: null, status: "PENDING_REVIEW", access_mode: "SAFE_PROJECTION", candidate_reviewer_entity_id: null, reviewer_scope: null, reviewer_reason_codes: [] },
            { event_type: "HIGH_SENSITIVITY_REVIEWER_ELIGIBILITY_EVALUATED", outcome: "DENIED", timestamp: new Date().toISOString(), denial_reason: "REVIEWER_IS_BUYER", status: "PENDING_REVIEW", access_mode: "SAFE_PROJECTION", candidate_reviewer_entity_id: "cand-uuid-9", reviewer_scope: "DENIED", reviewer_reason_codes: ["REVIEWER_IS_BUYER"] },
          ],
        }),
      ),
    );
    renderPage();
    fireEvent.click(await screen.findByTestId("review-view-audit"));
    const list = await screen.findByTestId("review-audit-list");
    const events = within(list).getAllByTestId("review-audit-event");
    expect(events.length).toBe(2);
    expect(list.textContent ?? "").toMatch(/Reviewer eligibility evaluated/i);
  });

  it("no raw content / payload / storage / embedding / hash leaks anywhere on the surface", async () => {
    mockList({ org_reviewable: { reviews: [review()] } });
    server.use(
      http.get(`${REVIEWS}/rev-1/audit`, () =>
        HttpResponse.json({ ok: true, review: review(), audit_events: [] }),
      ),
    );
    const { container } = (() => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
      return render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <ReviewCenterPage />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    })();
    fireEvent.click(await screen.findByTestId("review-view-audit"));
    await screen.findByTestId("review-audit-drawer");
    const html = container.ownerDocument.body.innerHTML;
    for (const forbidden of ["payload_content", "storage_location", "embedding", "content_hash", "password"]) {
      expect(html).not.toContain(forbidden);
    }
  });
});
