// FILE: tests/unit/work-os-cockpits.test.tsx
// PURPOSE: Phase 1279 — lock the Work OS cockpits (My Work / Team Work /
//          Blind Spots) + voice routing. Proves: real ledger entries
//          render; honest empty + error states; Team Work honest blocker;
//          voice phrases route to the cockpits (not chat). No fake data.

import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MyWork } from "@/pages/app/MyWork";
import { TeamWork } from "@/pages/app/TeamWork";
import { BlindSpots } from "@/pages/app/BlindSpots";
import { classifyVoiceAction } from "@/lib/voice/voice-action-runtime";
import { useAuthStore } from "@/lib/stores/auth";
import { emitWorkStateChanged } from "@/lib/events/work-state";

const API_BASE = "http://localhost:3000/api/v1";

const ADMIN = {
  can_read_capsules: true, can_write_capsules: true, can_share_capsules: true,
  can_admin_org: true, can_admin_niov: false,
};

beforeEach(() => {
  useAuthStore.setState({
    token: "tok", entity: { email: "x@niovlabs.com" }, isAuthenticated: true,
    capabilities: ADMIN,
  });
});

function entry(over: Record<string, unknown> = {}) {
  return {
    ledger_entry_id: "led-1", ledger_type: "FOLLOW_UP", source_type: "VOICE_COMMAND",
    source_command: "I told Vishesh I would follow up", work_plan_id: null,
    requester_entity_id: "me", owner_entity_id: "me", target_entity_id: "ent-vishesh",
    title: "Follow up with Vishesh", status: "DRAFT", priority: "ROUTINE",
    extraction_source: "TYPESCRIPT_DETERMINISTIC", next_action: "Send the note",
    due_at: null, created_at: "2026-06-13T18:00:00.000Z", ...over,
  };
}

function renderPage(el: JSX.Element): void {
  render(<MemoryRouter>{el}</MemoryRouter>);
}

describe("My Work cockpit", () => {
  it("renders real ledger entries grouped", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () =>
        HttpResponse.json({ ok: true, items: [entry(), entry({ ledger_entry_id: "led-2", ledger_type: "TASK", status: "PROPOSED", title: "Review AI UI" })] }),
      ),
    );
    renderPage(<MyWork />);
    await waitFor(() =>
      expect(screen.getAllByTestId("work-ledger-item").length).toBe(2),
    );
    expect(screen.getByTestId("my-work-page").textContent).toMatch(/Follow up with Vishesh/i);
    expect(screen.getByTestId("my-work-page").textContent).toMatch(/Review AI UI/i);
  });

  it("shows an honest empty state (no fake work)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    renderPage(<MyWork />);
    await waitFor(() => expect(screen.getByTestId("my-work-empty")).toBeInTheDocument());
  });

  it("shows a safe error on API failure (no silent fake data)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () => HttpResponse.json({ ok: false, code: "X" }, { status: 500 })),
    );
    renderPage(<MyWork />);
    await waitFor(() => expect(screen.getByTestId("my-work-error")).toBeInTheDocument());
    expect(screen.queryByTestId("work-ledger-item")).toBeNull();
  });

  it("View/Why reveals the ledger id + source (inspect only)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/my-work`, () => HttpResponse.json({ ok: true, items: [entry()] })),
    );
    renderPage(<MyWork />);
    const btn = await screen.findByTestId("work-ledger-item-view");
    btn.click();
    await waitFor(() => expect(screen.getByTestId("work-ledger-item-detail")).toBeInTheDocument());
    expect(screen.getByTestId("work-ledger-item-detail").textContent).toMatch(/led-1/);
    expect(screen.getByTestId("work-ledger-item-detail").textContent).toMatch(/TYPESCRIPT_DETERMINISTIC/);
  });
});

describe("Team Work cockpit", () => {
  it("renders allowed team entries", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/team-work`, () => HttpResponse.json({ ok: true, entries: [entry({ status: "BLOCKED" })] })),
    );
    renderPage(<TeamWork />);
    await waitFor(() => expect(screen.getByTestId("work-ledger-item")).toBeInTheDocument());
  });

  it("shows the honest TEAM_SCOPE_NOT_CONFIGURED blocker (no fake org view)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/team-work`, () =>
        HttpResponse.json({ ok: false, code: "TEAM_SCOPE_NOT_CONFIGURED", message: "x" }, { status: 403 }),
      ),
    );
    renderPage(<TeamWork />);
    await waitFor(() => expect(screen.getByTestId("team-work-blocked")).toBeInTheDocument());
    expect(screen.queryByTestId("work-ledger-item")).toBeNull();
  });
});

