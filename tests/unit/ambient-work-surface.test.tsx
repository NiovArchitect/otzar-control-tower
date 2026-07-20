// FILE: tests/unit/ambient-work-surface.test.tsx
// PURPOSE: Today is a one-shot ambient surface — Focus (≤3 actions) + glance
//          chips + Talk. Not a scroll wall. ADHD calm; YC signal.
// CONNECTS TO: src/pages/app/AmbientWorkSurface.tsx.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AmbientWorkSurface } from "@/pages/app/AmbientWorkSurface";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";

const API_BASE = "http://localhost:3000/api/v1";

beforeEach(() => {
  useAuthStore.setState({
    token: "t",
    entity: { email: "vishesh@niovlabs.com" },
    isAuthenticated: true,
  });
  usePresenceStore.getState().reset();
  useCurrentSurfaceContextStore.getState().clear();
  // First-use strip must not inflate default density in unit tests.
  try {
    localStorage.setItem("otzar_first_use_v1:vishesh@niovlabs.com", "done");
  } catch {
    /* ignore */
  }
  server.use(
    http.get(`${API_BASE}/otzar/my-day/intelligence`, () =>
      HttpResponse.json(intelligence([])),
    ),
    http.get(`${API_BASE}/otzar/dgi-coherence`, () =>
      HttpResponse.json({
        ok: true,
        coherence: {
          open_obligations_count: 0,
          open_obligation_titles: [],
          open_org_truth_conflicts_count: 0,
          active_personal_corrections_count: 0,
          active_twin_authority_grants_count: 0,
          open_incoming_handoffs_count: 0,
          open_incoming_handoff_titles: [],
          twin_pairing_status: "PAIRED",
          twin_entity_id: "t1",
          eligible_twin_count: 1,
          coherence_status: "HEALTHY",
          attention_count: 0,
          system_block: "",
        },
      }),
    ),
    http.get(`${API_BASE}/work-os/my-work`, () =>
      HttpResponse.json({ ok: true, items: [], has_more: false }),
    ),
    http.get(`${API_BASE}/work-os/blind-spots`, () =>
      HttpResponse.json({ ok: true, items: [] }),
    ),
  );
});
afterEach(() => cleanup());

function renderSurface(): void {
  render(
    <MemoryRouter>
      <AmbientWorkSurface />
    </MemoryRouter>,
  );
}

function intelligence(suggestions: unknown[]) {
  return {
    ok: true,
    intelligence: {
      headline:
        suggestions.length === 0
          ? "Nothing needs your attention right now. Otzar is keeping watch."
          : `Otzar found ${suggestions.length} ${suggestions.length === 1 ? "thing" : "things"} that may need your attention.`,
      suggestions,
      signals: {},
      waiting_on_external: { they_owe_us_count: 0, we_owe_them_count: 0 },
      provider_status: "LOCAL",
      generated_at: "2026-07-01T00:00:00.000Z",
    },
  };
}

describe("AmbientWorkSurface — one-shot Focus (not a card wall)", () => {
  it("is calm when nothing needs the human", async () => {
    renderSurface();
    expect(screen.getByTestId("ambient-work-surface")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("ambient-caught-up")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("needs-approvals")).not.toBeInTheDocument();
    expect(screen.queryByTestId("needs-replies")).not.toBeInTheDocument();
    // One Talk CTA, not a stack of panels
    expect(screen.getByTestId("ambient-talk")).toBeInTheDocument();
    expect(screen.getByTestId("today-glance")).toBeInTheDocument();
  });

  it("puts approvals in Focus with specific copy (not vague 'decisions')", async () => {
    usePresenceStore.getState().setSignals({ approvalsCount: 2 });
    renderSurface();
    const row = await screen.findByTestId("needs-approvals");
    expect(row).toHaveTextContent(/2 approvals are waiting/i);
    expect(row.textContent ?? "").not.toMatch(/\bdecisions?\b/i);
  });

  it("shows replies that need review in Focus", async () => {
    usePresenceStore.getState().setSignals({
      unreadCount: 1,
      actionUnreadCount: 1,
    });
    renderSurface();
    const replies = await screen.findByTestId("needs-replies");
    expect(replies).toHaveTextContent(/1 reply to review/i);
    expect(replies.textContent ?? "").not.toMatch(/tracking/i);
  });

  it("calm FYI unread does not create Focus rows", async () => {
    usePresenceStore.getState().setSignals({
      unreadCount: 1,
      actionUnreadCount: 0,
    });
    renderSurface();
    await waitFor(() =>
      expect(screen.getByTestId("ambient-caught-up")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("needs-replies")).toBeNull();
  });

  it("never labels arrived inbox as 'Otzar is handling'", () => {
    usePresenceStore.getState().setSignals({
      unreadCount: 3,
      actionUnreadCount: 3,
    });
    const { container } = render(
      <MemoryRouter>
        <AmbientWorkSurface />
      </MemoryRouter>,
    );
    expect(container.textContent ?? "").not.toMatch(/otzar is handling/i);
  });

  it("Talk opens the orb — one invocation", async () => {
    const open = vi.fn();
    window.addEventListener("otzar:open", open);
    const user = userEvent.setup();
    renderSurface();
    await user.click(screen.getByTestId("ambient-talk"));
    expect(open).toHaveBeenCalledTimes(1);
    window.removeEventListener("otzar:open", open);
  });

  it("context lives under More detail, not a default Focus card", async () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "unknown",
      title: "the launch plan",
    });
    const user = userEvent.setup();
    renderSurface();
    // Focus is empty (caught up) — context is not a Focus row
    await waitFor(() =>
      expect(screen.getByTestId("ambient-caught-up")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("changed-suggestions")).toBeNull();
    await user.click(screen.getByTestId("today-more-details"));
    expect(await screen.findByTestId("context-active")).toHaveTextContent(
      /launch plan/i,
    );
    await user.click(screen.getByTestId("context-clear"));
    await waitFor(() =>
      expect(useCurrentSurfaceContextStore.getState().context).toBeNull(),
    );
  });
});

