// FILE: tests/unit/security.test.tsx
// PURPOSE: Page tests for the Section 7 Full Audit Viewer consumer
//          at /security-audit. Verifies:
//          - nav entry exists
//          - page renders with header
//          - list endpoint called (GET /api/v1/audit/events)
//          - rows render with closed-vocab labels + outcome badges
//          - clicking a row opens the detail panel
//          - detail endpoint called (GET /api/v1/audit/events/:id)
//          - chain integrity section renders event_hash +
//            prev/next chain refs
//          - empty-state copy is honest + safe
//          - list error renders with retry affordance
//          - detail unknown-id (404) renders safely
//          - pagination controls render with total count
//          - forbidden UI copy + no-leak token guards pass
// CONNECTS TO: src/pages/Security.tsx, src/lib/api.ts (api.audit),
//              src/lib/types/foundation.ts (SafeAuditEventView /
//              SafeAuditEventDetailView), src/lib/nav.ts,
//              tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import {
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MemoryRouter } from "react-router-dom";
import { SecurityPage } from "@/pages/Security";
import { useAuthStore } from "@/lib/stores/auth";
import { api } from "@/lib/api";
import { NAV } from "@/lib/nav";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "admin@example.com" },
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

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setAuth();
});

// ────────────────────────────────────────────────────────────────
// Forbidden UI copy guard. Mirrors the Agent Playground discipline
// (positive-claim form; allows canonical disclaimers verbatim).
// Audit viewer text MUST never imply legal certainty, regulator
// approval, manager surveillance, employee scoring, or AI
// autonomy claims.
// ────────────────────────────────────────────────────────────────
const FORBIDDEN_UI_COPY = [
  "ai decided",
  "is a final decision",
  "this final decision",
  "the final decision is",
  "guaranteed compliant",
  "regulator approved",
  "no fine risk",
  "automatically execute",
  "winner",
  "ranked #1",
  "employee risk",
  "employee score",
  "manager surveillance",
  "psychological profile",
  "full transcript",
  "chain-of-thought",
  "the system decided",
];

// ────────────────────────────────────────────────────────────────
// No-leak tokens that must never appear in any rendered audit
// surface (raw payload internals, secret refs, chain-of-thought,
// embeddings, connector payloads).
// ────────────────────────────────────────────────────────────────
const FORBIDDEN_NO_LEAK_TOKENS = [
  "raw_payload",
  "payload_content",
  "raw_memory_content",
  "raw_capsule_content",
  "raw_transcript",
  "prompt_text",
  "embedding_vector",
  "storage_location",
  "bridge_id",
  "secret_ref",
  "connector_payload",
];

describe("Section 7 Security & Audit — nav + page shell", () => {
  it("registers Security & Audit in the main nav at /security-audit", () => {
    const entry = NAV.find((n) => n.to === "/security-audit");
    expect(entry).toBeDefined();
    expect(entry?.label).toBe("Security & Audit");
  });

  it("renders the page header", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Security & Audit/i }),
    ).toBeInTheDocument();
  });

  it("exposes api.audit.list + api.audit.detail", () => {
    expect(typeof api.audit.list).toBe("function");
    expect(typeof api.audit.detail).toBe("function");
  });
});

