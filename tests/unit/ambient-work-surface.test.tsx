// FILE: tests/unit/ambient-work-surface.test.tsx
// PURPOSE: [OTZAR-LIVE-6] The new /app surface answers, from REAL state, what
//          needs the human, what Otzar is handling, and the current context —
//          collapsed summaries, calm empty state, one invocation. Panels appear
//          only when their state is real; nothing in flight → a calm "caught up",
//          never a card wall. The "Just talk" affordance invokes the orb.
// CONNECTS TO: src/pages/app/AmbientWorkSurface.tsx.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AmbientWorkSurface } from "@/pages/app/AmbientWorkSurface";
import { useAuthStore } from "@/lib/stores/auth";
import { usePresenceStore } from "@/lib/stores/presence";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";

beforeEach(() => {
  useAuthStore.setState({
    token: "t",
    entity: { email: "vishesh@niovlabs.com" },
    isAuthenticated: true,
  });
  usePresenceStore.getState().reset();
  useCurrentSurfaceContextStore.getState().clear();
});
afterEach(() => cleanup());

function renderSurface(): void {
  render(
    <MemoryRouter>
      <AmbientWorkSurface />
    </MemoryRouter>,
  );
}

describe("AmbientWorkSurface — real-state ambient summaries", () => {
  it("is calm and 'caught up' when nothing needs the human (no card wall)", () => {
    renderSurface();
    expect(screen.getByTestId("ambient-work-surface")).toBeInTheDocument();
    expect(screen.getByTestId("ambient-caught-up")).toBeInTheDocument();
    // No 'Needs you' / replies panels invented from nothing.
    expect(screen.queryByTestId("needs-me-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("needs-replies")).not.toBeInTheDocument();
  });

  it("surfaces 'Needs you' with category-specific approval copy (not vague 'decisions')", () => {
    usePresenceStore.getState().setSignals({ approvalsCount: 2 });
    renderSurface();
    const panel = screen.getByTestId("needs-me-panel");
    expect(panel).toHaveTextContent(/2 approvals are waiting/i);
    // Noun-drift gone: never "decisions"/"items"/"things".
    expect(panel.textContent ?? "").not.toMatch(/\bdecisions?\b/i);
    expect(panel.textContent ?? "").not.toMatch(/\bitems?\b/i);
    expect(panel.getAttribute("data-intensity")).toBe("attention");
  });

  it("shows arrived replies under 'Needs you' as replies to review (human must read)", () => {
    usePresenceStore.getState().setSignals({ unreadCount: 1, actionUnreadCount: 1 });
    renderSurface();
    const replies = screen.getByTestId("needs-replies");
    expect(replies).toHaveTextContent(/1 reply to review/i);
    // It lives under 'Needs you', not a mislabeled 'Otzar is handling' panel.
    expect(screen.getByTestId("needs-me-panel")).toContainElement(replies);
    // Never the overclaiming "Tracking ... replies" copy.
    expect(replies.textContent ?? "").not.toMatch(/tracking/i);
  });

  it("[ORG-AUTONOMY] a calm FYI (unread but no action needed) never nags under 'Needs you'", () => {
    // 1 unread notification, but it is a calm FYI (e.g. a scheduled-meeting
    // notice): actionUnreadCount is 0. "Needs you" must stay silent — the FYI
    // lives in the bell, not the action banner.
    usePresenceStore.getState().setSignals({ unreadCount: 1, actionUnreadCount: 0 });
    renderSurface();
    expect(screen.queryByTestId("needs-replies")).toBeNull();
    expect(screen.queryByTestId("needs-me-panel")).toBeNull();
  });

  it("never labels arrived inbox as 'Otzar is handling' (no overclaim)", () => {
    usePresenceStore.getState().setSignals({ unreadCount: 3, actionUnreadCount: 3 });
    const { container } = render(
      <MemoryRouter>
        <AmbientWorkSurface />
      </MemoryRouter>,
    );
    expect(container.textContent ?? "").not.toMatch(/otzar is handling/i);
    expect(container.textContent ?? "").not.toMatch(/\bthing\b/i);
  });

  it("shows the active current context and lets the human clear it", async () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "unknown",
      title: "the launch plan",
    });
    const user = userEvent.setup();
    renderSurface();
    expect(screen.getByTestId("context-active")).toHaveTextContent(/launch plan/i);
    await user.click(screen.getByTestId("context-clear"));
    await waitFor(() =>
      expect(useCurrentSurfaceContextStore.getState().context).toBeNull(),
    );
  });

  it("the one invocation opens the orb (voice/text engine), no page hunt", async () => {
    const open = vi.fn();
    window.addEventListener("otzar:open", open);
    const user = userEvent.setup();
    renderSurface();
    await user.click(screen.getByTestId("ambient-talk"));
    expect(open).toHaveBeenCalledTimes(1);
    window.removeEventListener("otzar:open", open);
  });
});