describe("AmbientWorkSurface — headline / suggestions in Focus", () => {
  it("attention headline and counted suggestion appear in Focus", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-day/intelligence`, () =>
        HttpResponse.json(
          intelligence([
            {
              rank: 1,
              reason: "EXPIRING_AUTHORITY",
              safe_title: "An access grant expires this week",
              confidence: "HIGH",
              risk: "NONE",
            },
          ]),
        ),
      ),
    );
    renderSurface();
    await waitFor(() =>
      expect(screen.getByTestId("changed-headline")).toHaveTextContent(
        /found 1 thing/i,
      ),
    );
    const links = screen.getAllByTestId("changed-suggestion");
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveTextContent("An access grant expires this week");
  });

  it("calm headline alone does not invent Focus rows", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-day/intelligence`, () =>
        HttpResponse.json(intelligence([])),
      ),
    );
    renderSurface();
    await waitFor(() =>
      expect(screen.getByTestId("ambient-caught-up")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("changed-headline")).toBeNull();
    expect(screen.queryAllByTestId("changed-suggestion")).toHaveLength(0);
  });
});

describe("AmbientWorkSurface — Twin work in Focus when human must act", () => {
  it("surfaces twin claims that need verification", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            {
              ledger_entry_id: "tw-1",
              ledger_type: "TASK",
              source_type: "TRANSCRIPT",
              source_command: null,
              work_plan_id: null,
              requester_entity_id: null,
              owner_entity_id: null,
              target_entity_id: null,
              title: "Insurance prior-auth form",
              status: "EXECUTING",
              priority: "PROJECT_CRITICAL",
              extraction_source: "TRANSCRIPT",
              next_action: "Twin executing",
              due_at: null,
              created_at: "2026-07-16T12:00:00.000Z",
              twin_work: {
                state: "CLAIMED_WORKING",
                work_kind: "DOCUMENT",
                accuracy_class: "INSURANCE",
                requires_verification: true,
                claimed_at: "2026-07-16T12:00:00.000Z",
                web_view_link: "https://docs.google.com/document/d/abc/edit",
                clarity_question: null,
              },
            },
          ],
          has_more: false,
        }),
      ),
    );
    renderSurface();
    const row = await screen.findByTestId("twin-working-row");
    expect(row).toHaveTextContent(/Insurance prior-auth form/i);
    expect(screen.queryByTestId("ambient-caught-up")).toBeNull();
  });

  it("stays silent when my-work has no twin claims needing the human", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            {
              ledger_entry_id: "plain-1",
              ledger_type: "TASK",
              source_type: "TRANSCRIPT",
              source_command: null,
              work_plan_id: null,
              requester_entity_id: null,
              owner_entity_id: null,
              target_entity_id: null,
              title: "Ordinary task",
              status: "DETECTED",
              priority: "ROUTINE",
              extraction_source: "TRANSCRIPT",
              next_action: null,
              due_at: null,
              created_at: "2026-07-16T12:00:00.000Z",
            },
          ],
          has_more: false,
        }),
      ),
    );
    renderSurface();
    await waitFor(() =>
      expect(screen.queryByTestId("twin-working-row")).toBeNull(),
    );
  });
});

describe("AmbientWorkSurface — urgent blind spots in Focus", () => {
  function blindItem(lane: string) {
    return {
      ledger_entry_id: `b-${lane}`,
      ledger_type: "TASK",
      source_type: "TRANSCRIPT",
      source_command: null,
      work_plan_id: null,
      requester_entity_id: null,
      owner_entity_id: null,
      target_entity_id: null,
      title: lane,
      status: "DETECTED",
      priority: "NORMAL",
      extraction_source: "LLM",
      next_action: null,
      due_at: null,
      created_at: "2026-07-01T00:00:00Z",
      routing: {
        lane,
        reason: "x",
        risk: "low",
        confidence: null,
        policy_basis: null,
        owner_entity_id: null,
        owner_status: "unowned",
        next_best_action: null,
        required_tool: null,
        evidence_refs: [],
        audit_pointer: null,
      },
    };
  }

  it("urgent lanes produce a stuck decision line in Focus", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/blind-spots`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            blindItem("blocked"),
            blindItem("setup_required"),
            blindItem("silent_capture"),
          ],
        }),
      ),
    );
    renderSurface();
    const line = await screen.findByTestId("needs-blind-spots");
    expect(line).toHaveTextContent("2 items are stuck and need a decision");
    expect(line).toHaveAttribute("href", "/app/action-center");
  });

  it("non-urgent backlog adds nothing to Focus", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/blind-spots`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            blindItem("silent_capture"),
            blindItem("silent_routing"),
            blindItem("draft_ready"),
          ],
        }),
      ),
    );
    renderSurface();
    await waitFor(() =>
      expect(screen.getByTestId("ambient-caught-up")).toBeInTheDocument(),
    );
    // Glance may still link to Needs me; Focus row must be absent.
    expect(
      screen.queryByText(/stuck and need a decision/i),
    ).toBeNull();
  });
});
