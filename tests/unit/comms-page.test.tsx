// FILE: tests/unit/comms-page.test.tsx
// PURPOSE: Phase 1213 -- locks the Comms page lifecycle and the
//          hero flow (Start capture -> Otzar listens -> Otzar
//          organizes -> follow-ups ready). Covers: hero render,
//          end-capture POSTs the canonical text, extraction view
//          renders summary + decisions + commitments + follow-up
//          cards, manual import fallback, error state, privacy
//          invariant, and the consumer Send hits POST /actions
//          with the resolved entity_id (NOT David-only).
// CONNECTS TO: src/pages/app/Comms.tsx.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { mkRecipientGovernance, mkAutonomy, emptyResponsibilityGraph } from "../fixtures/comms-governance";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Comms } from "@/pages/app/Comms";
import { useAuthStore } from "@/lib/stores/auth";
import type { CommsExtractionResult } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

function setAuth(email = "sadeil@niovlabs.com"): void {
  useAuthStore.setState({
    token: "tok",
    entity: { email },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: true,
      can_admin_org: true,
      can_admin_niov: false,
    },
  });
}

function canonicalExtraction(): CommsExtractionResult {
  return {
    summary:
      "Sadeil, David, Samiksha, and Annie aligned on the Otzar launch follow-up.",
    decisions: [
      "Keep internal note workflows inside Otzar notifications only for now.",
      "Do not enable Slack or email sending until explicit connector approval is finished.",
    ],
    commitments: [
      "David reviews the UI flow by Friday.",
      "Samiksha reviews the AI/NLP trial notes and summarizes any concerns.",
      "Annie completes the compliance review this week once the summary is ready.",
    ],
    risks_or_blockers: [],
    suggested_actions: [
      {
        local_id: "demo-david",
        action_type: "SEND_INTERNAL_NOTIFICATION",
        target: {
          display_name: "David Odie",
          email: "david@niovlabs.com",
          entity_id: "id-david",
        },
        draft_text:
          "Hey David — please review the UI flow by Friday.",
        reason: "Otzar drafted this from the captured conversation.",
        source_excerpt:
          "Sadeil asked David to review the UI flow by Friday.",
        confidence: "HIGH",
        resolution_status: "RESOLVED",
        recipient_governance: mkRecipientGovernance({ entity_id: "id-david", display_name: "David Odie" }),
          autonomy: mkAutonomy(),
      },
      {
        local_id: "demo-samiksha",
        action_type: "SEND_INTERNAL_NOTIFICATION",
        target: {
          display_name: "Samiksha Sharma",
          email: "samiksha@niovlabs.com",
          entity_id: "id-samiksha",
        },
        draft_text: "Hi Samiksha — please review the AI/NLP trial notes.",
        reason: "Otzar drafted this from the captured conversation.",
        source_excerpt: null,
        confidence: "HIGH",
        resolution_status: "RESOLVED",
        recipient_governance: mkRecipientGovernance({ entity_id: "id-samiksha", display_name: "Samiksha Sharma" }),
          autonomy: mkAutonomy(),
      },
      {
        local_id: "demo-annie",
        action_type: "SEND_INTERNAL_NOTIFICATION",
        target: {
          display_name: "Annie",
          email: "annie@niovlabs.com",
          entity_id: "id-annie",
        },
        draft_text: "Hey Annie — compliance review this week if possible.",
        reason: "Otzar drafted this from the captured conversation.",
        source_excerpt: null,
        confidence: "HIGH",
        resolution_status: "RESOLVED",
        recipient_governance: mkRecipientGovernance({ entity_id: "id-annie", display_name: "Annie" }),
          autonomy: mkAutonomy(),
      },
    ],
    extraction_mode: "DEMO_SCRIPTED",
    responsibility_graph: emptyResponsibilityGraph,
    lead_card: null,
  };
}

function mockExtract(
  responder?: (capturedText: string) => CommsExtractionResult,
  workItems: ReadonlyArray<Record<string, unknown>> = [],
): void {
  // The Comms page now calls the governed INGEST endpoint (persist + create
  // per-owner work); it returns the same extraction plus the persisted
  // conversation + work items, so the existing extraction-view assertions hold.
  server.use(
    http.post(`${API_BASE}/otzar/comms/ingest`, async ({ request }) => {
      const body = (await request.json()) as { captured_text?: string };
      const ex = responder?.(body.captured_text ?? "") ?? canonicalExtraction();
      const owned = workItems.filter((w) => (w as { needs_review?: boolean }).needs_review !== true).length;
      const needsReview = workItems.length - owned;
      // Default a Phase-4/5 execution plan on each item (the page reads w.execution).
      const items = workItems.map((w) => ({
        execution: {
          execution_type: "human_task",
          execution_mode: "human_must_do",
          required_connector: "NONE",
          capability_state: null,
          approval_required: false,
          blocker_reason: null,
          next_best_action: "route",
        },
        ...w,
      }));
      return HttpResponse.json({
        ok: true,
        result: {
          conversation: {
            meeting_capture_id: "mc-1",
            title: "Launch Follow-Up Meeting",
            participant_count: 3,
            summary: ex.summary,
            status: "PROCESSED",
          },
          quality: { total: 8, trusted: 8, quarantined: 0, noisy_tail_start_index: null },
          decisions: ex.decisions,
          work_items: items,
          support_edges: [],
          counts: { owned, needs_review: needsReview, support_edges: 0 },
          dandelion_seeds: [],
          work_graph_event_count: 0,
          extraction: ex,
        },
      });
    }),
  );
}

