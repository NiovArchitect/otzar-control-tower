// FILE: tests/unit/context-validation.test.tsx
// PURPOSE: [AIX-2] the in-context "Is this still current?" affordance:
//          renders ONLY on seeded rows inside the opened View/Why, writes
//          NOTHING before an explicit choice, posts the exact payload,
//          shows the honest per-state done copy on success and the honest
//          nothing-changed copy on failure, and leaks no raw enums/UUIDs.
//          The pure copy module is locked exactly (labels, question, done
//          copy) plus a banned-vocabulary sweep (no admin review / corpus
//          cleanup / delete / purge / train framing anywhere).
// CONNECTS TO: src/lib/work-os/context-validation.ts,
//          src/components/work-os/WorkLedgerItem.tsx,
//          api.workOs.validateSeededContext, FND context-relevance route.

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { useAuthStore } from "@/lib/stores/auth";
import {
  CONTEXT_VALIDATION_DONE,
  CONTEXT_VALIDATION_FAILED,
  CONTEXT_VALIDATION_OPTIONS,
  CONTEXT_VALIDATION_QUESTION,
} from "@/lib/work-os/context-validation";
import type { SeededOriginView, WorkLedgerEntryView } from "@/lib/types/foundation";

const API = "http://localhost:3000/api/v1";

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "vishesh@niovlabs.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: true, can_admin_org: false, can_admin_niov: false },
  });
});

function seededOrigin(over: Partial<SeededOriginView> = {}): SeededOriginView {
  return {
    origin: "seeded_document",
    origin_label: "Seeded document context · Process / SOP",
    currentness_label: "Historical",
    covering_period_label: "Covers 2025",
    boundary_label: "Company-owned background context — not personal Twin memory.",
    confidence_note: "Use as background unless live work or the right person confirms it is current.",
    ...over,
  };
}

function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-1", ledger_type: "COMMITMENT", source_type: "MEETING",
    source_command: null, work_plan_id: null, requester_entity_id: "u1", owner_entity_id: "u1",
    target_entity_id: null, title: "Support escalation SOP", status: "VERIFIED",
    priority: "ROUTINE", extraction_source: "TYPESCRIPT_DETERMINISTIC", next_action: null,
    due_at: null, created_at: "2026-07-03T00:00:00.000Z",
    ...over,
  } as WorkLedgerEntryView;
}

// Opening View/Why lazily fetches execution attempts + clarity — quiet,
// empty read-only responses so the open itself never errors.
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
  stubOpenReads();
  render(
    <MemoryRouter>
      <WorkLedgerItem entry={e} />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByTestId("work-ledger-item-view"));
}

describe("[AIX-2] pure copy model — exact labels, honest promises", () => {
  it("the five options carry the customer labels in order; internal states never leak into copy", () => {
    expect(CONTEXT_VALIDATION_OPTIONS.map((o) => o.label)).toEqual([
      "Still current",
      "Outdated",
      "Wrong context",
      "Conflicts with newer work",
      "Ask someone else",
    ]);
    expect(CONTEXT_VALIDATION_QUESTION).toBe(
      "This is seeded background context. Is it still current for this work?",
    );
    expect(CONTEXT_VALIDATION_DONE.confirmed).toBe("Confirmed as current by your team.");
    expect(CONTEXT_VALIDATION_DONE.stale).toContain("newer or live work instead");
    expect(CONTEXT_VALIDATION_DONE.contradicted).toContain("ask before acting on it");
    expect(CONTEXT_VALIDATION_DONE.needs_clarifier).toBe(
      "Otzar needs the right person to confirm this.",
    );
    // Banned vocabulary sweep across ALL customer copy in the module.
    const allCopy = [
      CONTEXT_VALIDATION_QUESTION,
      CONTEXT_VALIDATION_FAILED,
      ...CONTEXT_VALIDATION_OPTIONS.map((o) => o.label),
      ...Object.values(CONTEXT_VALIDATION_DONE),
    ].join(" ");
    expect(allCopy).not.toMatch(/admin review|corpus|clean.?up|delete|purge|train|AI learned|permanent|relevance enum/i);
  });
});

describe("[AIX-2] the affordance — seeded rows only, explicit action only", () => {
  it("a seeded row shows the question + five choices inside the opened Why; NOTHING posts before a click", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API}/work-os/ledger/:id/context-validation`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: {} });
      }),
    );
    await renderOpen(entry({ seeded_origin: seededOrigin() }));
    const block = screen.getByTestId("work-ledger-item-context-validation");
    expect(block.textContent).toContain(CONTEXT_VALIDATION_QUESTION);
    for (const o of CONTEXT_VALIDATION_OPTIONS) {
      expect(screen.getByTestId(`context-validation-${o.state}`).textContent).toBe(o.label);
    }
    // Rendering + opening wrote nothing.
    expect(bodies).toEqual([]);

    // The explicit choice posts the exact payload and lands the done copy.
    await userEvent.click(screen.getByTestId("context-validation-confirmed"));
    await screen.findByTestId("context-validation-done");
    expect(bodies).toEqual([{ state: "confirmed" }]);
    expect(screen.getByTestId("context-validation-done").textContent).toBe(
      "Confirmed as current by your team.",
    );
    // The choices are gone — one validation per visit, no double-write UI.
    expect(screen.queryByTestId("context-validation-confirmed")).toBeNull();

    // Leak sweep: no internal enums or UUIDs anywhere in visible copy.
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/wrong_scope|needs_clarifier|human_validation|context_relevance|seeded_context/);
    expect(body).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it("'Conflicts with newer work' posts contradicted and shows the ask-before-acting copy", async () => {
    const bodies: Array<Record<string, unknown>> = [];
    server.use(
      http.post(`${API}/work-os/ledger/:id/context-validation`, async ({ request }) => {
        bodies.push((await request.json()) as Record<string, unknown>);
        return HttpResponse.json({ ok: true, entry: {} });
      }),
    );
    await renderOpen(entry({ seeded_origin: seededOrigin({ origin: "seeded_history", origin_label: "Seeded history" }) }));
    await userEvent.click(screen.getByTestId("context-validation-contradicted"));
    await screen.findByTestId("context-validation-done");
    expect(bodies).toEqual([{ state: "contradicted" }]);
    expect(screen.getByTestId("context-validation-done").textContent).toBe(
      "Marked as conflicting with newer work. Otzar should ask before acting on it.",
    );
  });

  it("a refusal shows honest nothing-changed copy — no fake success, choices stay available", async () => {
    server.use(
      http.post(`${API}/work-os/ledger/:id/context-validation`, () =>
        HttpResponse.json(
          { ok: false, code: "NOT_FOUND", message: "ledger entry not found" },
          { status: 404 },
        ),
      ),
    );
    await renderOpen(entry({ seeded_origin: seededOrigin() }));
    await userEvent.click(screen.getByTestId("context-validation-stale"));
    const err = await screen.findByTestId("context-validation-error");
    expect(err.textContent).toBe(CONTEXT_VALIDATION_FAILED);
    expect(screen.queryByTestId("context-validation-done")).toBeNull();
    // The user can still try again or pick another option.
    expect(screen.getByTestId("context-validation-stale")).toBeTruthy();
  });

  it("live-work rows render NO validation affordance — silence, not a disabled control", async () => {
    await renderOpen(entry({ status: "PROPOSED" }));
    expect(screen.queryByTestId("work-ledger-item-context-validation")).toBeNull();
    expect((document.body.textContent ?? "")).not.toContain(CONTEXT_VALIDATION_QUESTION);
  });
});
