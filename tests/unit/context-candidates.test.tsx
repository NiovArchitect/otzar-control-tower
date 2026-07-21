// FILE: tests/unit/context-candidates.test.tsx
// PURPOSE: [AIX-3] the "Possible background context" block: renders only
//          when the derived read returns candidates (silence when empty),
//          shows confirmation-first copy with the deterministic reason,
//          routes each candidate to the SAME AIX-2 validation mechanism
//          (posted against the seeded source row's id), never fetches for
//          seeded rows, and leaks no raw internal states/overclaims in
//          visible copy.
// CONNECTS TO: src/components/work-os/WorkLedgerItem.tsx,
//          src/components/work-os/ContextValidationChoices.tsx,
//          api.workOs.ledgerContextCandidates, FND
//          context-candidates.service.ts.

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { useAuthStore } from "@/lib/stores/auth";
import type { ContextCandidateView, WorkLedgerEntryView } from "@/lib/types/foundation";

const API = "http://localhost:3000/api/v1";

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "vishesh@niovlabs.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: true, can_admin_org: true, can_admin_niov: false },
  });
});

function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-work-1", ledger_type: "TASK", source_type: "MEETING",
    source_command: null, work_plan_id: null, requester_entity_id: "u1", owner_entity_id: "u1",
    target_entity_id: null, title: "Handle the Phoenix escalation backlog", status: "PROPOSED",
    priority: "ROUTINE", extraction_source: "TYPESCRIPT_DETERMINISTIC", next_action: null,
    due_at: null, created_at: "2026-07-03T00:00:00.000Z",
    ...over,
  } as WorkLedgerEntryView;
}

function candidate(over: Partial<ContextCandidateView> = {}): ContextCandidateView {
  return {
    ledger_entry_id: "led-seed-9",
    title_label: "Phoenix escalation runbook",
    origin_label: "Seeded document context · Process / SOP",
    covering_period_label: "Covers 2026",
    status_label: "May relate to this work. Needs confirmation",
    reason_label:
      "Possible context: the names in both items match; it covers the same time period. Background until confirmed.",
    signal_labels: ["The names in both items match", "It covers the same time period"],
    ...over,
  };
}

function stubOpenReads(): void {
  server.use(
    http.get(`${API}/work-os/ledger/:id/execution-attempts`, () =>
      HttpResponse.json({ ok: true, attempts: [] }),
    ),
    http.get(`${API}/work-os/ledger/:id/clarity`, () =>
      HttpResponse.json({ ok: true, clarity: { candidates: [] } }),
    ),
  );
}

async function renderOpen(e: WorkLedgerEntryView): Promise<void> {
  render(
    <MemoryRouter>
      <WorkLedgerItem entry={e} />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByTestId("work-ledger-item-view"));
}

describe("[AIX-3] possible background context — derived, confirmation-first, silent when empty", () => {
  it("renders candidates with confirmation-first copy and routes validation to the SEEDED row's id", async () => {
    stubOpenReads();
    const validations: Array<{ id: string; body: Record<string, unknown> }> = [];
    server.use(
      http.get(`${API}/work-os/ledger/:id/context-candidates`, () =>
        HttpResponse.json({ ok: true, candidates: [candidate()] }),
      ),
      http.post(`${API}/work-os/ledger/:id/context-validation`, async ({ params, request }) => {
        validations.push({
          id: String(params.id),
          body: (await request.json()) as Record<string, unknown>,
        });
        return HttpResponse.json({ ok: true, entry: {} });
      }),
    );
    await renderOpen(entry());
    const block = await screen.findByTestId("work-ledger-item-context-candidates");
    expect(block.textContent).toContain("Possible background context:");
    expect(block.textContent).toContain("Phoenix escalation runbook");
    expect(block.textContent).toContain("May relate to this work. Needs confirmation");
    expect(block.textContent).toContain("Background until confirmed");
    expect(block.textContent).toContain("the names in both items match");

    // Validation reuses the ONE AIX-2 mechanism, posted against the
    // seeded SOURCE row — not the work row being viewed.
    await userEvent.click(screen.getByTestId("candidate-validation-led-seed-9-confirmed"));
    await screen.findByTestId("candidate-validation-led-seed-9-done");
    expect(validations).toEqual([{ id: "led-seed-9", body: { state: "confirmed" } }]);
    expect(screen.getByTestId("candidate-validation-led-seed-9-done").textContent).toBe(
      "Confirmed as current by your team.",
    );

    // Overclaim + leak sweep on everything visible.
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/AI knows|current truth|assigned|trained|relevant\./i);
    expect(body).not.toMatch(/candidate_needs_confirmation|suppressed_|wrong_scope|human_validation/);
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it("an already-validated candidate shows its validation label alongside the re-check choices", async () => {
    stubOpenReads();
    server.use(
      http.get(`${API}/work-os/ledger/:id/context-candidates`, () =>
        HttpResponse.json({
          ok: true,
          candidates: [
            candidate({
              status_label: "Confirmed current",
              validation_state_label: "Confirmed current",
              validation_guidance: "Confirmed as current by your team.",
            }),
          ],
        }),
      ),
    );
    await renderOpen(entry());
    const validated = await screen.findByTestId("context-candidate-validated");
    expect(validated.textContent).toBe("Confirmed current. Confirmed as current by your team.");
    // Re-validation stays possible (people change their minds; AIX-2 is
    // latest-wins) — the choices still render.
    expect(screen.getByTestId("candidate-validation-led-seed-9-stale")).toBeTruthy();
  });

  it("empty candidates → complete silence (no block, no heading)", async () => {
    stubOpenReads();
    server.use(
      http.get(`${API}/work-os/ledger/:id/context-candidates`, () =>
        HttpResponse.json({ ok: true, candidates: [] }),
      ),
    );
    await renderOpen(entry());
    // The clarity block (also loaded on open) proves the open completed.
    await screen.findByTestId("work-ledger-item-clarity");
    expect(screen.queryByTestId("work-ledger-item-context-candidates")).toBeNull();
    expect((document.body.textContent ?? "")).not.toContain("Possible background context");
  });

  it("seeded rows never fetch candidates — context is not suggested for context", async () => {
    stubOpenReads();
    let fetched = 0;
    server.use(
      http.get(`${API}/work-os/ledger/:id/context-candidates`, () => {
        fetched += 1;
        return HttpResponse.json({ ok: true, candidates: [] });
      }),
    );
    await renderOpen(
      entry({
        seeded_origin: {
          origin: "seeded_document",
          origin_label: "Seeded document context · Process / SOP",
          boundary_label: "Company-owned background context — not personal Twin memory.",
          confidence_note: "Use as background unless live work or the right person confirms it is current.",
        },
      }),
    );
    await screen.findByTestId("work-ledger-item-clarity");
    expect(fetched).toBe(0);
    // The seeded row still gets its own AIX-2 affordance.
    expect(screen.getByTestId("work-ledger-item-context-validation")).toBeTruthy();
  });
});