function renderPage(): void {
  render(
    <MemoryRouter>
      <Comms />
    </MemoryRouter>,
  );
}

function recentArtifact(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    artifact_id: "led-1",
    artifact_type: "FOLLOW_UP",
    title: "Follow up with David",
    summary: "Send the proof notes",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "PROPOSED",
    scope: "personal",
    related_person: { entity_id: "ent-david", display_name: "David Odie", unresolved: false },
    source: { source_system: "work_ledger", source_message_id: "msg-7", ledger_entry_id: "led-1" },
    destination: { kind: "work", route: "/app/my-work" },
    ...over,
  };
}

function mockRecentArtifacts(
  artifacts: ReadonlyArray<Record<string, unknown>> = [],
): void {
  server.use(
    http.get(`${API_BASE}/work-os/comms/recent-artifacts`, () =>
      HttpResponse.json({ ok: true, artifacts, next_cursor: null }),
    ),
  );
}

// [PROD-UX-BUGB] A durable pending follow-up, as GET /work-os/comms/follow-ups
// returns it — the send-card payload plus its backing ledger id. Derives from
// the same canonical suggested_actions so the cards read identically.
function pendingFollowUpFrom(
  action: CommsExtractionResult["suggested_actions"][number],
  ledgerEntryId: string,
): Record<string, unknown> {
  return {
    ledger_entry_id: ledgerEntryId,
    meeting_capture_id: "mc-1",
    title: `Follow-up to ${action.target.display_name}`,
    status: "DRAFT",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    action,
  };
}

// The 3 canonical follow-ups as durable rows (what the post-ingest reload and a
// returning-navigation load both return).
function canonicalPendingFollowUps(): Record<string, unknown>[] {
  return canonicalExtraction().suggested_actions.map((a) =>
    pendingFollowUpFrom(a, `led-${a.local_id}`),
  );
}

function mockPendingFollowUps(
  followUps: ReadonlyArray<Record<string, unknown>> = [],
): void {
  server.use(
    http.get(`${API_BASE}/work-os/comms/follow-ups`, () =>
      HttpResponse.json({ ok: true, follow_ups: followUps }),
    ),
  );
}

// Capture PATCH /work-os/ledger/:id transitions (send -> EXECUTED, dismiss ->
// CANCELLED). `fail` simulates a transition the server rejects.
function mockPatchLedger(
  onPatch?: (id: string, body: { status?: string }) => void,
  opts: { fail?: boolean } = {},
): void {
  server.use(
    http.patch(`${API_BASE}/work-os/ledger/:id`, async ({ request, params }) => {
      const body = (await request.json().catch(() => ({}))) as { status?: string };
      onPatch?.(String(params.id), body);
      if (opts.fail === true) {
        return HttpResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
      }
      return HttpResponse.json({
        ok: true,
        entry: { ledger_entry_id: String(params.id), status: body.status ?? "DRAFT" },
      });
    }),
  );
}

beforeEach(() => {
  vi.useRealTimers();
  setAuth();
  // Default: the recent-artifacts feed AND the pending-follow-ups feed are mocked
  // empty so the cockpit renders its honest-empty state unless a test overrides.
  mockRecentArtifacts([]);
  mockPendingFollowUps([]);
});

