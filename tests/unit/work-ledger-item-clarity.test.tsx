// FILE: tests/unit/work-ledger-item-clarity.test.tsx
// PURPOSE: [CE-1] the read-only "Who can clarify" block inside View/Why:
//          lazy-loaded only when the detail opens, calm candidate copy
//          ("Ask Eve: they sent the Slack message this came from."),
//          honest empty state when Otzar lacks context, and NO mutation —
//          opening the detail never POSTs, never creates an action or
//          escalation, never adds a Review Center item.
// CONNECTS TO: src/components/work-os/WorkLedgerItem.tsx,
//          api.workOs.ledgerClarity (GET /work-os/ledger/:id/clarity).

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { useCurrentSurfaceContextStore } from "@/lib/stores/current-surface-context";
import type {
  ClarityProjectionView,
  WorkLedgerEntryView,
} from "@/lib/types/foundation";

const API = "http://localhost:3000/api/v1";

function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-clarity-1",
    ledger_type: "COMMITMENT",
    source_type: "CONNECTOR",
    source_command: null,
    work_plan_id: null,
    requester_entity_id: "u-req",
    owner_entity_id: "u-owner",
    target_entity_id: null,
    title: "Grant the repo access",
    status: "PROPOSED",
    priority: "NORMAL",
    extraction_source: "LLM",
    next_action: null,
    due_at: null,
    created_at: "2026-07-03T00:00:00.000Z",
    ...over,
  };
}

function clarityHandler(clarity: ClarityProjectionView, onHit?: () => void) {
  return http.get(`${API}/work-os/ledger/:id/clarity`, () => {
    onHit?.();
    return HttpResponse.json({ ok: true, clarity });
  });
}

const WITH_CANDIDATES: ClarityProjectionView = {
  can_answer: true,
  authority_question: false,
  source_author_state: "resolved",
  candidates: [
    {
      entity_id: "u-eve",
      display_name: "Eve",
      role: "source_author",
      reason: "They sent the Slack message this work came from.",
      rank: 1,
    },
    {
      entity_id: "u-owner",
      display_name: "David",
      role: "owner",
      reason: "They own this work.",
      rank: 2,
    },
  ],
};

