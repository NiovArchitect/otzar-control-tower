// FILE: tests/unit/chat.test.tsx
// PURPOSE: Page test for the employee Chat surface. Verifies a real
//          message round-trips through POST /otzar/conversation/message
//          (via MSW) and that close summarizes via /conversation/close.
// CONNECTS TO: src/pages/app/Chat.tsx, tests/msw/handlers.ts.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { Chat } from "@/pages/app/Chat";
import { useContinuityStore } from "@/lib/stores/continuity";
import {
  getRecordedCorrectionCalls,
  resetRecordedCorrectionCalls,
} from "../msw/handlers";

const API_BASE = "http://localhost:3000/api/v1";

beforeEach(() => {
  resetRecordedCorrectionCalls();
  // Reset the continuity store singleton so a prior test's active conversation / pending
  // never leaks into this Chat render (server-authoritative restoration is per-test).
  useContinuityStore.getState().reset();
});
afterEach(() => {
  resetRecordedCorrectionCalls();
});

describe("Chat (employee Otzar)", () => {
  it("sends a message and renders the assistant response + transparency meta", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/Echo: hello/)).toBeInTheDocument();
    // Transparency counters (context_used/tokens) surface; NO audit link.
    expect(await screen.findByTestId("chat-meta")).toBeInTheDocument();
  });

  it("closes the conversation and renders the saved confirmation + topics", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await screen.findByText(/Echo: hello/);

    await user.click(
      screen.getByRole("button", { name: /close conversation/i }),
    );
    const summary = await screen.findByTestId("close-summary");
    expect(summary).toHaveTextContent(/Conversation saved/i);
    expect(summary).toHaveTextContent(/pricing/);
    // Product-safe copy: no raw substrate id / "capsule" wording surfaced.
    expect(summary).not.toHaveTextContent(/capsule/i);
  });

  it("keeps transparency quiet by default and reveals it on demand", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await screen.findByText(/Echo: hello/);

    // Default experience: calm. A small optional control, NOT the full
    // panel, and copy that reads as confidence, not surveillance.
    const toggle = await screen.findByTestId("transparency-toggle");
    expect(toggle).toHaveTextContent(/Why this answer\?/i);
    expect(screen.queryByTestId("transparency-panel")).not.toBeInTheDocument();

    // On demand: reveal the panel.
    await user.click(toggle);
    const panel = await screen.findByTestId("transparency-panel");
    expect(panel).toHaveTextContent(/How Otzar answered/i);
    expect(panel).toHaveTextContent(/Q4 pricing decision/);
    expect(screen.getByTestId("access-limited")).toHaveTextContent(
      /access rules/i,
    );

    // Collapsible again.
    await user.click(screen.getByTestId("transparency-toggle"));
    await waitFor(() =>
      expect(
        screen.queryByTestId("transparency-panel"),
      ).not.toBeInTheDocument(),
    );
  });

  it("Wave 2C: inline 'Correct this conversation' is hidden until a conversation is active", () => {
    render(<Chat />);
    // No message sent yet → conversationId === null → no affordance.
    expect(
      screen.queryByTestId("chat-correction-affordance"),
    ).not.toBeInTheDocument();
  });

  it("Wave 2C: inline correction submits with the active conversation_id", async () => {
    const user = userEvent.setup();
    render(<Chat />);

    // 1. Send a message so an active conversation is established. The client now MINTS the
    //    conversation id (first-turn recovery); the MSW handler echoes it back, so it becomes
    //    the active id. Capture it to assert the correction carries the SAME conversation.
    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await screen.findByText(/Echo: hello/);

    // 2. Open the inline correction form.
    const toggle = await screen.findByTestId("chat-correction-toggle");
    await user.click(toggle);
    const form = await screen.findByTestId("chat-correction-form");

    // [GAP-S S-1] the form states where the learning lands — the true copy
    // (corrections write to the employee's personal wallet, applied here).
    expect(screen.getByTestId("chat-correction-boundary")).toHaveTextContent(
      "Saved as personal learning in your Digital Work Wallet",
    );

    // 3. Fill + submit.
    await user.type(
      screen.getByLabelText(/What was wrong/i),
      "Said pricing is fixed",
    );
    await user.type(
      screen.getByLabelText(/The correct behavior/i),
      "Pricing varies by tier",
    );
    await user.click(
      within(form).getByRole("button", { name: /Submit correction/i }),
    );

    // 4. Success surface + MSW recorded the conversation_id on the wire.
    expect(
      await screen.findByTestId("chat-correction-success"),
    ).toHaveTextContent(/Correction signal submitted for this conversation/i);
    await waitFor(() => {
      expect(getRecordedCorrectionCalls().count).toBe(1);
    });
    const correctionBody = getRecordedCorrectionCalls().lastBody as Record<string, unknown>;
    expect(correctionBody).toMatchObject({
      incorrect_description: "Said pricing is fixed",
      correct_behavior: "Pricing varies by tier",
    });
    // The correction carries the ACTIVE conversation id — now the client-minted UUID the
    // server echoed back (first-turn recovery contract), not the mock's no-client default.
    expect(typeof correctionBody.conversation_id).toBe("string");
    expect(correctionBody.conversation_id as string).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    // No raw target_capsule_id surfaced from the Chat affordance.
    expect(getRecordedCorrectionCalls().lastBody).not.toHaveProperty(
      "target_capsule_id",
    );
  });

  // [OTZAR-CONTINUITY cross-tab restoration] A fresh tab (no sessionStorage) must discover and
  // restore the caller's SERVER-side obligations on the active thread — not only requests that
  // are still in-flight. These tests are constructed so DISCOVERY is the ONLY route to the
  // canonical: the bootstrap `detail()` deliberately returns the thread WITHOUT the just-
  // completed turn (a fresh tab that raced ahead of completion), so if the discovery code did
  // nothing, the canonical would never render and the test would fail.
  function threadSummary(conv: string): Record<string, unknown> {
    return {
      conversation_id: conv,
      twin_entity_id: "twin-msw-0001",
      status: "ACTIVE",
      timezone: null,
      source_type: "CHAT",
      started_at: "2026-07-11T00:00:00.000Z",
      last_active_at: "2026-07-11T00:00:00.000Z",
      message_count: 0,
      archived: false,
      unresolved_count: 1,
    };
  }
  function assistantTurn(text: string): Record<string, unknown> {
    return {
      turn_id: "turn-canon-0001",
      role: "ASSISTANT",
      content: text,
      sequence: 2,
      source_channel: "CHAT",
      created_at: "2026-07-11T00:00:05.000Z",
    };
  }
  // A server request record that has COMPLETED (so it is NOT in_progress) but carries a durable
  // canonical result — the exact shape the FND integration tests proved /requests/unresolved
  // returns for AWAITING_CONFIRMATION and for recently-completed ordinary answers.
  function completedRecord(
    conv: string,
    canonicalText: string,
    responseClass: string,
    hasAction: boolean,
  ): Record<string, unknown> {
    return {
      request_record_id: "req-msw-0001",
      conversation_id: conv,
      client_request_id: "cli-msw-0001",
      state: "COMPLETED",
      response_class: responseClass,
      has_canonical_result: true,
      has_action: hasAction,
      in_progress: false, // <-- the founder's gap: in_progress is FALSE here; must still restore
      retryable: false,
      failure_code: null,
      canonical_assistant_turn_id: "turn-canon-0001",
      canonical_text: canonicalText,
      created_at: "2026-07-11T00:00:00.000Z",
      completed_at: "2026-07-11T00:00:05.000Z",
    };
  }

  it("cross-tab: a COMPLETED + AWAITING_CONFIRMATION proposal is discovered and restored in a fresh tab, rendering the exact canonical proposal with no second proposal, and is confirmable through the same governed thread path", async () => {
    const CONV = "11111111-1111-4111-8111-111111111111";
    const PROPOSAL = 'I\'ve got "Sync with Olivia" ready. Want me to add it?';
    let detailCalls = 0;
    let sawRecentWindow = false;
    const messagePosts: Array<Record<string, unknown>> = [];

    server.use(
      http.get(`${API_BASE}/otzar/threads/restore`, () =>
        HttpResponse.json({ ok: true, active: threadSummary(CONV), recent: [] }, { status: 200 }),
      ),
      http.get(`${API_BASE}/otzar/threads/:conversationId`, () => {
        detailCalls += 1;
        // Bootstrap read (1st) has no proposal yet; only re-hydration after discovery surfaces it.
        const turns = detailCalls === 1 ? [] : [assistantTurn(PROPOSAL)];
        return HttpResponse.json({ ok: true, thread: threadSummary(CONV), turns }, { status: 200 });
      }),
      http.get(`${API_BASE}/otzar/requests/unresolved`, ({ request }) => {
        if (new URL(request.url).searchParams.get("recent_completed_ms") !== null) sawRecentWindow = true;
        return HttpResponse.json(
          { ok: true, unresolved: [completedRecord(CONV, PROPOSAL, "AWAITING_CONFIRMATION", true)] },
          { status: 200 },
        );
      }),
      http.post(`${API_BASE}/otzar/conversation/message`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        messagePosts.push(body);
        return HttpResponse.json(
          { ok: true, response: "Echo: yes", context_used: 0, tokens_consumed: 1, conversation_id: String(body.conversation_id ?? CONV) },
          { status: 200 },
        );
      }),
    );

    const user = userEvent.setup();
    render(<Chat />);

    // The exact canonical proposal is restored — via SERVER discovery, not bootstrap hydration.
    expect(await screen.findByText(PROPOSAL)).toBeInTheDocument();
    // Discovery used the bounded recovery window, and restoration NEVER re-submitted (no 2nd proposal).
    expect(sawRecentWindow).toBe(true);
    expect(messagePosts).toHaveLength(0);

    // Confirm through the SAME governed thread path: the next message is bound to the SAME
    // conversation, so the server resolves it against the pending proposal (thread-scoped).
    await user.type(screen.getByLabelText("Message"), "yes");
    await user.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(messagePosts).toHaveLength(1));
    expect(messagePosts[0]!.conversation_id).toBe(CONV);
  });

  it("cross-tab: an ordinary request that COMPLETED before this tab opened is discovered via the bounded recent-completed window and its exact canonical answer restored — no second POST, no duplicate turn", async () => {
    const CONV = "22222222-2222-4222-8222-222222222222";
    const ANSWER = "The Q4 pricing decision was finalized on Tuesday.";
    let detailCalls = 0;
    let recentWindow: string | null = "MISSING";
    const messagePosts: unknown[] = [];

    server.use(
      http.get(`${API_BASE}/otzar/threads/restore`, () =>
        HttpResponse.json({ ok: true, active: threadSummary(CONV), recent: [] }, { status: 200 }),
      ),
      http.get(`${API_BASE}/otzar/threads/:conversationId`, () => {
        detailCalls += 1;
        const turns = detailCalls === 1 ? [] : [assistantTurn(ANSWER)];
        return HttpResponse.json({ ok: true, thread: threadSummary(CONV), turns }, { status: 200 });
      }),
      http.get(`${API_BASE}/otzar/requests/unresolved`, ({ request }) => {
        recentWindow = new URL(request.url).searchParams.get("recent_completed_ms");
        return HttpResponse.json(
          { ok: true, unresolved: [completedRecord(CONV, ANSWER, "ANSWERED", false)] },
          { status: 200 },
        );
      }),
      http.post(`${API_BASE}/otzar/conversation/message`, async ({ request }) => {
        messagePosts.push(await request.json());
        return HttpResponse.json({ ok: true, response: "dup", context_used: 0, tokens_consumed: 1, conversation_id: CONV }, { status: 200 });
      }),
    );

    render(<Chat />);

    // The lost ordinary answer is recovered — only reachable through the recent-completed window.
    expect(await screen.findByText(ANSWER)).toBeInTheDocument();
    expect(recentWindow).not.toBe("MISSING");
    expect(Number(recentWindow)).toBeGreaterThan(0);
    expect(Number(recentWindow)).toBeLessThanOrEqual(600_000); // server clamp
    // No resubmission and no duplicate turn (rendered exactly once).
    expect(messagePosts).toHaveLength(0);
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
  });

  it("first-turn response-loss (same tab): a reload with a persisted pending submission recovers the exact canonical answer via the server — no resubmit, exactly one canonical turn", async () => {
    // The FIRST turn of a brand-new, CLIENT-MINTED conversation whose response was lost before
    // it rendered (reload). The pending logical-submission identity was persisted to
    // sessionStorage; on reload the recovery effect reconciles it with the SERVER by
    // (conversation_id, client_request_id) and renders the durable canonical — it must NEVER
    // re-POST (that would risk a second execution) and must render the canonical exactly once.
    const CONV = "33333333-3333-4333-8333-333333333333";
    const REQ = "cli-reload-0001";
    const ANSWER = "Yes — I booked the room for 3pm.";
    const messagePosts: unknown[] = [];

    // Persist the pending submission the first (lost) turn recorded, then "reload" by rendering.
    sessionStorage.setItem(
      "otzar.continuity.pending",
      JSON.stringify({ conversation_id: CONV, client_request_id: REQ, message: "book the room for 3pm" }),
    );

    server.use(
      // No active thread from restore — isolates the same-tab reload recovery path.
      http.get(`${API_BASE}/otzar/threads/restore`, () =>
        HttpResponse.json({ ok: true, active: null, recent: [] }, { status: 200 }),
      ),
      http.get(`${API_BASE}/otzar/threads/:conversationId/requests/by-client/:clientRequestId`, () =>
        HttpResponse.json({ ok: true, status: completedRecord(CONV, ANSWER, "ANSWERED", false) }, { status: 200 }),
      ),
      http.get(`${API_BASE}/otzar/threads/:conversationId`, () =>
        HttpResponse.json({ ok: true, thread: threadSummary(CONV), turns: [assistantTurn(ANSWER)] }, { status: 200 }),
      ),
      http.post(`${API_BASE}/otzar/conversation/message`, async ({ request }) => {
        messagePosts.push(await request.json());
        return HttpResponse.json({ ok: true, response: "dup", context_used: 0, tokens_consumed: 1, conversation_id: CONV }, { status: 200 });
      }),
    );

    render(<Chat />);

    // The durable canonical is recovered from server authority…
    expect(await screen.findByText(ANSWER)).toBeInTheDocument();
    // …with NO resubmission and exactly one canonical turn, and the pending identity cleared.
    expect(messagePosts).toHaveLength(0);
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
    await waitFor(() => expect(sessionStorage.getItem("otzar.continuity.pending")).toBeNull());
  });

  it("remains backward-compatible when transparency fields are missing", async () => {
    server.use(
      http.post(
        `${API_BASE}/otzar/conversation/message`,
        async ({ request }) => {
          const body = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(
            {
              ok: true,
              response: `Echo: ${String(body.message ?? "")}`,
              context_used: 0,
              tokens_consumed: 10,
              conversation_id: "conv-bc-0001",
            },
            { status: 200 },
          );
        },
      ),
    );

    const user = userEvent.setup();
    render(<Chat />);
    await user.type(screen.getByLabelText("Message"), "hi");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/Echo: hi/)).toBeInTheDocument();
    expect(screen.getByTestId("chat-meta")).toBeInTheDocument();
    // Quiet by default: the optional control is present, the panel is not.
    expect(screen.getByTestId("transparency-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("transparency-panel")).not.toBeInTheDocument();
    // Revealing on demand shows the graceful fallback, not a broken panel.
    await user.click(screen.getByTestId("transparency-toggle"));
    expect(
      await screen.findByTestId("transparency-empty"),
    ).toBeInTheDocument();
  });
});