describe("Comms — HERO flow", () => {
  it("renders the 'Otzar is ready to capture' hero on first visit", () => {
    mockExtract();
    renderPage();
    expect(screen.getByTestId("comms-hero")).toHaveTextContent(
      "Otzar is ready to capture",
    );
    expect(screen.getByTestId("comms-start")).toBeInTheDocument();
    // Manual import is NOT the hero; it's a secondary button.
    expect(screen.getByTestId("comms-import-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("comms-import-toggle")).toHaveTextContent(
      "fallback",
    );
  });

  it("Start capture flips the page into the 'Otzar is listening' state", async () => {
    mockExtract();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    expect(screen.getByTestId("comms-capturing")).toHaveTextContent(
      "Otzar is listening",
    );
    expect(screen.queryByTestId("comms-hero")).toBeNull();
  });
});

describe("Comms — default cockpit (Phase 1285-L2)", () => {
  it("shows the conversation-intelligence cockpit, not just two buttons", () => {
    mockExtract();
    renderPage();
    // Capture controls present...
    expect(screen.getByTestId("comms-start")).toBeInTheDocument();
    expect(screen.getByTestId("comms-import-toggle")).toBeInTheDocument();
    // ...PLUS the cockpit: what Otzar turns conversations into + the flow.
    expect(screen.getByTestId("comms-cockpit")).toBeInTheDocument();
    expect(screen.getByTestId("comms-listens-for")).toBeInTheDocument();
    expect(screen.getAllByTestId("comms-listens-item").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByTestId("comms-flow")).toBeInTheDocument();
  });

  it("names the four conversation-intelligence categories", () => {
    mockExtract();
    renderPage();
    const html = screen.getByTestId("comms-listens-for").outerHTML;
    expect(html).toContain("Follow-ups");
    expect(html).toContain("Decisions");
    expect(html).toContain("Blockers");
    expect(html).toContain("Commitments");
  });

  it("shows an honest 'recent conversation intelligence' empty state when the feed is empty (no fake artifacts)", async () => {
    mockExtract();
    mockRecentArtifacts([]);
    renderPage();
    expect(
      await screen.findByTestId("comms-recent-empty"),
    ).toHaveTextContent("No captured conversation artifacts yet");
  });

  it("renders REAL recent artifacts from the feed with canonical labels (Phase 1285-T)", async () => {
    mockExtract();
    mockRecentArtifacts([
      recentArtifact({ artifact_id: "a-1", artifact_type: "FOLLOW_UP", title: "Follow up with David" }),
      recentArtifact({
        artifact_id: "a-2",
        artifact_type: "DECISION",
        title: "Decided on the launch date",
        related_person: { entity_id: "ent-sam", display_name: "Samiksha Sharma", unresolved: false },
      }),
    ]);
    renderPage();
    const list = await screen.findByTestId("comms-recent-list");
    expect(screen.getAllByTestId("comms-recent-item").length).toBe(2);
    expect(list.textContent ?? "").toMatch(/Follow up with David/);
    expect(list.textContent ?? "").toMatch(/Decided on the launch date/);
    // canonical label, never a raw UUID
    expect(list.textContent ?? "").toMatch(/David Odie/);
    expect(list.textContent ?? "").not.toContain("ent-david");
    expect(screen.queryByTestId("comms-recent-empty")).toBeNull();
  });

  it("shows an honest error state when the feed fails (no fake artifacts)", async () => {
    mockExtract();
    server.use(
      http.get(`${API_BASE}/work-os/comms/recent-artifacts`, () =>
        HttpResponse.json({ ok: false, code: "INTERNAL_ERROR" }, { status: 500 }),
      ),
    );
    renderPage();
    expect(await screen.findByTestId("comms-recent-error")).toBeInTheDocument();
    expect(screen.queryByTestId("comms-recent-item")).toBeNull();
  });

  it("opens an artifact's destination on click", async () => {
    mockExtract();
    mockRecentArtifacts([recentArtifact({ artifact_id: "a-1" })]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("comms-recent-item");
    // Real navigable destination control is present.
    expect(screen.getByTestId("comms-recent-open")).toBeInTheDocument();
    await user.click(screen.getByTestId("comms-recent-open"));
    // No crash; the card routed (MemoryRouter swallows navigation in test).
    expect(screen.getByTestId("comms-recent-item")).toBeInTheDocument();
  });

  it("the cockpit is gone once a capture review is showing", async () => {
    mockExtract();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() => expect(screen.getByTestId("comms-review")).toBeInTheDocument());
    expect(screen.queryByTestId("comms-cockpit")).toBeNull();
  });
});

describe("Comms — follow-up View/Why (Phase 1285-L)", () => {
  it("a durable follow-up exposes a Why disclosure with source + confidence", async () => {
    mockExtract();
    // The cards now render from durable FOLLOW_UP rows (survive navigation).
    mockPendingFollowUps(canonicalPendingFollowUps());
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getAllByTestId("comms-follow-up-row").length).toBeGreaterThan(0),
    );
    // Open the first follow-up's Why.
    const whyButtons = screen.getAllByTestId("comms-follow-up-why");
    await user.click(whyButtons[0]!);
    const panels = screen.getAllByTestId("comms-follow-up-view-why");
    const html = panels[0]!.outerHTML;
    // Source excerpt and confidence are surfaced. A resumed durable card does
    // not claim an extraction mode it no longer carries (row omitted).
    expect(html).toContain("Source");
    expect(html.toLowerCase()).toContain("confidence");
    expect(html).not.toContain("Extraction");
    // No raw UUID leaked as a label.
    expect(html).not.toContain("id-david");
  });
});