describe("[CE-1] WorkLedgerItem — Who can clarify (read-only, lazy)", () => {
  it("does not fetch clarity until View/Why opens; then renders calm candidate copy", async () => {
    let hits = 0;
    server.use(clarityHandler(WITH_CANDIDATES, () => { hits += 1; }));
    render(<MemoryRouter><WorkLedgerItem entry={entry()} /></MemoryRouter>);
    expect(hits).toBe(0); // never fetched for the card face
    expect(screen.queryByTestId("work-ledger-item-clarity")).toBeNull();

    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    await waitFor(() =>
      expect(screen.getByTestId("work-ledger-item-clarity")).toBeInTheDocument(),
    );
    expect(hits).toBe(1);
    const clarifiers = screen.getAllByTestId("work-ledger-item-clarifier");
    expect(clarifiers[0]!.textContent).toContain(
      "Ask Eve: they sent the Slack message this work came from.",
    );
    expect(clarifiers[1]!.textContent).toContain("Ask David: they own this work.");
    // Raw ids and backend role enums never render.
    const block = screen.getByTestId("work-ledger-item-clarity").textContent ?? "";
    expect(block).not.toContain("u-eve");
    expect(block).not.toContain("source_author");
  });

  it("no candidates → honest copy, never an invented clarifier", async () => {
    server.use(
      clarityHandler({
        can_answer: false,
        authority_question: false,
        source_author_state: "none",
        candidates: [],
      }),
    );
    render(<MemoryRouter><WorkLedgerItem entry={entry()} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    await waitFor(() =>
      expect(screen.getByTestId("work-ledger-item-clarity")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Otzar does not have enough context to suggest a clarifier yet."),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId("work-ledger-item-clarifier").length).toBe(0);
  });

  it("[CE-2] Request sends ONE governed call and flips to the calm requested state", async () => {
    let posted: { url: string; body: unknown } | null = null;
    server.use(
      clarityHandler(WITH_CANDIDATES),
      http.post(`${API}/work-os/ledger/:id/clarify`, async ({ request }) => {
        posted = { url: new URL(request.url).pathname, body: await request.json() };
        return HttpResponse.json(
          {
            ok: true,
            escalation_id: "esc-1",
            status: "PENDING",
            clarifier_entity_id: "u-eve",
            already_requested: false,
          },
          { status: 201 },
        );
      }),
    );
    render(<MemoryRouter><WorkLedgerItem entry={entry()} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    await waitFor(() =>
      expect(screen.getAllByTestId("work-ledger-item-clarify").length).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getAllByTestId("work-ledger-item-clarify")[0]!);
    await waitFor(() =>
      expect(screen.getByTestId("work-ledger-item-clarification-state")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("work-ledger-item-clarification-state").textContent).toBe(
      "Clarification requested from Eve. Waiting.",
    );
    expect(posted).not.toBeNull();
    expect((posted!.body as Record<string, unknown>).clarifier_entity_id).toBe("u-eve");
    // The candidate buttons are gone — one clarification at a time, calm.
    expect(screen.queryAllByTestId("work-ledger-item-clarify").length).toBe(0);
  });

  it("[CE-2] an existing clarification renders its lifecycle state instead of buttons", async () => {
    server.use(
      clarityHandler({
        ...WITH_CANDIDATES,
        pending_clarification: {
          escalation_id: "esc-9",
          status: "APPROVED",
          clarifier_entity_id: "u-eve",
          clarifier_display_name: "Eve",
        },
      }),
    );
    render(<MemoryRouter><WorkLedgerItem entry={entry()} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    await waitFor(() =>
      expect(screen.getByTestId("work-ledger-item-clarification-state")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("work-ledger-item-clarification-state").textContent).toBe(
      "Clarified by Eve.",
    );
    expect(screen.queryAllByTestId("work-ledger-item-clarify").length).toBe(0);
  });

  it("[CE-3] asking about the work renders the truth answer + wires the suggested action to the existing CE-2 handler; asking is GET-only", async () => {
    const gets: string[] = [];
    let clarifyPosted = false;
    server.events.removeAllListeners();
    server.events.on("request:start", ({ request }) => {
      if (request.method === "GET") gets.push(new URL(request.url).pathname);
    });
    server.use(
      clarityHandler(WITH_CANDIDATES),
      http.get(`${API}/work-os/ledger/:id/clarity-answer`, ({ request }) => {
        const q = new URL(request.url).searchParams.get("question") ?? "";
        expect(q).toBe("Where did this come from?");
        return HttpResponse.json({
          ok: true,
          answer: "This came from a Slack message. Eve shared it.",
          confidence: "high",
          used_sources: ["source_lineage"],
          suggested_next_action: {
            type: "request_clarification",
            clarifier_entity_id: "u-eve",
            label: "Ask Eve for clarification",
          },
        });
      }),
      http.post(`${API}/work-os/ledger/:id/clarify`, () => {
        clarifyPosted = true;
        return HttpResponse.json(
          { ok: true, escalation_id: "esc-2", status: "PENDING", clarifier_entity_id: "u-eve", already_requested: false },
          { status: 201 },
        );
      }),
    );
    render(<MemoryRouter><WorkLedgerItem entry={entry()} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    await waitFor(() =>
      expect(screen.getByTestId("work-ledger-item-ask-input")).toBeInTheDocument(),
    );
    fireEvent.change(screen.getByTestId("work-ledger-item-ask-input"), {
      target: { value: "Where did this come from?" },
    });
    fireEvent.click(screen.getByTestId("work-ledger-item-ask"));
    await waitFor(() =>
      expect(screen.getByTestId("work-ledger-item-ask-answer")).toBeInTheDocument(),
    );
    const answer = screen.getByTestId("work-ledger-item-ask-answer").textContent ?? "";
    expect(answer).toContain("This came from a Slack message. Eve shared it.");
    // Asking mutated nothing.
    expect(clarifyPosted).toBe(false);
    // The suggested action is real and rides the EXISTING governed handler.
    fireEvent.click(screen.getByTestId("work-ledger-item-ask-suggested"));
    await waitFor(() =>
      expect(screen.getByTestId("work-ledger-item-clarification-state")).toBeInTheDocument(),
    );
    expect(clarifyPosted).toBe(true);
    // No raw tokens in the rendered answer block.
    expect(answer).not.toMatch(/u-eve|source_lineage|HUMAN_REVIEW/);
  });

  it("[CE-AMBIENT] opening View/Why provides the work_item surface context; closing clears it", async () => {
    server.use(clarityHandler(WITH_CANDIDATES));
    // The store is module-global — earlier tests in this file opened items;
    // start from a clean slate.
    useCurrentSurfaceContextStore.getState().clear();
    render(<MemoryRouter><WorkLedgerItem entry={entry()} /></MemoryRouter>);
    expect(useCurrentSurfaceContextStore.getState().context).toBeNull();
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    const ctx = useCurrentSurfaceContextStore.getState().context;
    expect(ctx?.type).toBe("work_item");
    expect(ctx?.ledgerEntryId).toBe("led-clarity-1");
    expect(ctx?.title).toBe("Grant the repo access");
    // Closing clears OUR context so a stale "this" never resolves.
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    expect(useCurrentSurfaceContextStore.getState().context).toBeNull();
  });

  it("opening the detail performs NO mutation — no POST of any kind", async () => {
    const mutations: string[] = [];
    server.events.removeAllListeners();
    server.events.on("request:start", ({ request }) => {
      if (request.method !== "GET") {
        mutations.push(`${request.method} ${new URL(request.url).pathname}`);
      }
    });
    server.use(clarityHandler(WITH_CANDIDATES));
    render(<MemoryRouter><WorkLedgerItem entry={entry()} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    await waitFor(() =>
      expect(screen.getByTestId("work-ledger-item-clarity")).toBeInTheDocument(),
    );
    expect(mutations).toEqual([]);
  });
});
