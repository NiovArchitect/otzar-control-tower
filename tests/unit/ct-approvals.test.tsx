// FILE: tests/unit/ct-approvals.test.tsx
// PURPOSE: Page tests for the Section 9 Control Tower
//          ApprovalsPage at /approvals (org-admin Control Tower
//          surface; distinct from the employee /app/approvals
//          page already covered by tests/unit/approvals.test.tsx).
//          Verifies:
//          - nav entry exists for the CT /approvals route
//          - page header renders
//          - pending list endpoint called + rows render with
//            safe closed-vocab labels
//          - detail panel opens on row click
//          - approve / reject mutations use the mandatory
//            two-step confirm dialog + dispatch to Foundation
//          - two-person rule UI disable when caller is the
//            source (Foundation enforces server-side; CT UX
//            mirrors)
//          - 403 ESCALATION_FORBIDDEN renders as safe error
//          - empty + loading + error states render safely
//          - forbidden-copy + no-leak guards green
// CONNECTS TO: src/pages/Approvals.tsx (CT ApprovalsPage),
//              src/lib/api.ts (api.escalations.*),
//              src/lib/types/foundation.ts (Escalation + envelope
//              types), src/lib/nav.ts, tests/msw/handlers.ts.

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
import { ApprovalsPage } from "@/pages/Approvals";
import { useAuthStore } from "@/lib/stores/auth";
import { NAV } from "@/lib/nav";

const API_BASE = "http://localhost:3000/api/v1";

const ME_ENTITY_ID = "me-entity-0001";
const APPROVABLE_ID = "e1111111-1111-1111-1111-111111111111";
const SELF_TARGET_ID = "e2222222-2222-2222-2222-222222222222";

function setAuthAsCaller(opts: { withEntityId?: boolean } = {}) {
  useAuthStore.setState({
    token: "tok",
    entity:
      opts.withEntityId === true
        ? ({ email: "me@example.com", entity_id: ME_ENTITY_ID } as never)
        : { email: "me@example.com" },
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
        <ApprovalsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  setAuthAsCaller();
});

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
  "resolution_metadata",
];

describe("Section 9 Control Tower Approvals — nav + page shell", () => {
  it("registers /approvals in the main nav", () => {
    const entry = NAV.find((n) => n.to === "/approvals");
    expect(entry).toBeDefined();
  });

  it("renders the page header", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: /Pending Approvals/i }),
    ).toBeInTheDocument();
  });
});

describe("Section 9 Control Tower Approvals — pending list", () => {
  it("renders the caller's pending queue with safe closed-vocab labels", async () => {
    renderPage();
    const list = await screen.findByTestId("approval-list");
    const rows = within(list).getAllByTestId("approval-row");
    expect(rows.length).toBe(2);
    expect(screen.getByText(/Compliance Gate/i)).toBeInTheDocument();
    expect(screen.getByText(/Dual Control Required/i)).toBeInTheDocument();
  });

  it("renders honest empty-state when no pending approvals", async () => {
    server.use(
      http.get(`${API_BASE}/escalations/pending`, () =>
        HttpResponse.json(
          { ok: true, escalations: [] },
          { status: 200 },
        ),
      ),
    );
    renderPage();
    const empty = await screen.findByTestId("approval-list-empty");
    expect(empty).toHaveTextContent(/No pending approvals/i);
  });

  it("renders safe error block with Retry when list fails", async () => {
    server.use(
      http.get(`${API_BASE}/escalations/pending`, () =>
        HttpResponse.json(
          { ok: false, code: "INTERNAL_ERROR" },
          { status: 500 },
        ),
      ),
    );
    renderPage();
    const err = await screen.findByTestId("approval-list-error");
    expect(err).toHaveTextContent(/Failed to load pending approvals/i);
    expect(
      within(err).getByRole("button", { name: /Retry/i }),
    ).toBeInTheDocument();
  });
});