describe("Comms — end capture posts canonical text + renders extraction", () => {
  it("end-capture posts assembled captured_text and renders summary/decisions/commitments/follow-ups", async () => {
    let capturedBody: { captured_text?: string } | null = null;
    server.use(
      http.post(`${API_BASE}/otzar/comms/ingest`, async ({ request }) => {
        capturedBody = (await request.json()) as { captured_text?: string };
        const ex = canonicalExtraction();
        return HttpResponse.json({
          ok: true,
          result: {
            conversation: { meeting_capture_id: "mc-1", title: "Launch Follow-Up Meeting", participant_count: 3, summary: ex.summary, status: "PROCESSED" },
            quality: { total: 8, trusted: 8, quarantined: 0, noisy_tail_start_index: null },
            decisions: ex.decisions,
            work_items: [],
            support_edges: [],
            counts: { owned: 0, needs_review: 0, support_edges: 0 },
            extraction: ex,
          },
        });
      }),
    );
    // Ingest persisted the follow-ups as durable rows; the post-ingest reload
    // fetches them from the durable feed (with ledger ids).
    mockPendingFollowUps(canonicalPendingFollowUps());

    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));

    await waitFor(() =>
      expect(screen.getByTestId("comms-review")).toBeInTheDocument(),
    );

    // POST body carries the Foundation auto-detection signal:
    // the "Launch Follow-Up Meeting" title + the three demo names.
    expect(capturedBody).not.toBeNull();
    const text = (capturedBody as unknown as { captured_text: string }).captured_text;
    expect(text).toMatch(/Launch Follow-Up Meeting/i);
    expect(text).toMatch(/David/);
    expect(text).toMatch(/Samiksha/);
    expect(text).toMatch(/Annie/);

    // Header surfaces the count (3 RESOLVED follow-ups).
    expect(screen.getByTestId("comms-review-header")).toHaveTextContent(
      "Otzar found 3 follow-ups",
    );
    // Decisions list (2 rows).
    expect(screen.getAllByTestId("comms-decision")).toHaveLength(2);
    // Commitments list (3 rows).
    expect(screen.getAllByTestId("comms-commitment")).toHaveLength(3);
    // The actionable cards render from the durable section (survive navigation),
    // NOT David-only. Each row's inner card surfaces the recipient.
    await waitFor(() =>
      expect(screen.getAllByTestId("comms-follow-up-row")).toHaveLength(3),
    );
    const html = screen.getByTestId("comms-pending-follow-ups").outerHTML;
    expect(html).toContain("David Odie");
    expect(html).toContain("Samiksha Sharma");
    expect(html).toContain("Annie");
    // Extraction mode badge shows the friendly label.
    expect(screen.getByTestId("comms-extraction-mode")).toHaveTextContent(
      "Demo capture mode",
    );
  });

  it("renders 'Live AI capture' badge when extraction_mode is LLM", async () => {
    mockExtract(() => ({ ...canonicalExtraction(), extraction_mode: "LLM" }));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-extraction-mode")).toHaveTextContent(
        "Live AI capture",
      ),
    );
  });

  it("renders 'Local fallback' when extraction_mode is LOCAL_FALLBACK", async () => {
    mockExtract(() => ({
      summary: "Otzar captured this conversation but live extraction isn't configured.",
      decisions: [],
      commitments: [],
      risks_or_blockers: [],
      suggested_actions: [],
      extraction_mode: "LOCAL_FALLBACK",
      responsibility_graph: emptyResponsibilityGraph,
      lead_card: null,
    }));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-extraction-mode")).toHaveTextContent(
        "Local fallback",
      ),
    );
    expect(screen.getByTestId("comms-no-follow-ups")).toBeInTheDocument();
  });
});

