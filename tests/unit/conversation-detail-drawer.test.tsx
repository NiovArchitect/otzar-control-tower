// FILE: tests/unit/conversation-detail-drawer.test.tsx
// PURPOSE: State-matrix tests for the Wave 2B ConversationDetailDrawer
//          (ADR-0054). Exercises every detail_availability branch
//          (SUMMARY_AVAILABLE / ACTIVE_NOT_CLOSED / NO_SUMMARY_YET), the
//          403/404 error copy, the anti-overclaim boundary, the enabled
//          gating (no fetch when closed), and the privacy boundary
//          (summary_capsule_id / raw twin_id never rendered). Driving the
//          component directly is cleaner than routing all six states
//          through the two-row Conversations list.
// CONNECTS TO: src/components/employee/ConversationDetailDrawer.tsx,
//              api.otzar.conversations.detail, tests/msw/handlers.ts.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "../msw/server";
import { ConversationDetailDrawer } from "@/components/employee/ConversationDetailDrawer";
import { useAuthStore } from "@/lib/stores/auth";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth() {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: false,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
}

function renderDrawer(conversationId: string | null, open = true) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ConversationDetailDrawer
        conversationId={conversationId}
        open={open}
        onOpenChange={() => {}}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => setAuth());

describe("ConversationDetailDrawer (Wave 2B look-back)", () => {
  it("SUMMARY_AVAILABLE: shows the close summary, topics, and boundary — never raw ids", async () => {
    renderDrawer("conv-closed-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");

    const summary = await within(drawer).findByTestId("detail-summary");
    expect(summary).toHaveTextContent(/Reviewed Q4 pricing/i);
    expect(within(drawer).getByText("pricing")).toBeInTheDocument();
    expect(within(drawer).getByText("Closed")).toBeInTheDocument();
    expect(
      within(drawer).getByText("Close summary available"),
    ).toBeInTheDocument();

    // Anti-overclaim boundary (both required lines + the continuity note).
    const note = within(drawer).getByTestId("lookback-boundary-note");
    expect(note).toHaveTextContent(/Live transparency is available during/i);
    expect(note).toHaveTextContent(/This is not a transcript/i);
    expect(note).toHaveTextContent(/not retained in Wave 2B/i);

    // Privacy: summary_capsule_id + raw twin_id are never surfaced.
    const text = drawer.textContent ?? "";
    expect(text).not.toContain("cap-summary-0001");
    expect(text).not.toContain("twin-self-0001");
    expect(text).not.toMatch(/transcript body|message body|vector|embedding/i);
  });

  it("ACTIVE_NOT_CLOSED: shows the still-active state with no summary", async () => {
    renderDrawer("conv-active-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");

    expect(await within(drawer).findByTestId("detail-active")).toHaveTextContent(
      /still active/i,
    );
    expect(within(drawer).queryByTestId("detail-summary")).toBeNull();
    // Boundary still present in the active state.
    expect(
      within(drawer).getByTestId("lookback-boundary-note"),
    ).toHaveTextContent(/This is not a transcript/i);
  });

  it("NO_SUMMARY_YET: shows the closed-without-summary state", async () => {
    renderDrawer("conv-no-summary-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");

    expect(
      await within(drawer).findByTestId("detail-no-summary"),
    ).toHaveTextContent(/closed without a stored summary/i);
    expect(within(drawer).queryByTestId("detail-summary")).toBeNull();
  });

  it("403 NOT_CONVERSATION_OWNER: shows the access-scoped error copy", async () => {
    renderDrawer("conv-forbidden-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");

    expect(await within(drawer).findByTestId("detail-error")).toHaveTextContent(
      /isn't available under your access/i,
    );
    expect(within(drawer).queryByTestId("detail-summary")).toBeNull();
  });

  it("404 CONVERSATION_NOT_FOUND: shows the no-longer-available copy", async () => {
    renderDrawer("conv-missing-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");

    expect(await within(drawer).findByTestId("detail-error")).toHaveTextContent(
      /no longer available/i,
    );
  });

  it("does not fetch or render detail when closed", () => {
    renderDrawer("conv-closed-0001", false);
    // enabled gating: with open=false the Sheet content is not mounted and
    // the query never runs, so no summary appears.
    expect(screen.queryByTestId("detail-summary")).toBeNull();
    expect(screen.queryByTestId("conversation-detail-drawer")).toBeNull();
  });

  // ════════════════════════════════════════════════════════════════
  // Wave 2C: per-conversation correction signals (ADR-0055)
  // ════════════════════════════════════════════════════════════════

  it("Wave 2C: renders 'Correction signals' with count + last-correction + the two anti-overclaim phrases, and never raw correction fields", async () => {
    renderDrawer("conv-closed-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");
    const signals = await within(drawer).findByTestId("correction-signals");

    expect(signals).toHaveTextContent(/Correction signals/);
    const present = await within(signals).findByTestId("corrections-present");
    expect(present).toHaveTextContent(
      /Corrections linked to this conversation/i,
    );
    expect(present).toHaveTextContent(/3 corrections/);
    // last_correction_at is rendered via relative time ("ago"/"hours"/...).
    expect(present).toHaveTextContent(/last /i);

    // The locked backend notes carry the two required anti-overclaim
    // phrases; the consumer renders them through the notes.
    expect(signals).toHaveTextContent(/does not expose raw messages/i);
    expect(signals).toHaveTextContent(/not an employee score/i);

    // No raw correction / capsule / vector / score / manager fields leak.
    const text = signals.textContent ?? "";
    expect(text).not.toMatch(
      /payload_summary|payload_content|target_capsule_id|correction_capsule_id|storage_location|content_hash|vector|embedding|employee_score|drift_score|manager_visibility|best_practice_learned/i,
    );
    // No surveillance / overclaim copy.
    expect(text).not.toMatch(
      /drift score|manager monitoring|surveillance|message replay|full history|best practice learned|AI fixed itself|autonomous drift prevention|all corrections across the org/i,
    );
  });

  it("Wave 2C: renders the zero-state when has_corrections is false", async () => {
    renderDrawer("conv-no-corrections-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");
    const signals = await within(drawer).findByTestId("correction-signals");

    expect(
      await within(signals).findByTestId("corrections-zero"),
    ).toHaveTextContent(/Not enough correction history yet/i);
    expect(within(signals).queryByTestId("corrections-present")).toBeNull();
    // Anti-overclaim notes still surface in the zero state.
    expect(signals).toHaveTextContent(/does not expose raw messages/i);
    expect(signals).toHaveTextContent(/not an employee score/i);
  });

  it("Wave 2C: 403 on corrections renders calm access-scoped copy, detail still visible", async () => {
    // Detail succeeds for conv-closed-0001; override ONLY corrections to 403.
    server.use(
      http.get(
        `${API_BASE}/otzar/conversations/:id/corrections`,
        async () =>
          HttpResponse.json(
            {
              ok: false,
              code: "NOT_CONVERSATION_OWNER",
              message: "You do not own this conversation",
            },
            { status: 403 },
          ),
      ),
    );
    renderDrawer("conv-closed-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");

    // Detail still renders (corrections failure does not blank the drawer).
    expect(await within(drawer).findByTestId("detail-summary")).toBeInTheDocument();
    expect(
      await within(drawer).findByTestId("corrections-error"),
    ).toHaveTextContent(/not available under your current access/i);
  });

  it("Wave 2C: 404 on corrections renders calm not-found copy", async () => {
    server.use(
      http.get(
        `${API_BASE}/otzar/conversations/:id/corrections`,
        async () =>
          HttpResponse.json(
            {
              ok: false,
              code: "CONVERSATION_NOT_FOUND",
              message: "Conversation not found",
            },
            { status: 404 },
          ),
      ),
    );
    renderDrawer("conv-closed-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");
    expect(
      await within(drawer).findByTestId("corrections-error"),
    ).toHaveTextContent(/Conversation not found/i);
  });

  it("Wave 2C: generic / 500 on corrections renders neutral fallback copy", async () => {
    server.use(
      http.get(
        `${API_BASE}/otzar/conversations/:id/corrections`,
        async () =>
          HttpResponse.json(
            {
              ok: false,
              code: "INTERNAL_ERROR",
              message: "Something went wrong",
            },
            { status: 500 },
          ),
      ),
    );
    renderDrawer("conv-closed-0001");
    const drawer = await screen.findByTestId("conversation-detail-drawer");
    expect(
      await within(drawer).findByTestId("corrections-error"),
    ).toHaveTextContent(/Could not load correction signals/i);
  });
});