describe("Section 9 Control Tower Approvals — detail panel", () => {
  it("shows empty selector card before any row is clicked", async () => {
    renderPage();
    await screen.findByTestId("approval-list");
    expect(screen.getByTestId("approval-detail-empty")).toBeInTheDocument();
  });

  it("opens detail on row click + renders safe metadata", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("approval-list");
    await user.click(
      screen.getByTestId(`approval-row-button-${APPROVABLE_ID}`),
    );
    const panel = await screen.findByTestId("approval-detail-panel");
    expect(panel).toBeInTheDocument();
    expect(
      within(panel).getByTestId("detail-escalation-id"),
    ).toHaveTextContent(APPROVABLE_ID);
  });

  it("403 ESCALATION_FORBIDDEN renders safely as detail error", async () => {
    // Override the detail handler only for non-`pending` ids —
    // MSW's `/escalations/:id` path matcher also matches
    // `/escalations/pending`, so a blanket override would shadow
    // the list handler. Fall through to the default pending
    // handler when id === "pending".
    server.use(
      http.get(`${API_BASE}/escalations/:id`, ({ params }) => {
        if (params.id === "pending") return undefined;
        return HttpResponse.json(
          { ok: false, code: "ESCALATION_FORBIDDEN" },
          { status: 403 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("approval-list");
    await user.click(
      screen.getByTestId(`approval-row-button-${APPROVABLE_ID}`),
    );
    const err = await screen.findByTestId("approval-detail-error");
    expect(err).toHaveTextContent(/ESCALATION_FORBIDDEN/);
  });
});

describe("Section 9 Control Tower Approvals — approve / deny mutations (two-step confirm)", () => {
  it("approve requires explicit confirm + dispatches to Foundation", async () => {
    let lastApproveId: string | null = null;
    server.use(
      http.post(`${API_BASE}/escalations/:id/approve`, ({ params }) => {
        lastApproveId = String(params.id);
        return HttpResponse.json(
          {
            ok: true,
            escalation: {
              escalation_id: String(params.id),
              source_entity_id: "agent-entity-0001",
              target_entity_id: ME_ENTITY_ID,
              capsule_id: null,
              escalation_type: "COMPLIANCE_GATE",
              severity: "HIGH",
              description: "Resolved.",
              status: "APPROVED",
              resolved_by_entity_id: ME_ENTITY_ID,
              resolution_metadata: null,
              created_at: new Date().toISOString(),
              resolved_at: new Date().toISOString(),
              expires_at: null,
            },
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("approval-list");
    await user.click(
      screen.getByTestId(`approval-row-button-${APPROVABLE_ID}`),
    );
    await screen.findByTestId("approval-detail-panel");
    await user.click(screen.getByTestId("approval-approve-button"));
    // Confirm dialog must open first.
    const dialog = await screen.findByTestId("approval-confirm-dialog");
    expect(dialog).toBeInTheDocument();
    expect(lastApproveId).toBeNull();
    await user.click(screen.getByTestId("approval-confirm-submit"));
    // The successful mutation drops the selection; the detail
    // panel returns to the empty-selector state.
    await screen.findByTestId("approval-detail-empty");
    expect(lastApproveId).toBe(APPROVABLE_ID);
  });

  // [PROD-UX-APPROVAL-LOOP] The approver can attach a human reason to a
  // denial; it rides the reject body and persists with the decision.
  it("Deny offers a reason field and dispatches it with the rejection", async () => {
    let lastRejectBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/escalations/:id/reject`, async ({ request }) => {
        lastRejectBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        return HttpResponse.json({ ok: true }, { status: 200 });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("approval-list");
    await user.click(screen.getByTestId(`approval-row-button-${APPROVABLE_ID}`));
    await screen.findByTestId("approval-detail-panel");
    await user.click(screen.getByTestId("approval-reject-button"));
    await screen.findByTestId("approval-confirm-dialog");
    // The reason field appears on DENY (it is not part of approve).
    const reason = screen.getByTestId("approval-reject-reason");
    await user.type(reason, "Wrong recipient — rework the message.");
    await user.click(screen.getByTestId("approval-confirm-submit"));
    await screen.findByTestId("approval-detail-empty");
    expect(lastRejectBody).toEqual({ reason: "Wrong recipient — rework the message." });
  });

  it("Deny without a reason still dispatches (reason is optional)", async () => {
    let lastRejectBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/escalations/:id/reject`, async ({ request }) => {
        lastRejectBody = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        return HttpResponse.json({ ok: true }, { status: 200 });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("approval-list");
    await user.click(screen.getByTestId(`approval-row-button-${APPROVABLE_ID}`));
    await screen.findByTestId("approval-detail-panel");
    await user.click(screen.getByTestId("approval-reject-button"));
    await screen.findByTestId("approval-confirm-dialog");
    await user.click(screen.getByTestId("approval-confirm-submit"));
    await screen.findByTestId("approval-detail-empty");
    expect(lastRejectBody).toEqual({});
  });

  it("Cancel in confirm dialog never dispatches the mutation", async () => {
    let lastApproveId: string | null = null;
    server.use(
      http.post(`${API_BASE}/escalations/:id/approve`, ({ params }) => {
        lastApproveId = String(params.id);
        return HttpResponse.json({ ok: true }, { status: 200 });
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("approval-list");
    await user.click(
      screen.getByTestId(`approval-row-button-${APPROVABLE_ID}`),
    );
    await screen.findByTestId("approval-detail-panel");
    await user.click(screen.getByTestId("approval-approve-button"));
    await screen.findByTestId("approval-confirm-dialog");
    await user.click(screen.getByTestId("approval-confirm-cancel"));
    // Panel still showing; mutation never fired.
    expect(screen.getByTestId("approval-detail-panel")).toBeInTheDocument();
    expect(lastApproveId).toBeNull();
  });

  it("403 ESCALATION_FORBIDDEN on approve renders safe error inline", async () => {
    server.use(
      http.post(`${API_BASE}/escalations/:id/approve`, () =>
        HttpResponse.json(
          { ok: false, code: "ESCALATION_FORBIDDEN" },
          { status: 403 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("approval-list");
    await user.click(
      screen.getByTestId(`approval-row-button-${APPROVABLE_ID}`),
    );
    await screen.findByTestId("approval-detail-panel");
    await user.click(screen.getByTestId("approval-approve-button"));
    await user.click(
      await screen.findByTestId("approval-confirm-submit"),
    );
    const err = await screen.findByTestId("approval-mutation-error");
    expect(err).toHaveTextContent(/ESCALATION_FORBIDDEN/);
  });

  it("two-person rule disables approve/deny when caller is the source", async () => {
    setAuthAsCaller({ withEntityId: true });
    // Override the detail handler for the SELF_TARGET_ID row so
    // it reports source = ME_ENTITY_ID (the default detail
    // handler hardcodes source = ESC_AGENT_ID regardless of
    // the requested id). Fall through to the default for the
    // `pending` list path.
    server.use(
      http.get(`${API_BASE}/escalations/:id`, ({ params }) => {
        if (params.id === "pending") return undefined;
        return HttpResponse.json(
          {
            ok: true,
            escalation: {
              escalation_id: String(params.id),
              source_entity_id: ME_ENTITY_ID,
              target_entity_id: ME_ENTITY_ID,
              capsule_id: null,
              escalation_type: "DUAL_CONTROL_REQUIRED",
              severity: "HIGH",
              description: "Privileged action pending a second approver.",
              status: "PENDING",
              resolved_by_entity_id: null,
              resolution_metadata: null,
              created_at: new Date().toISOString(),
              resolved_at: null,
              expires_at: null,
            },
          },
          { status: 200 },
        );
      }),
    );
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("approval-list");
    await user.click(
      screen.getByTestId(`approval-row-button-${SELF_TARGET_ID}`),
    );
    await screen.findByTestId("approval-detail-panel");
    expect(
      screen.getByTestId("approval-two-person-block"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("approval-approve-button")).toBeDisabled();
    expect(screen.getByTestId("approval-reject-button")).toBeDisabled();
  });
});

describe("Section 9 Control Tower Approvals — forbidden-copy + no-leak guards", () => {
  it("never displays any forbidden ADR-0077-family UI copy", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByTestId("approval-list");
    await user.click(
      screen.getByTestId(`approval-row-button-${APPROVABLE_ID}`),
    );
    await screen.findByTestId("approval-detail-panel");
    const text = (container.textContent ?? "").toLowerCase();
    for (const forbidden of FORBIDDEN_UI_COPY) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("never leaks raw-payload / secret / chain-of-thought / resolution_metadata", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await screen.findByTestId("approval-list");
    await user.click(
      screen.getByTestId(`approval-row-button-${APPROVABLE_ID}`),
    );
    await screen.findByTestId("approval-detail-panel");
    const text = (container.textContent ?? "").toLowerCase();
    for (const token of FORBIDDEN_NO_LEAK_TOKENS) {
      expect(text).not.toContain(token);
    }
  });
});
