// FILE: work-ledger-proof.test.tsx
// PURPOSE: Phase 1283 — the proof layer in the UI: WorkLedgerItem View/Why
//          lazy-loads execution attempts and renders the proof trail
//          (verified vs failed), coordination + watcher state, and a safe
//          error when proof can't load; BlindSpots renders a distinct
//          "Runtime / verification issues" section. Opening View/Why
//          sends/executes nothing.
// CONNECTS TO: src/components/work-os/WorkLedgerItem.tsx,
//          src/pages/app/BlindSpots.tsx, api.workOs.executionAttempts.

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { BlindSpots } from "@/pages/app/BlindSpots";
import type { WorkLedgerEntryView, WatcherFinding, WatcherActionKind } from "@/lib/types/foundation";

const API = "http://localhost:3000/api/v1";

function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-proof-1",
    ledger_type: "BLOCKER",
    source_type: "VOICE_COMMAND",
    source_command: "we are blocked",
    work_plan_id: null,
    requester_entity_id: null,
    owner_entity_id: null,
    target_entity_id: null,
    title: "Blocked until Google reconnect",
    status: "BLOCKED",
    priority: "ROUTINE",
    extraction_source: "PYTHON_ENRICHED",
    next_action: null,
    due_at: null,
    created_at: "2026-06-14T00:00:00.000Z",
    ...over,
  };
}

function attemptsHandler(attempts: unknown[]) {
  return http.get(`${API}/work-os/ledger/:id/execution-attempts`, () =>
    HttpResponse.json({ ok: true, attempts }),
  );
}

describe("WorkLedgerItem execution proof (lazy)", () => {
  it("does not fetch attempts until View/Why is opened, then shows the proof trail", async () => {
    let fetched = 0;
    server.use(
      http.get(`${API}/work-os/ledger/:id/execution-attempts`, () => {
        fetched += 1;
        return HttpResponse.json({
          ok: true,
          attempts: [
            { attempt_id: "1", ledger_entry_id: "led-proof-1", attempt_type: "WORK_LEDGER_CREATE", runtime: "TYPESCRIPT", evidence_type: "INTERNAL_RECORD", status: "VERIFIED", error_code: null, created_at: "x", verified_at: "x" },
            { attempt_id: "2", ledger_entry_id: "led-proof-1", attempt_type: "BEAM_FANOUT", runtime: "BEAM", evidence_type: "PROVIDER_RESPONSE", status: "FAILED", error_code: "http_500", created_at: "x", verified_at: null },
          ],
        });
      }),
    );
    render(<WorkLedgerItem entry={entry()} />);
    expect(fetched).toBe(0); // not fetched upfront

    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    const proof = await screen.findByTestId("work-ledger-item-proof");
    await waitFor(() => expect(fetched).toBe(1));
    // verified attempt distinct from failed; failed shows safe error code
    const verified = await screen.findByTestId("attempt-WORK_LEDGER_CREATE");
    expect(verified.textContent).toContain("verified");
    const failed = screen.getByTestId("attempt-BEAM_FANOUT");
    expect(failed.textContent).toContain("failed");
    expect(proof.textContent).toContain("http_500");
    expect(proof.textContent).toContain("No external action attempted");
  });

  it("shows a safe error when proof cannot be loaded", async () => {
    server.use(
      http.get(`${API}/work-os/ledger/:id/execution-attempts`, () =>
        HttpResponse.json({ ok: false, code: "BOOM" }, { status: 500 }),
      ),
    );
    render(<WorkLedgerItem entry={entry()} />);
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    await waitFor(() =>
      expect(screen.getByTestId("work-ledger-item-proof").textContent).toContain(
        "Execution proof unavailable",
      ),
    );
  });

  it("renders persisted coordination + active watcher", () => {
    server.use(attemptsHandler([]));
    render(
      <WorkLedgerItem
        entry={entry({
          coordination: { runtime: "BEAM_DISPATCHED", event_id: "e", watcher: "blocker", dispatched_at: "x", error_code: null },
          watchers: [{ watcher_id: "w1", watcher_type: "BLOCKER", status: "ACTIVE", source_runtime: "BEAM", escalation_level: "NONE", created_at: "x" }],
        })}
      />,
    );
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    const coord = screen.getByTestId("work-ledger-item-coordination");
    expect(coord.textContent).toContain("BEAM dispatched");
    expect(screen.getByTestId("work-ledger-item-watchers").textContent?.toLowerCase()).toContain("blocker");
  });

  it("shows a 'Verification issue' card badge when blind_spot_reason is set", () => {
    server.use(attemptsHandler([]));
    render(<WorkLedgerItem entry={entry({ blind_spot_reason: "COORDINATION_FAILED", blind_spot_severity: "MEDIUM" })} />);
    expect(screen.getByTestId("work-ledger-item-card-badge").textContent).toContain("Verification issue");
  });
});