describe("Comms — Send goes through the existing governed Action pipeline", () => {
  it("each follow-up's Send hits POST /api/v1/actions with the resolved entity_id (NOT hardcoded David)", async () => {
    mockExtract();
    mockPendingFollowUps(canonicalPendingFollowUps());
    mockPatchLedger();
    let lastActionBody: Record<string, unknown> | null = null;
    server.use(
      http.post(`${API_BASE}/actions`, async ({ request }) => {
        lastActionBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-comms-1",
              source_entity_id: "u",
              org_entity_id: "o",
              target_entity_id:
                (lastActionBody?.payload_redacted as { recipient_entity_id: string })
                  ?.recipient_entity_id ?? null,
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              status: "APPROVED",
              payload_summary: "x",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          { status: 201 },
        );
      }),
    );

    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getAllByTestId("comms-follow-up-row")).toHaveLength(3),
    );

    // Click Send on the 2nd row (Samiksha) -- proves the page is NOT
    // hardcoded to row index 0 / David.
    const sendButtons = screen.getAllByTestId("ctx-send-button");
    expect(sendButtons).toHaveLength(3);
    await user.click(sendButtons[1]!);

    await waitFor(() => expect(lastActionBody).not.toBeNull());
    const body = lastActionBody as unknown as {
      action_type: string;
      payload_redacted: {
        recipient_entity_id: string;
        notification_class: string;
        body_summary: string;
      };
    };
    expect(body.action_type).toBe("SEND_INTERNAL_NOTIFICATION");
    expect(body.payload_redacted.recipient_entity_id).toBe("id-samiksha");
    expect(body.payload_redacted.notification_class).toBe("OTZAR_INTERNAL_NOTE");
    expect(body.payload_redacted.body_summary).toContain("Samiksha");
  });
});

