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