describe("Section 7 Security & Audit — list view", () => {
  it("renders audit rows from the list endpoint", async () => {
    renderPage();
    const list = await screen.findByTestId("audit-list");
    const rows = within(list).getAllByTestId("audit-row");
    expect(rows.length).toBe(3);
  });

  it("renders closed-vocab event labels via getAuditEventLabel", async () => {
    renderPage();
    await screen.findByTestId("audit-list");
    // Labels per AUDIT_EVENT_TYPE_LABELS at lib/audit/event-types.ts.
    expect(screen.getByText(/^Login$/)).toBeInTheDocument();
    expect(screen.getByText(/Knowledge Item Created/i)).toBeInTheDocument();
    expect(screen.getByText(/Admin Action/i)).toBeInTheDocument();
  });

  it("renders an outcome badge per row", async () => {
    renderPage();
    const list = await screen.findByTestId("audit-list");
    expect(within(list).getAllByText(/^Success$/).length).toBe(3);
  });

  it("renders the pager with total event count", async () => {
    renderPage();
    await screen.findByTestId("audit-list");
    const pager = screen.getByTestId("audit-pager");
    expect(pager).toHaveTextContent(/Page 1 of 1/i);
    expect(pager).toHaveTextContent(/3 events/i);
  });

  it("renders an honest empty-state when the server returns zero events", async () => {
    server.use(
      http.get(`${API_BASE}/audit/events`, () =>
        HttpResponse.json(
          { ok: true, page: 1, page_size: 25, total: 0, events: [] },
          { status: 200 },
        ),
      ),
    );
    renderPage();
    const empty = await screen.findByTestId("audit-list-empty");
    expect(empty).toHaveTextContent(/No audit events recorded yet/i);
  });

  it("renders a safe error block with a Retry button when the list fails", async () => {
    server.use(
      http.get(`${API_BASE}/audit/events`, () =>
        HttpResponse.json(
          { ok: false, code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );
    renderPage();
    const err = await screen.findByTestId("audit-list-error");
    expect(err).toHaveTextContent(/Failed to load audit events/i);
    expect(
      within(err).getByRole("button", { name: /Retry/i }),
    ).toBeInTheDocument();
  });
});

describe("Section 7 Security & Audit — detail panel", () => {
  it("shows the empty selector card before any row is clicked", async () => {
    renderPage();
    await screen.findByTestId("audit-list");
    expect(screen.getByTestId("audit-detail-empty")).toBeInTheDocument();
  });

  it("opens the detail panel when a row is clicked + renders safe metadata", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list");
    await user.click(
      screen.getByTestId("audit-row-button-aud-7-002"),
    );
    const panel = await screen.findByTestId("audit-detail-panel");
    expect(panel).toBeInTheDocument();
    expect(
      within(panel).getByTestId("detail-audit-id"),
    ).toHaveTextContent("aud-7-002");
    expect(
      within(panel).getByTestId("detail-event-hash"),
    ).toHaveTextContent(/^0+2$/);
  });

  it("renders chain integrity section with prev + next event refs", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list");
    await user.click(
      screen.getByTestId("audit-row-button-aud-7-002"),
    );
    const panel = await screen.findByTestId("audit-detail-panel");
    expect(within(panel).getByText(/Chain integrity/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Previous event/i)).toBeInTheDocument();
    expect(within(panel).getByText(/Next event/i)).toBeInTheDocument();
    // aud-7-002 sits in the middle of the fixture chain so prev +
    // next both refer to siblings (aud-7-001, aud-7-003).
    expect(within(panel).getByText(/aud-7-001/)).toBeInTheDocument();
    expect(within(panel).getByText(/aud-7-003/)).toBeInTheDocument();
  });

  it("renders safe error card when the detail endpoint returns 404", async () => {
    server.use(
      http.get(`${API_BASE}/audit/events/:id`, () =>
        HttpResponse.json(
          { ok: false, code: "AUDIT_EVENT_NOT_FOUND" },
          { status: 404 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list");
    await user.click(
      screen.getByTestId("audit-row-button-aud-7-001"),
    );
    const err = await screen.findByTestId("audit-detail-error");
    expect(err).toHaveTextContent(/Event detail unavailable/i);
    expect(err).toHaveTextContent(/AUDIT_EVENT_NOT_FOUND/);
  });
});

describe("Section 7 Security & Audit — filter UI (D2.1)", () => {
  it("renders filter controls + reset button", async () => {
    renderPage();
    await screen.findByTestId("audit-list");
    expect(screen.getByTestId("audit-filter-bar")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-event-type")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-outcome")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-reset")).toBeInTheDocument();
  });

  it("reset button is disabled when filters are at default", async () => {
    renderPage();
    await screen.findByTestId("audit-list");
    expect(screen.getByTestId("audit-filter-reset")).toBeDisabled();
  });

  it("applies event_type filter and narrows the list to matching events", async () => {
    let lastListUrl: string | null = null;
    server.use(
      http.get(`${API_BASE}/audit/events`, ({ request }) => {
        lastListUrl = request.url;
        const url = new URL(request.url);
        const filter = url.searchParams.get("event_type");
        const events =
          filter === "ADMIN_ACTION"
            ? [
                {
                  audit_id: "aud-admin-only",
                  event_type: "ADMIN_ACTION",
                  actor_entity_id: "ent-self",
                  target_entity_id: "ent-self",
                  target_capsule_id: null,
                  session_id: "ses-001",
                  outcome: "SUCCESS",
                  denial_reason: null,
                  details: { action: "TEST_FILTER" },
                  ip_address: "10.0.0.1",
                  timestamp: "2026-05-31T18:32:00.000Z",
                  previous_event_hash: null,
                  event_hash:
                    "0000000000000000000000000000000000000000000000000000000000000003",
                  lawful_basis_id: null,
                  lawful_basis_chain_hash: null,
                  jurisdiction: null,
                },
              ]
            : [];
        return HttpResponse.json(
          {
            ok: true,
            page: 1,
            page_size: 25,
            total: events.length,
            events,
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list-empty");
    // Open the Select trigger and pick ADMIN_ACTION.
    await user.click(screen.getByTestId("audit-filter-event-type"));
    await user.click(
      await screen.findByRole("option", { name: /Admin Action/i }),
    );
    const list = await screen.findByTestId("audit-list");
    expect(within(list).getAllByTestId("audit-row").length).toBe(1);
    expect(lastListUrl).not.toBeNull();
    expect(lastListUrl!).toContain("event_type=ADMIN_ACTION");
  });

  it("Reset button restores defaults + re-enables the All view", async () => {
    server.use(
      http.get(`${API_BASE}/audit/events`, ({ request }) => {
        const url = new URL(request.url);
        const filter = url.searchParams.get("event_type");
        const events =
          filter === "ADMIN_ACTION"
            ? [
                {
                  audit_id: "aud-admin-only",
                  event_type: "ADMIN_ACTION",
                  actor_entity_id: "ent-self",
                  target_entity_id: "ent-self",
                  target_capsule_id: null,
                  session_id: "ses-001",
                  outcome: "SUCCESS",
                  denial_reason: null,
                  details: { action: "TEST_FILTER" },
                  ip_address: "10.0.0.1",
                  timestamp: "2026-05-31T18:32:00.000Z",
                  previous_event_hash: null,
                  event_hash:
                    "0000000000000000000000000000000000000000000000000000000000000003",
                  lawful_basis_id: null,
                  lawful_basis_chain_hash: null,
                  jurisdiction: null,
                },
              ]
            : section7EventsForReset;
        return HttpResponse.json(
          {
            ok: true,
            page: 1,
            page_size: 25,
            total: events.length,
            events,
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list");
    // Apply filter.
    await user.click(screen.getByTestId("audit-filter-event-type"));
    await user.click(
      await screen.findByRole("option", { name: /Admin Action/i }),
    );
    await screen.findByTestId("audit-list");
    expect(screen.getByTestId("audit-filter-reset")).not.toBeDisabled();
    // Reset.
    await user.click(screen.getByTestId("audit-filter-reset"));
    expect(screen.getByTestId("audit-filter-reset")).toBeDisabled();
  });
});

// 3-event fixture for the reset test (matches MSW default
// fixture chain but lives here for isolation).
const section7EventsForReset = [
  {
    audit_id: "aud-7-001",
    event_type: "LOGIN_SUCCESS",
    actor_entity_id: "ent-self",
    target_entity_id: "ent-self",
    target_capsule_id: null,
    session_id: "ses-001",
    outcome: "SUCCESS",
    denial_reason: null,
    details: { action: "LOGIN" },
    ip_address: "10.0.0.1",
    timestamp: "2026-05-31T18:30:00.000Z",
    previous_event_hash: null,
    event_hash:
      "0000000000000000000000000000000000000000000000000000000000000001",
    lawful_basis_id: null,
    lawful_basis_chain_hash: null,
    jurisdiction: null,
  },
  {
    audit_id: "aud-7-002",
    event_type: "CAPSULE_CREATED",
    actor_entity_id: "ent-self",
    target_entity_id: "ent-self",
    target_capsule_id: "cap-9001",
    session_id: "ses-001",
    outcome: "SUCCESS",
    denial_reason: null,
    details: { action: "CAPSULE_CREATED", capsule_type: "PREFERENCE" },
    ip_address: "10.0.0.1",
    timestamp: "2026-05-31T18:31:00.000Z",
    previous_event_hash:
      "0000000000000000000000000000000000000000000000000000000000000001",
    event_hash:
      "0000000000000000000000000000000000000000000000000000000000000002",
    lawful_basis_id: null,
    lawful_basis_chain_hash: null,
    jurisdiction: null,
  },
];

describe("Section 7 Security & Audit — verify-chain panel (D2.2)", () => {
  it("renders the verify-chain card with an idle Run button", async () => {
    renderPage();
    await screen.findByTestId("verify-chain-card");
    expect(screen.getByTestId("verify-chain-idle")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Verify chain/i }),
    ).toBeInTheDocument();
  });

  it("runs verify-chain on Run click and renders verified state + boundary hashes", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("verify-chain-card");
    await user.click(screen.getByTestId("verify-chain-run"));
    const result = await screen.findByTestId("verify-chain-result");
    expect(within(result).getByText(/^Verified$/)).toBeInTheDocument();
    expect(within(result).getByText(/Scope: self/i)).toBeInTheDocument();
    expect(within(result).getByText(/3 events checked/i)).toBeInTheDocument();
    expect(
      within(result).getByText(/SHA-256\/14-field-canonical-record/),
    ).toBeInTheDocument();
    expect(within(result).getByText(/aud-7-001/)).toBeInTheDocument();
    expect(within(result).getByText(/aud-7-003/)).toBeInTheDocument();
  });

  it("renders failure surface with broken_at_event_id + failure_reason when verified=false", async () => {
    server.use(
      http.get(`${API_BASE}/audit/verify-chain`, () =>
        HttpResponse.json(
          {
            ok: true,
            scope: "self",
            verified: false,
            checked_event_count: 2,
            chain_algorithm: "SHA-256/14-field-canonical-record",
            window_start: "2026-05-31T18:30:00.000Z",
            window_end: "2026-05-31T18:31:00.000Z",
            first_event_id: "aud-7-001",
            last_event_id: "aud-7-002",
            first_event_hash:
              "0000000000000000000000000000000000000000000000000000000000000001",
            last_event_hash:
              "0000000000000000000000000000000000000000000000000000000000000002",
            broken_at_event_id: "aud-7-002",
            failure_reason: "HASH_MISMATCH",
            lawful_basis_id: null,
            evidence_note: "Chain broken at second event.",
            honest_note: "Self-scope verification.",
          },
          { status: 200 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("verify-chain-card");
    await user.click(screen.getByTestId("verify-chain-run"));
    const failure = await screen.findByTestId("verify-chain-failure");
    expect(within(failure).getByText(/aud-7-002/)).toBeInTheDocument();
    expect(within(failure).getByText(/HASH_MISMATCH/)).toBeInTheDocument();
    expect(
      screen.getByText(/Verification failed/i),
    ).toBeInTheDocument();
  });

  it("renders safe error block when the verify-chain endpoint fails", async () => {
    server.use(
      http.get(`${API_BASE}/audit/verify-chain`, () =>
        HttpResponse.json(
          { ok: false, code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("verify-chain-card");
    await user.click(screen.getByTestId("verify-chain-run"));
    const err = await screen.findByTestId("verify-chain-error");
    expect(err).toHaveTextContent(/Chain verification could not run/i);
    expect(err).toHaveTextContent(/INTERNAL_ERROR/);
  });
});

describe("Section 7 Security & Audit — scope toggle (D5)", () => {
  function setAuthAllCapabilities() {
    useAuthStore.setState({
      token: "tok",
      entity: { email: "admin@example.com" },
      isAuthenticated: true,
      capabilities: {
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_admin_org: true,
        can_admin_niov: true,
      },
    } as never);
  }

  it("renders the scope Select with all 3 options when caller has all capabilities", async () => {
    setAuthAllCapabilities();
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list");
    expect(screen.getByTestId("audit-filter-scope")).toBeInTheDocument();
    // Default value is self.
    expect(screen.getByTestId("audit-filter-scope")).toHaveTextContent(
      /Self/i,
    );
    // Open and inspect options.
    await user.click(screen.getByTestId("audit-filter-scope"));
    expect(
      await screen.findByRole("option", { name: /Self/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Org \(admin\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Platform \(NIOV admin\)/i }),
    ).toBeInTheDocument();
  });

  it("hides Org + Platform options when caller lacks the capabilities", async () => {
    // Override auth store for this test only — non-admin caller.
    useAuthStore.setState({
      token: "tok",
      entity: { email: "user@example.com" },
      isAuthenticated: true,
      capabilities: {
        can_read_capsules: true,
        can_write_capsules: true,
        can_share_capsules: true,
        can_admin_org: false,
        can_admin_niov: false,
      },
    } as never);
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list");
    await user.click(screen.getByTestId("audit-filter-scope"));
    expect(
      await screen.findByRole("option", { name: /Self/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Org \(admin\)/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Platform \(NIOV admin\)/i }),
    ).not.toBeInTheDocument();
  });

  it("scope change serializes via the wire and refetches the list", async () => {
    let lastListUrl: string | null = null;
    server.use(
      http.get(`${API_BASE}/audit/events`, ({ request }) => {
        lastListUrl = request.url;
        return HttpResponse.json(
          { ok: true, page: 1, page_size: 25, total: 0, events: [] },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list-empty");
    await user.click(screen.getByTestId("audit-filter-scope"));
    await user.click(await screen.findByRole("option", { name: /Org/i }));
    await screen.findByTestId("audit-list-empty");
    expect(lastListUrl).not.toBeNull();
    expect(lastListUrl!).toContain("scope=org");
  });

  it("ORG_SCOPE_FORBIDDEN renders safely as an error block with code", async () => {
    // Stateful handler: returns the default 3-event fixture
    // chain for scope=self, returns 403 ORG_SCOPE_FORBIDDEN
    // for scope=org. Mirrors how Foundation actually behaves
    // when a caller without can_admin_org TRIES to switch
    // scope mid-session.
    server.use(
      http.get(`${API_BASE}/audit/events`, ({ request }) => {
        const url = new URL(request.url);
        const scope = url.searchParams.get("scope") ?? "self";
        if (scope === "org") {
          return HttpResponse.json(
            {
              ok: false,
              code: "ORG_SCOPE_FORBIDDEN",
              message:
                "scope=org requires can_admin_org on the caller's TAR.",
            },
            { status: 403 },
          );
        }
        return HttpResponse.json(
          {
            ok: true,
            page: 1,
            page_size: 25,
            total: 1,
            events: [
              {
                audit_id: "aud-self-1",
                event_type: "LOGIN_SUCCESS",
                actor_entity_id: "ent-self",
                target_entity_id: "ent-self",
                target_capsule_id: null,
                session_id: "ses-001",
                outcome: "SUCCESS",
                denial_reason: null,
                details: { action: "LOGIN" },
                ip_address: "10.0.0.1",
                timestamp: "2026-05-31T18:30:00.000Z",
                previous_event_hash: null,
                event_hash:
                  "0000000000000000000000000000000000000000000000000000000000000001",
                lawful_basis_id: null,
                lawful_basis_chain_hash: null,
                jurisdiction: null,
              },
            ],
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list");
    await user.click(screen.getByTestId("audit-filter-scope"));
    await user.click(await screen.findByRole("option", { name: /Org/i }));
    const err = await screen.findByTestId("audit-list-error");
    expect(err).toHaveTextContent(/ORG_SCOPE_FORBIDDEN/);
  });

  it("Reset restores scope to self", async () => {
    setAuthAllCapabilities();
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list");
    await user.click(screen.getByTestId("audit-filter-scope"));
    await user.click(await screen.findByRole("option", { name: /Platform/i }));
    expect(screen.getByTestId("audit-filter-reset")).not.toBeDisabled();
    await user.click(screen.getByTestId("audit-filter-reset"));
    expect(screen.getByTestId("audit-filter-scope")).toHaveTextContent(
      /Self/i,
    );
    expect(screen.getByTestId("audit-filter-reset")).toBeDisabled();
  });
});

describe("Section 7 Security & Audit — text/date filters (D4)", () => {
  it("renders the text + date filter row + 4 new controls", async () => {
    renderPage();
    await screen.findByTestId("audit-list");
    expect(
      screen.getByTestId("audit-filter-bar-text-date"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("audit-filter-target-entity"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("audit-filter-target-capsule"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("audit-filter-start-time"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("audit-filter-end-time"),
    ).toBeInTheDocument();
  });

  it("invalid UUID surfaces inline warning AND is NOT forwarded to the wire", async () => {
    let lastListUrl: string | null = null;
    server.use(
      http.get(`${API_BASE}/audit/events`, ({ request }) => {
        lastListUrl = request.url;
        return HttpResponse.json(
          { ok: true, page: 1, page_size: 25, total: 0, events: [] },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    // The override handler returns zero events, so the list
    // surface renders the empty-state testid (not audit-list).
    await screen.findByTestId("audit-list-empty");
    await user.type(
      screen.getByTestId("audit-filter-target-entity"),
      "not-a-uuid",
    );
    expect(
      await screen.findByTestId("audit-filter-target-entity-invalid"),
    ).toBeInTheDocument();
    expect(lastListUrl).not.toBeNull();
    expect(lastListUrl!).not.toContain("target_entity_id=not-a-uuid");
  });

  it("valid target_entity_id UUID is forwarded as a query param and narrows the list", async () => {
    let lastListUrl: string | null = null;
    server.use(
      http.get(`${API_BASE}/audit/events`, ({ request }) => {
        lastListUrl = request.url;
        const url = new URL(request.url);
        const target = url.searchParams.get("target_entity_id");
        const events =
          target === "11111111-2222-3333-4444-555555555555"
            ? [
                {
                  audit_id: "aud-targeted-001",
                  event_type: "ADMIN_ACTION",
                  actor_entity_id: "ent-self",
                  target_entity_id: target,
                  target_capsule_id: null,
                  session_id: "ses-001",
                  outcome: "SUCCESS",
                  denial_reason: null,
                  details: { action: "TEST_TARGETED" },
                  ip_address: "10.0.0.1",
                  timestamp: "2026-05-31T18:33:00.000Z",
                  previous_event_hash: null,
                  event_hash:
                    "0000000000000000000000000000000000000000000000000000000000000010",
                  lawful_basis_id: null,
                  lawful_basis_chain_hash: null,
                  jurisdiction: null,
                },
              ]
            : [];
        return HttpResponse.json(
          {
            ok: true,
            page: 1,
            page_size: 25,
            total: events.length,
            events,
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list-empty");
    await user.type(
      screen.getByTestId("audit-filter-target-entity"),
      "11111111-2222-3333-4444-555555555555",
    );
    const list = await screen.findByTestId("audit-list");
    expect(within(list).getAllByTestId("audit-row").length).toBe(1);
    expect(lastListUrl).not.toBeNull();
    expect(lastListUrl!).toContain(
      "target_entity_id=11111111-2222-3333-4444-555555555555",
    );
  });

  it("Reset clears text + date filters in addition to event_type + outcome", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("audit-list");
    await user.type(
      screen.getByTestId("audit-filter-target-entity"),
      "11111111-2222-3333-4444-555555555555",
    );
    await user.type(
      screen.getByTestId("audit-filter-target-capsule"),
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
    expect(screen.getByTestId("audit-filter-reset")).not.toBeDisabled();
    await user.click(screen.getByTestId("audit-filter-reset"));
    expect(screen.getByTestId("audit-filter-target-entity")).toHaveValue("");
    expect(screen.getByTestId("audit-filter-target-capsule")).toHaveValue("");
    expect(screen.getByTestId("audit-filter-reset")).toBeDisabled();
  });
});

describe("Section 7 Security & Audit — audit export (D3)", () => {
  it("renders the export bar + format Select + Download button", async () => {
    renderPage();
    await screen.findByTestId("audit-list");
    expect(screen.getByTestId("audit-export-bar")).toBeInTheDocument();
    expect(
      screen.getByTestId("audit-export-format"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("audit-export-download"),
    ).toBeInTheDocument();
  });

  it("download click hits the export endpoint with format=ndjson and writes summary", async () => {
    let lastExportUrl: string | null = null;
    server.use(
      http.get(`${API_BASE}/audit/events/export`, ({ request }) => {
        lastExportUrl = request.url;
        const url = new URL(request.url);
        const format = url.searchParams.get("format") ?? "ndjson";
        const body = '{"audit_id":"aud-7-001"}\n{"audit_id":"aud-7-002"}';
        return new HttpResponse(body, {
          status: 200,
          headers: {
            "content-type": "application/x-ndjson; charset=utf-8",
            "x-audit-row-count": "2",
            "x-audit-truncated": "false",
            "x-audit-scope": "self",
            "x-audit-format": format,
          },
        });
      }),
    );
    // jsdom doesn't ship URL.createObjectURL; stub it for the test.
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => "blob:mock-url";
    URL.revokeObjectURL = () => undefined;
    try {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("audit-list");
      await user.click(screen.getByTestId("audit-export-download"));
      const summary = await screen.findByTestId("audit-export-summary");
      expect(summary).toHaveTextContent(/Last export: 2 rows · NDJSON/i);
      expect(lastExportUrl).not.toBeNull();
      expect(lastExportUrl!).toContain("format=ndjson");
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it("download forwards CSV format when selected", async () => {
    let lastExportUrl: string | null = null;
    server.use(
      http.get(`${API_BASE}/audit/events/export`, ({ request }) => {
        lastExportUrl = request.url;
        return new HttpResponse(
          "audit_id,event_type\naud-7-001,LOGIN_SUCCESS",
          {
            status: 200,
            headers: {
              "content-type": "text/csv; charset=utf-8",
              "x-audit-row-count": "1",
              "x-audit-truncated": "false",
              "x-audit-scope": "self",
              "x-audit-format": "csv",
            },
          },
        );
      }),
    );
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => "blob:mock-url";
    URL.revokeObjectURL = () => undefined;
    try {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("audit-list");
      // Switch format to CSV.
      await user.click(screen.getByTestId("audit-export-format"));
      await user.click(
        await screen.findByRole("option", { name: "CSV" }),
      );
      await user.click(screen.getByTestId("audit-export-download"));
      const summary = await screen.findByTestId("audit-export-summary");
      expect(summary).toHaveTextContent(/Last export: 1 row · CSV/i);
      expect(lastExportUrl).not.toBeNull();
      expect(lastExportUrl!).toContain("format=csv");
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });

  it("export error renders safe error message with code", async () => {
    server.use(
      http.get(`${API_BASE}/audit/events/export`, () =>
        HttpResponse.json(
          { ok: false, code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = () => "blob:mock-url";
    try {
      const user = userEvent.setup();
      renderPage();
      await screen.findByTestId("audit-list");
      await user.click(screen.getByTestId("audit-export-download"));
      const err = await screen.findByTestId("audit-export-error");
      expect(err).toHaveTextContent(/INTERNAL_ERROR/);
    } finally {
      URL.createObjectURL = originalCreate;
    }
  });
});

describe("Section 7 Security & Audit — forbidden-copy + no-leak guards", () => {
  it("never displays any forbidden ADR-0077-family UI copy", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByTestId("audit-list");
    await user.click(
      screen.getByTestId("audit-row-button-aud-7-003"),
    );
    await screen.findByTestId("audit-detail-panel");
    const text = (container.textContent ?? "").toLowerCase();
    for (const forbidden of FORBIDDEN_UI_COPY) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("never leaks raw-payload / secret / chain-of-thought tokens", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByTestId("audit-list");
    await user.click(
      screen.getByTestId("audit-row-button-aud-7-003"),
    );
    await screen.findByTestId("audit-detail-panel");
    const text = (container.textContent ?? "").toLowerCase();
    for (const token of FORBIDDEN_NO_LEAK_TOKENS) {
      expect(text).not.toContain(token);
    }
  });
});