// [PROD-UX-BUGB] The durable follow-up recovery: the drafted send-cards are
// backed by FOLLOW_UP ledger rows, so they survive navigation/refresh; send and
// dismiss transition the backing row; a failed send stays recoverable.
describe("Comms — durable follow-up recovery (BUG B)", () => {
  // A single durable follow-up (David) with an overridable action + ledger id.
  function onePending(
    actionOver: Record<string, unknown> = {},
    ledgerId = "led-solo",
  ): Record<string, unknown>[] {
    const base = canonicalExtraction().suggested_actions[0]!;
    return [pendingFollowUpFrom({ ...base, ...actionOver } as typeof base, ledgerId)];
  }

  function mockSendOk(): void {
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json(
          {
            ok: true,
            action: {
              action_id: "act-1",
              source_entity_id: "u",
              org_entity_id: "o",
              target_entity_id: "id-david",
              action_type: "SEND_INTERNAL_NOTIFICATION",
              risk_tier: "LOW",
              status: "APPROVED",
              payload_summary: "x",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
          { status: 201 },
        ),
      ),
    );
  }

  function renderComms(): { unmount: () => void } {
    return render(
      <MemoryRouter>
        <Comms />
      </MemoryRouter>,
    );
  }

  it("loads durable pending follow-ups on mount — no re-capture needed", async () => {
    mockExtract();
    mockPendingFollowUps(canonicalPendingFollowUps());
    renderComms();
    await waitFor(() =>
      expect(screen.getByTestId("comms-pending-follow-ups")).toBeInTheDocument(),
    );
    // Cards appear in the default cockpit view, without any ingest this session.
    expect(screen.getAllByTestId("comms-follow-up-row")).toHaveLength(3);
    expect(screen.getByTestId("comms-cockpit")).toBeInTheDocument();
  });

  it("pending follow-ups survive navigation/refresh (a remount re-loads them)", async () => {
    mockExtract();
    mockPendingFollowUps(canonicalPendingFollowUps());
    const { unmount } = renderComms();
    await waitFor(() =>
      expect(screen.getAllByTestId("comms-follow-up-row")).toHaveLength(3),
    );
    unmount(); // leave Comms
    renderComms(); // come back
    await waitFor(() =>
      expect(screen.getAllByTestId("comms-follow-up-row")).toHaveLength(3),
    );
  });

  it("Send transitions the backing row to EXECUTED (so it drops from pending on the next load)", async () => {
    mockExtract();
    mockPendingFollowUps(onePending({}, "led-solo"));
    mockSendOk();
    let patched: { id: string; status: string | undefined } | null = null;
    mockPatchLedger((id, body) => {
      patched = { id, status: body.status };
    });
    const user = userEvent.setup();
    renderComms();
    await waitFor(() =>
      expect(screen.getByTestId("ctx-send-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("ctx-send-button"));
    await waitFor(() => expect(patched).not.toBeNull());
    expect(patched!.id).toBe("led-solo");
    expect(patched!.status).toBe("EXECUTED");
  });

  it("Dismiss ('Don't send') transitions the row to CANCELLED and removes the card", async () => {
    mockExtract();
    mockPendingFollowUps(onePending({}, "led-solo"));
    let patched: { id: string; status: string | undefined } | null = null;
    mockPatchLedger((id, body) => {
      patched = { id, status: body.status };
    });
    const user = userEvent.setup();
    renderComms();
    await waitFor(() =>
      expect(screen.getByTestId("comms-pending-follow-ups")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("ctx-cancel-button"));
    await waitFor(() => expect(patched).not.toBeNull());
    expect(patched!.status).toBe("CANCELLED");
    // The card is removed from the pending set (section hides when empty).
    await waitFor(() =>
      expect(screen.queryByTestId("comms-pending-follow-ups")).toBeNull(),
    );
  });

  it("a failed send leaves the card visible and recoverable (no EXECUTED transition)", async () => {
    mockExtract();
    mockPendingFollowUps(onePending({}, "led-solo"));
    server.use(
      http.post(`${API_BASE}/actions`, () =>
        HttpResponse.json({ ok: false, code: "INTERNAL_ERROR" }, { status: 500 }),
      ),
    );
    let patchCalled = false;
    mockPatchLedger(() => {
      patchCalled = true;
    });
    const user = userEvent.setup();
    renderComms();
    await waitFor(() =>
      expect(screen.getByTestId("ctx-send-button")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("ctx-send-button"));
    // The card stays; a failed send never transitions the durable row.
    await waitFor(() =>
      expect(screen.getByTestId("comms-pending-follow-ups")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("comms-follow-up-row")).toBeInTheDocument();
    expect(patchCalled).toBe(false);
  });

  it("an outside-context recipient review renders from the durable payload and survives navigation", async () => {
    mockExtract();
    mockPendingFollowUps(
      onePending(
        { recipient_governance: mkRecipientGovernance({ recipientSafety: "out_of_scope" }) },
        "led-review",
      ),
    );
    const { unmount } = renderComms();
    await waitFor(() =>
      expect(screen.getByTestId("comms-pending-follow-ups")).toBeInTheDocument(),
    );
    // The Send affordance is the review gate (blocked), reconstructed from the
    // durable governance payload — not a normal Send.
    expect(screen.getByTestId("ctx-send-button")).toHaveTextContent("Review recipient");
    expect(screen.getByTestId("ctx-send-button")).toBeDisabled();
    // And it does NOT vanish on navigation.
    unmount();
    renderComms();
    await waitFor(() =>
      expect(screen.getByTestId("ctx-send-button")).toHaveTextContent("Review recipient"),
    );
  });
});

// [PROD-UX-BUGC] Outside-context recipient review completion on durable cards:
// confirm (out_of_scope / likely), choose (ambiguous, server-supplied id-based
// candidates), and honest non-overridable policy/approval boundaries.
describe("Comms — recipient review completion (BUG C)", () => {
  function reviewPending(
    safety:
      | "out_of_scope"
      | "likely"
      | "ambiguous"
      | "unauthorized"
      | "cross_team_needs_approval"
      | "confirmed",
    over: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const base = canonicalExtraction().suggested_actions[0]!;
    return {
      ...pendingFollowUpFrom(
        {
          ...base,
          recipient_governance: mkRecipientGovernance({
            entity_id: "id-david",
            display_name: "David Odie",
            recipientSafety: safety,
          }),
        } as typeof base,
        "led-review",
      ),
      ...over,
    };
  }

  // Register GET follow-ups + POST resolve-recipient over a shared mutable
  // store, so a successful resolve is visible on the reload (like the real
  // durable row).
  function mockReviewRoundtrip(initial: Record<string, unknown>[]): {
    calls: Array<{ url: string; body: Record<string, unknown> }>;
  } {
    let current = initial;
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    server.use(
      http.get(`${API_BASE}/work-os/comms/follow-ups`, () =>
        HttpResponse.json({ ok: true, follow_ups: current }),
      ),
      http.post(
        `${API_BASE}/work-os/comms/follow-ups/:id/resolve-recipient`,
        async ({ request, params }) => {
          const body = (await request.json()) as Record<string, unknown>;
          calls.push({ url: String(params.id), body });
          // Server behavior: governance -> confirmed with caller_confirmed proof;
          // select also moves the target to the chosen person.
          current = current.map((f) => {
            const action = f.action as Record<string, unknown>;
            const gov = action.recipient_governance as Record<string, unknown>;
            const selected =
              body.decision === "select"
                ? { entity_id: body.recipient_entity_id, display_name: "Shaini Verma", email: null }
                : (action.target as Record<string, unknown>);
            return {
              ...f,
              select_candidates: undefined,
              action: {
                ...action,
                target: selected,
                resolution_status: "RESOLVED",
                recipient_governance: {
                  ...gov,
                  entity_id: selected.entity_id,
                  display_name: selected.display_name,
                  recipientSafety: "confirmed",
                  evidence: { ...(gov.evidence as Record<string, unknown>), source: "caller_confirmed" },
                },
              },
            };
          });
          return HttpResponse.json({ ok: true, follow_up: current[0], audit_event_id: "audit-1" });
        },
      ),
    );
    return { calls };
  }

  it("out_of_scope shows 'Confirm recipient'; confirming calls resolve-recipient, reloads, and unlocks Send", async () => {
    mockExtract();
    const rt = mockReviewRoundtrip([reviewPending("out_of_scope")]);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("comms-review-confirm")).toBeInTheDocument(),
    );
    // Blocked before the review: guarded Send, no normal Send.
    expect(screen.getByTestId("ctx-send-button")).toBeDisabled();
    await user.click(screen.getByTestId("comms-review-confirm"));
    await waitFor(() => expect(rt.calls).toHaveLength(1));
    expect(rt.calls[0]!.url).toBe("led-review");
    expect(rt.calls[0]!.body.decision).toBe("confirm");
    // Reload rendered the confirmed card: provenance note + Send unlocked.
    await waitFor(() =>
      expect(screen.getByTestId("comms-review-you-confirmed")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("ctx-send-button")).toBeEnabled();
    expect(screen.getByTestId("ctx-send-button")).toHaveTextContent(/send/i);
  });

  it("likely also gets the Confirm affordance", async () => {
    mockExtract();
    mockReviewRoundtrip([reviewPending("likely")]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("comms-review-confirm")).toBeInTheDocument(),
    );
  });

  it("a caller-confirmed decision PERSISTS after remount (it lives on the durable row)", async () => {
    mockExtract();
    // The durable feed already carries the caller-confirmed decision (as the
    // backend returns after a confirm) — a fresh mount renders it directly.
    mockPendingFollowUps([
      reviewPending("confirmed", {
        action: {
          ...(reviewPending("confirmed").action as Record<string, unknown>),
          recipient_governance: mkRecipientGovernance({
            entity_id: "id-david",
            display_name: "David Odie",
            recipientSafety: "confirmed",
            evidence: { quote: null, source: "caller_confirmed", matchedToken: null, alternativeCandidates: [] },
          }),
        },
      }),
    ]);
    const { unmount } = render(
      <MemoryRouter>
        <Comms />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("comms-review-you-confirmed")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("ctx-send-button")).toBeEnabled();
    unmount();
    render(
      <MemoryRouter>
        <Comms />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("comms-review-you-confirmed")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("ctx-send-button")).toBeEnabled();
  });

  it("ambiguous shows server-supplied candidates; choosing posts the entity_id and moves the target", async () => {
    mockExtract();
    const rt = mockReviewRoundtrip([
      reviewPending("ambiguous", {
        select_candidates: [
          { entity_id: "id-shiney", display_name: "Shiney Thomas" },
          { entity_id: "id-shaini", display_name: "Shaini Verma" },
        ],
      }),
    ]);
    const user = userEvent.setup();
    renderPage();
    await waitFor(() =>
      expect(screen.getAllByTestId("comms-review-candidate")).toHaveLength(2),
    );
    // Choose the SECOND candidate — id-based, not name-parsed, not index-0.
    await user.click(screen.getAllByTestId("comms-review-candidate")[1]!);
    await waitFor(() => expect(rt.calls).toHaveLength(1));
    expect(rt.calls[0]!.body).toEqual({ decision: "select", recipient_entity_id: "id-shaini" });
    // The reloaded card carries the chosen person + is Send-ready.
    await waitFor(() =>
      expect(screen.getByTestId("comms-pending-follow-ups").textContent).toContain("Shaini Verma"),
    );
    expect(screen.getByTestId("ctx-send-button")).toBeEnabled();
  });

  it("ambiguous WITHOUT resolvable candidates shows honest copy, no fabricated choices", async () => {
    mockExtract();
    mockPendingFollowUps([reviewPending("ambiguous")]); // no select_candidates
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("comms-review-no-candidates")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("comms-review-candidate")).toBeNull();
    expect(screen.queryByTestId("comms-review-confirm")).toBeNull();
  });

  it("unauthorized: policy-blocked copy, NO override affordance", async () => {
    mockExtract();
    mockPendingFollowUps([reviewPending("unauthorized")]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("comms-review-policy-blocked")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("comms-review-confirm")).toBeNull();
    expect(screen.queryByTestId("comms-review-candidate")).toBeNull();
    expect(screen.getByTestId("ctx-send-button")).toBeDisabled();
  });

  it("cross_team_needs_approval: approval-boundary copy, NO direct override", async () => {
    mockExtract();
    mockPendingFollowUps([reviewPending("cross_team_needs_approval")]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("comms-review-approval-boundary")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("comms-review-approval-boundary").textContent).toMatch(/approver/i);
    expect(screen.queryByTestId("comms-review-confirm")).toBeNull();
    expect(screen.getByTestId("ctx-send-button")).toBeDisabled();
  });

  it("no raw backend codes anywhere on the review surfaces", async () => {
    mockExtract();
    mockPendingFollowUps([reviewPending("unauthorized")]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("comms-pending-follow-ups")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("comms-pending-follow-ups").outerHTML;
    for (const raw of ["POLICY_DENIES", "APPROVAL_REQUIRED", "ALREADY_CONFIRMED", "INVALID_REQUEST", "out_of_scope"]) {
      expect(html).not.toContain(raw);
    }
  });
});

describe("Comms — governed ingest surfaces persisted work", () => {
  it("shows the saved banner + per-owner work items (owned vs needs-owner)", async () => {
    mockExtract(undefined, [
      {
        ledger_entry_id: "le-1",
        ledger_type: "COMMITMENT",
        owner_entity_id: "id-david",
        owner_name: "David",
        title: "Grant Pratham write access to the WebA repo",
        status: "PROPOSED",
        needs_review: false,
        review_reason: null,
        execution: {
          execution_type: "repo_access",
          execution_mode: "connector_required",
          required_connector: "GITHUB",
          capability_state: "not_connected",
          approval_required: false,
          blocker_reason: "Github isn't connected yet — set it up to proceed.",
          next_best_action: "route",
        },
      },
      {
        ledger_entry_id: null,
        ledger_type: "COMMITMENT",
        owner_entity_id: null,
        owner_name: "Mallory",
        title: "Ship the billing rewrite",
        status: "NEEDS_OWNER",
        needs_review: true,
        review_reason: "Not a confirmed member of this org roster — confirm before assigning.",
      },
    ]);
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-ingest-saved")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("comms-ingest-saved").textContent).toMatch(
      /saved this conversation/i,
    );
    const items = screen.getAllByTestId("comms-ingest-work-item");
    expect(items.length).toBe(2);
    const owned = items.find((el) => el.getAttribute("data-owned") === "true");
    const review = items.find((el) => el.getAttribute("data-owned") === "false");
    expect(owned?.textContent).toMatch(/Owned by David/);
    expect(review?.textContent).toMatch(/confirmed member|confirm before assigning/i);
    // Phase 7 — the owned item shows its human-language execution mode + connector blocker.
    const exec = screen.getByTestId("comms-ingest-exec");
    expect(exec.textContent).toMatch(/Needs a tool connected/i);
    expect(exec.textContent).toMatch(/isn't connected/i);
  });
});

describe("Comms — manual import fallback", () => {
  it("Import notes textarea posts the typed text to /comms/ingest", async () => {
    let capturedBody: { captured_text?: string } | null = null;
    server.use(
      http.post(`${API_BASE}/otzar/comms/ingest`, async ({ request }) => {
        capturedBody = (await request.json()) as { captured_text?: string };
        const ex = canonicalExtraction();
        return HttpResponse.json({
          ok: true,
          result: {
            conversation: { meeting_capture_id: "mc-1", title: "Imported", participant_count: 0, summary: ex.summary, status: "PROCESSED" },
            quality: { total: 1, trusted: 1, quarantined: 0, noisy_tail_start_index: null },
            decisions: ex.decisions,
            work_items: [],
            support_edges: [],
            counts: { owned: 0, needs_review: 0, support_edges: 0 },
            extraction: ex,
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-import-toggle"));
    const textarea = screen.getByTestId("comms-import-textarea");
    await user.type(textarea, "Some pasted meeting notes.");
    await user.click(screen.getByTestId("comms-import-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-review")).toBeInTheDocument(),
    );
    expect(
      (capturedBody as unknown as { captured_text: string }).captured_text,
    ).toBe("Some pasted meeting notes.");
  });
});

describe("Comms — error state", () => {
  it("renders the error state when /comms/ingest fails", async () => {
    server.use(
      http.post(`${API_BASE}/otzar/comms/ingest`, () =>
        HttpResponse.json(
          { ok: false, code: "SESSION_EXPIRED" },
          { status: 401 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-error")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("comms-error").textContent).toMatch(
      /couldn't organize/i,
    );
  });
});

describe("Comms — privacy invariants (RULE 0)", () => {
  it("never renders TAR / wallet / clearance / permission / payload internals", async () => {
    mockExtract();
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByTestId("comms-start"));
    await user.click(screen.getByTestId("comms-end"));
    await waitFor(() =>
      expect(screen.getByTestId("comms-review")).toBeInTheDocument(),
    );
    const html = screen.getByTestId("comms-page").outerHTML;
    expect(html).not.toMatch(/tar_hash/i);
    expect(html).not.toMatch(/wallet_id/i);
    expect(html).not.toMatch(/clearance_ceiling/i);
    expect(html).not.toMatch(/permission_id/i);
    expect(html).not.toMatch(/payload_redacted/i);
    expect(html).not.toMatch(/policy_envelope/i);
    expect(html).not.toMatch(/embedding/i);
    expect(html).not.toMatch(/bearer/i);
  });
});