function watcherFinding(over: Record<string, unknown> = {}) {
  return {
    finding_id: "OVERDUE_WORK:led-9",
    watcher_type: "OVERDUE_WORK",
    severity: "HIGH",
    title: "Overdue: Send proof notes",
    summary: "Due 9d ago and still open.",
    org_id: "org-1",
    owner: { entity_id: "me", display_name: "You", unresolved: false },
    requester: { entity_id: "ent-david", display_name: "David Odie", unresolved: false },
    target: null,
    related_person: { entity_id: "ent-david", display_name: "David Odie", unresolved: false },
    source: {
      source_system: "work_ledger",
      ledger_entry_id: "led-9",
      source_message_id: "msg-3",
      source_thread_key: null,
      relationship_key: null,
    },
    detection: {
      rule_id: "OVERDUE_WORK_V1",
      detected_at: "2026-06-16T12:00:00.000Z",
      age_hours: 216,
      due_at: "2026-06-01T00:00:00.000Z",
      threshold_hours: 0,
      reason: "active item with due_at in the past",
    },
    recommendation: {
      next_action: "Nudge David Odie or reset the due date.",
      action_kind: "nudge_owner",
    },
    ...over,
  };
}

describe("Blind Spots cockpit", () => {
  it("renders ledger-derived blocked/unresolved items (legacy section)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/watchers/feed`, () => HttpResponse.json({ ok: true, findings: [] })),
      http.get(`${API_BASE}/work-os/blind-spots`, () =>
        HttpResponse.json({ ok: true, items: [entry({ status: "NEEDS_TARGET_RESOLUTION", title: "Unknown Alex" })] }),
      ),
    );
    renderPage(<BlindSpots />);
    await waitFor(() => expect(screen.getByTestId("work-ledger-item")).toBeInTheDocument());
    expect(screen.getByTestId("blind-spots-page").textContent).toMatch(/Unknown Alex/i);
  });
});