describe("AmbientWorkSurface — real node strip (collapsed, never decorative)", () => {
  it("shows NO node strip when there is no real state", () => {
    renderSurface();
    expect(screen.queryByTestId("surface-work-nodes")).not.toBeInTheDocument();
  });

  it("a real context produces a context node (collapsed by default)", () => {
    useCurrentSurfaceContextStore.getState().provide({
      type: "unknown",
      title: "the launch plan",
    });
    renderSurface();
    const strip = screen.getByTestId("surface-work-nodes");
    expect(strip).not.toHaveAttribute("open"); // collapsed by default
    const ctx = screen
      .getAllByTestId("surface-work-node")
      .find((n) => n.getAttribute("data-kind") === "context");
    expect(ctx).toBeDefined();
    expect(ctx).toHaveTextContent(/launch plan/i);
  });

  it("a real approval produces an attention approval node", () => {
    usePresenceStore.getState().setSignals({ approvalsCount: 1 });
    renderSurface();
    const approval = screen
      .getAllByTestId("surface-work-node")
      .find((n) => n.getAttribute("data-kind") === "approval");
    expect(approval?.getAttribute("data-intensity")).toBe("attention");
  });

  it("never invents a node / never a hardcoded demo name", () => {
    usePresenceStore.getState().setSignals({ unreadCount: 1, actionUnreadCount: 1 });
    renderSurface();
    const strip = screen.getByTestId("surface-work-nodes");
    expect(strip.textContent ?? "").not.toMatch(/\b(David|Samiksha|Vishesh)\b/);
  });
});

// Section-25 fix — the Home headline and its items share ONE response object:
// if the headline claims attention, the counted suggestions render as deep
// links right under it; a calm headline renders no suggestion links.
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
const API_BASE = "http://localhost:3000/api/v1";

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

describe("AmbientWorkSurface — headline/items single source (Section 25)", () => {
  it("an attention headline renders the exact items it counted, deep-linked", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-day/intelligence`, () =>
        HttpResponse.json(
          intelligence([
            { rank: 1, reason: "EXPIRING_AUTHORITY", safe_title: "An access grant expires this week", confidence: "HIGH", risk: "NONE" },
          ]),
        ),
      ),
    );
    renderSurface();
    await waitFor(() =>
      expect(screen.getByTestId("changed-headline")).toHaveTextContent(/found 1 thing/i),
    );
    const links = screen.getAllByTestId("changed-suggestion");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent("An access grant expires this week");
    expect(links[0]).toHaveAttribute("href", "/app/my-day");
  });

  it("a calm headline renders NO suggestion links — no claim, no ghosts", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-day/intelligence`, () =>
        HttpResponse.json(intelligence([])),
      ),
    );
    renderSurface();
    await waitFor(() =>
      expect(screen.getByTestId("changed-headline")).toHaveTextContent(/keeping watch/i),
    );
    expect(screen.queryByTestId("changed-suggestions")).toBeNull();
  });
});

// [C.3] AI Teammate claims from my-work twin_work — "Your Twin is on this".
describe("AmbientWorkSurface — Twin working panel (C.3)", () => {
  it("surfaces active twin_work claims from my-work", async () => {
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
              next_action: "Twin executing with verification posture; human notified",
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
    const panel = await screen.findByTestId("twin-working-panel");
    expect(panel).toHaveTextContent(/Insurance prior-auth form/i);
    expect(panel).toHaveTextContent(/Insurance accuracy/i);
    expect(screen.getByTestId("twin-working-open-doc")).toHaveAttribute(
      "href",
      "https://docs.google.com/document/d/abc/edit",
    );
    // Human is free; Twin is working — not "caught up" alone.
    expect(screen.queryByTestId("ambient-caught-up")).toBeNull();
  });

  it("stays silent when my-work has no twin claims", async () => {
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
      expect(screen.queryByTestId("twin-working-panel")).toBeNull(),
    );
  });
});

// PROD-MODEL-P3 §21 — urgent blind spots surface on Today (deep link to the
// detail page); non-urgent backlog adds NOTHING to the home surface.
describe("AmbientWorkSurface — urgent blind spots surface here (§21)", () => {
  function blindItem(lane: string) {
    return {
      ledger_entry_id: `b-${lane}`, ledger_type: "TASK", source_type: "TRANSCRIPT",
      source_command: null, work_plan_id: null, requester_entity_id: null,
      owner_entity_id: null, target_entity_id: null, title: lane, status: "DETECTED",
      priority: "NORMAL", extraction_source: "LLM", next_action: null, due_at: null,
      created_at: "2026-07-01T00:00:00Z",
      routing: {
        lane, reason: "x", risk: "low", confidence: null, policy_basis: null,
        owner_entity_id: null, owner_status: "unowned", next_best_action: null,
        required_tool: null, evidence_refs: [], audit_pointer: null,
      },
    };
  }

  it("urgent lanes produce a deep-linked 'stuck and needs a decision' line", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-day/intelligence`, () =>
        HttpResponse.json(intelligence([])),
      ),
      http.get(`${API_BASE}/work-os/blind-spots`, () =>
        HttpResponse.json({
          ok: true,
          items: [blindItem("blocked"), blindItem("setup_required"), blindItem("silent_capture")],
        }),
      ),
    );
    renderSurface();
    const line = await screen.findByTestId("needs-blind-spots");
    expect(line).toHaveTextContent("2 items are stuck and need a decision");
    // WAVE-1: stuck work deep-links into Needs me (Action Center), not a
    // separate Blind Spots destination.
    expect(line).toHaveAttribute("href", "/app/action-center");
  });

  it("a backlog of NON-urgent items adds nothing to the home surface", async () => {
    server.use(
      http.get(`${API_BASE}/otzar/my-day/intelligence`, () =>
        HttpResponse.json(intelligence([])),
      ),
      http.get(`${API_BASE}/work-os/blind-spots`, () =>
        HttpResponse.json({
          ok: true,
          items: [blindItem("silent_capture"), blindItem("silent_routing"), blindItem("draft_ready")],
        }),
      ),
    );
    renderSurface();
    await screen.findByTestId("changed-headline");
    expect(screen.queryByTestId("needs-blind-spots")).toBeNull();
  });
});