describe("BlindSpots runtime-issues section", () => {
  it("renders a distinct 'Runtime / verification issues' section", async () => {
    server.use(
      // Watcher feed empty → the legacy runtime/status sections render.
      http.get(`${API}/work-os/watchers/feed`, () => HttpResponse.json({ ok: true, findings: [] })),
      http.get(`${API}/work-os/blind-spots`, () =>
        HttpResponse.json({
          ok: true,
          items: [
            entry({ ledger_entry_id: "rt-1", blind_spot_reason: "COORDINATION_FAILED", blind_spot_severity: "MEDIUM" }),
            entry({ ledger_entry_id: "st-1", title: "needs owner", status: "NEEDS_OWNER" }),
          ],
        }),
      ),
    );
    render(
      <MemoryRouter>
        <BlindSpots />
      </MemoryRouter>,
    );
    await screen.findByTestId("blind-spots-runtime-issues");
    expect(screen.getByTestId("blind-spots-runtime-issues")).toBeTruthy();
    expect(screen.getByTestId("blind-spots-status")).toBeTruthy();
  });
});

// Phase OTZAR-RETURN-1 — a watcher finding whose recommendation is
// "mark_complete" AND that carries a ledger_entry_id renders an actionable
// "Mark complete" button (not dead text); clicking it PATCHes the ledger and
// the completed item drops out of the feed. A finding without a completable
// ledger keeps the recommendation as plain text.
function finding(over: Partial<WatcherFinding> = {}): WatcherFinding {
  return {
    finding_id: "f-1",
    watcher_type: "OVERDUE_WORK",
    severity: "HIGH",
    title: "Overdue: ship the deck",
    summary: "This was due yesterday.",
    org_id: "org-1",
    owner: null,
    requester: null,
    target: null,
    related_person: null,
    source: {
      source_system: "work_ledger",
      ledger_entry_id: "led-9",
      source_message_id: null,
      source_thread_key: null,
      relationship_key: null,
    },
    detection: {
      rule_id: "overdue",
      detected_at: "2026-06-20T00:00:00.000Z",
      age_hours: 48,
      due_at: "2026-06-19",
      threshold_hours: 24,
      reason: "past due",
    },
    recommendation: { next_action: "Mark this complete", action_kind: "mark_complete" },
    ...over,
  };
}

describe("BlindSpots — mark_complete recommendation becomes an action", () => {
  it("renders a Mark complete button when action_kind is mark_complete and a ledger entry exists", async () => {
    server.use(
      http.get(`${API}/work-os/watchers/feed`, () =>
        HttpResponse.json({ ok: true, findings: [finding()] }),
      ),
      http.get(`${API}/work-os/blind-spots`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    render(
      <MemoryRouter>
        <BlindSpots />
      </MemoryRouter>,
    );
    const btn = await screen.findByTestId("blind-spot-mark-complete");
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain("Mark complete");
  });

  it("keeps the recommendation as plain text when it is not completable", async () => {
    server.use(
      http.get(`${API}/work-os/watchers/feed`, () =>
        HttpResponse.json({
          ok: true,
          findings: [
            // no completable ledger: a different verb, and no ledger entry.
            finding({
              recommendation: {
                next_action: "Nudge the owner",
                action_kind: "nudge_owner" as WatcherActionKind,
              },
              source: {
                source_system: "thread",
                ledger_entry_id: null,
                source_message_id: "m-1",
                source_thread_key: "t-1",
                relationship_key: null,
              },
            }),
          ],
        }),
      ),
      http.get(`${API}/work-os/blind-spots`, () => HttpResponse.json({ ok: true, items: [] })),
    );
    render(
      <MemoryRouter>
        <BlindSpots />
      </MemoryRouter>,
    );
    await screen.findByTestId("blind-spot-recommended");
    expect(screen.queryByTestId("blind-spot-mark-complete")).toBeNull();
  });

  it("clicking Mark complete PATCHes the ledger to EXECUTED", async () => {
    let patched: { id: string; status: string } | null = null;
    server.use(
      http.get(`${API}/work-os/watchers/feed`, () =>
        HttpResponse.json({ ok: true, findings: [finding()] }),
      ),
      http.get(`${API}/work-os/blind-spots`, () => HttpResponse.json({ ok: true, items: [] })),
      http.patch(`${API}/work-os/ledger/:id`, async ({ params, request }) => {
        const body = (await request.json()) as { status?: string };
        patched = { id: String(params.id), status: body.status ?? "" };
        return HttpResponse.json({ ok: true });
      }),
    );
    render(
      <MemoryRouter>
        <BlindSpots />
      </MemoryRouter>,
    );
    const btn = await screen.findByTestId("blind-spot-mark-complete");
    fireEvent.click(btn);
    await waitFor(() => expect(patched).not.toBeNull());
    expect(patched).toEqual({ id: "led-9", status: "EXECUTED" });
  });
});