describe("Blind Spots watcher feed (Phase 1285-P)", () => {
  it("renders the real watcher feed grouped by type with severity + owner + recommended action", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/watchers/feed`, () =>
        HttpResponse.json({
          ok: true,
          findings: [
            watcherFinding(),
            watcherFinding({
              finding_id: "UNRESOLVED_BLOCKER:led-10",
              watcher_type: "UNRESOLVED_BLOCKER",
              title: "Blocker: API key",
              severity: "HIGH",
              source: { source_system: "work_ledger", ledger_entry_id: "led-10", source_message_id: null, source_thread_key: null, relationship_key: null },
              detection: { rule_id: "UNRESOLVED_BLOCKER_V1", detected_at: "x", age_hours: 48, due_at: null, threshold_hours: null, reason: "active BLOCKER ledger entry" },
              recommendation: { next_action: "Resolve the blocker or escalate it.", action_kind: "review_blocker" },
            }),
          ],
        }),
      ),
      http.get(`${API_BASE}/work-os/blind-spots`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    renderPage(<BlindSpots />);
    await waitFor(() => expect(screen.getByTestId("blind-spots-feed")).toBeInTheDocument());
    const cards = screen.getAllByTestId("blind-spot-card");
    expect(cards.length).toBe(2);
    // grouped under canonical labels
    const page = screen.getByTestId("blind-spots-page").textContent ?? "";
    expect(page).toMatch(/Overdue/);
    expect(page).toMatch(/Blockers/);
    // severity badge + recommended action + canonical owner (never raw UUID)
    expect(screen.getAllByTestId("blind-spot-severity")[0]!.textContent).toMatch(/high/i);
    expect(screen.getAllByTestId("blind-spot-recommended")[0]!.textContent).toMatch(/Nudge David Odie/);
    expect(page).toMatch(/David Odie/);
    expect(page).not.toMatch(/ent-david/);
  });

  it("renders a STALE_WAITING_ON card with owner/requester/age/recommendation", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/watchers/feed`, () =>
        HttpResponse.json({
          ok: true,
          findings: [
            watcherFinding({
              finding_id: "STALE_WAITING_ON:led-22",
              watcher_type: "STALE_WAITING_ON",
              title: "Proof-layer notes",
              summary: "Sadeil is waiting on David Odie — no movement in 3d.",
              severity: "MEDIUM",
              owner: { entity_id: "ent-david", display_name: "David Odie", unresolved: false },
              requester: { entity_id: "me", display_name: "Sadeil", unresolved: false },
              source: { source_system: "waiting_on", ledger_entry_id: "led-22", source_message_id: "msg-9", source_thread_key: null, relationship_key: null },
              detection: { rule_id: "STALE_WAITING_ON_48H_V1", detected_at: "x", age_hours: 72, due_at: null, threshold_hours: 48, reason: "directional waiting-on with no update in 48h" },
              recommendation: { next_action: "Nudge David Odie or re-scope the ask.", action_kind: "nudge_owner" },
            }),
          ],
        }),
      ),
      http.get(`${API_BASE}/work-os/blind-spots`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    renderPage(<BlindSpots />);
    await waitFor(() => expect(screen.getByTestId("blind-spot-card")).toBeInTheDocument());
    const card = screen.getByTestId("blind-spot-card");
    expect(card.getAttribute("data-watcher-type")).toBe("STALE_WAITING_ON");
    expect(card.textContent).toMatch(/Owner: David Odie/);
    expect(card.textContent).toMatch(/Requester: Sadeil/);
    expect(card.textContent).toMatch(/3d old/);
    expect(screen.getByTestId("blind-spot-recommended").textContent).toMatch(/Nudge David Odie or re-scope/);
  });

  it("renders a NO_NEXT_ACTION card with its recommendation", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/watchers/feed`, () =>
        HttpResponse.json({
          ok: true,
          findings: [
            watcherFinding({
              finding_id: "NO_NEXT_ACTION:led-30",
              watcher_type: "NO_NEXT_ACTION",
              title: "Follow up with Vishesh",
              summary: "No next action set.",
              severity: "LOW",
              source: { source_system: "work_ledger", ledger_entry_id: "led-30", source_message_id: null, source_thread_key: null, relationship_key: null },
              detection: { rule_id: "NO_NEXT_ACTION_V1", detected_at: "x", age_hours: 24, due_at: null, threshold_hours: null, reason: "active item with no owner or no next_action" },
              recommendation: { next_action: "Set a clear next action.", action_kind: "view_work" },
            }),
          ],
        }),
      ),
      http.get(`${API_BASE}/work-os/blind-spots`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    renderPage(<BlindSpots />);
    await waitFor(() => expect(screen.getByTestId("blind-spot-card")).toBeInTheDocument());
    expect(screen.getByTestId("blind-spot-card").getAttribute("data-watcher-type")).toBe("NO_NEXT_ACTION");
    expect(screen.getByTestId("blind-spot-recommended").textContent).toMatch(/Set a clear next action/);
  });

  it("opens View/Why showing watcher type, detection rule, source, and recommended action (no fake)", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/watchers/feed`, () => HttpResponse.json({ ok: true, findings: [watcherFinding()] })),
      http.get(`${API_BASE}/work-os/blind-spots`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    renderPage(<BlindSpots />);
    const why = await screen.findByTestId("blind-spot-why");
    why.click();
    await waitFor(() => expect(screen.getByTestId("blind-spot-view-why")).toBeInTheDocument());
    const detail = screen.getByTestId("blind-spot-view-why").textContent ?? "";
    expect(detail).toMatch(/Overdue work/); // watcher type label
    expect(detail).toMatch(/OVERDUE_WORK_V1/); // deterministic detection rule id
    expect(detail).toMatch(/msg-3/); // source proof
    expect(detail).toMatch(/Nudge David Odie or reset the due date/); // recommended action
  });

  it("shows the honest empty state when there are no watcher findings", async () => {
    server.use(
      http.get(`${API_BASE}/work-os/watchers/feed`, () => HttpResponse.json({ ok: true, findings: [] })),
      http.get(`${API_BASE}/work-os/blind-spots`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    renderPage(<BlindSpots />);
    await waitFor(() => expect(screen.getByTestId("blind-spots-empty")).toBeInTheDocument());
    expect(screen.getByTestId("blind-spots-empty").textContent).toMatch(/No blind spots detected right now/i);
  });

  it("refreshes the watcher feed on a WorkStateChanged event", async () => {
    let feedCalls = 0;
    server.use(
      http.get(`${API_BASE}/work-os/watchers/feed`, () => {
        feedCalls += 1;
        return HttpResponse.json({ ok: true, findings: [] });
      }),
      http.get(`${API_BASE}/work-os/blind-spots`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    renderPage(<BlindSpots />);
    await waitFor(() => expect(feedCalls).toBe(1));
    emitWorkStateChanged({ type: "TASK_COMPLETED" });
    await waitFor(() => expect(feedCalls).toBe(2));
  });
});

describe("Voice routing to cockpits (not chat)", () => {
  it("routes 'show my work' / 'what is waiting on me' to /app/my-work", () => {
    for (const cmd of ["Show my work.", "What is waiting on me?"]) {
      const a = classifyVoiceAction(cmd, ADMIN);
      expect(a.route).toBe("/app/my-work");
    }
  });
  it("routes 'what am I missing' / 'what is blocked' to /app/blind-spots", () => {
    for (const cmd of ["What am I missing?", "What is blocked?"]) {
      const a = classifyVoiceAction(cmd, ADMIN);
      expect(a.route).toBe("/app/blind-spots");
    }
  });
  it("routes blind-spot / risk / overdue / stale / follow-up questions to /app/blind-spots (Phase 1285-P, deterministic — never the LLM)", () => {
    const cmds = [
      "What are my blind spots?",
      "What is overdue?",
      "What is at risk?",
      "What is stale?",
      "What should I follow up on?",
      "What is quietly slipping?",
      "Unresolved blockers",
    ];
    for (const cmd of cmds) {
      const a = classifyVoiceAction(cmd, ADMIN);
      expect(a.route).toBe("/app/blind-spots");
      // Deterministic Work-OS classification — NOT a fall-through chat/LLM action.
      expect(a.kind).not.toBe("GOVERNED_CHAT");
    }
  });
  it("routes 'show team work' to /app/team-work", () => {
    expect(classifyVoiceAction("Show team work.", ADMIN).route).toBe("/app/team-work");
  });
});
