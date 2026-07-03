// FILE: tests/unit/work-ledger-item-clarity.test.tsx
// PURPOSE: [CE-1] the read-only "Who can clarify" block inside View/Why:
//          lazy-loaded only when the detail opens, calm candidate copy
//          ("Ask Eve — they sent the Slack message this came from."),
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
    expect(clarifiers[0]!.textContent).toBe(
      "Ask Eve — they sent the Slack message this work came from.",
    );
    expect(clarifiers[1]!.textContent).toBe("Ask David — they own this work.");
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
