// FILE: work-ledger-item-enrichment.test.tsx
// PURPOSE: Phase 1282 — the WorkLedgerItem View/Why drawer surfaces the
//          advisory Python enrichment truth honestly: signals when present,
//          an explicit "not used" degrade line otherwise, and the
//          "Foundation decides" advisory framing. Never claims execution.
// CONNECTS TO: src/components/work-os/WorkLedgerItem.tsx

import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";

function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-1",
    ledger_type: "FOLLOW_UP",
    source_type: "VOICE_COMMAND",
    source_command: "follow up with Dana",
    work_plan_id: null,
    requester_entity_id: null,
    owner_entity_id: null,
    target_entity_id: null,
    title: "Follow up with Dana",
    status: "DRAFT",
    priority: "ROUTINE",
    extraction_source: "PYTHON_ENRICHED",
    next_action: null,
    due_at: null,
    created_at: "2026-06-13T18:00:00.000Z",
    ...over,
  };
}

describe("WorkLedgerItem Python enrichment surfacing", () => {
  it("shows enriched signals + advisory framing when Python contributed", () => {
    render(
      <WorkLedgerItem
        entry={entry({
          python_enrichment: {
            status: "PYTHON_ENRICHED",
            signals: [
              { signal_type: "FOLLOW_UP", confidence: "MEDIUM", evidence_phrase: "follow up" },
              { signal_type: "DELEGATION", confidence: "HIGH", evidence_phrase: "please" },
            ],
            primary_signal: "DELEGATION",
            multi_intent: true,
          },
        })}
      />,
    );
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    const block = screen.getByTestId("work-ledger-item-enrichment");
    expect(block.textContent).toContain("advisory");
    expect(block.textContent).toContain("2 signals");
    expect(block.textContent).toContain("multi-intent");
    expect(block.textContent?.toLowerCase()).toContain("delegation");
    expect(block.textContent).toContain("Foundation decides ownership and policy");
  });

  it("shows an honest 'not used' line when Python was not used", () => {
    render(
      <WorkLedgerItem
        entry={entry({
          extraction_source: "TYPESCRIPT_DETERMINISTIC",
          python_enrichment: {
            status: "PYTHON_NOT_CONFIGURED",
            signals: [],
            primary_signal: null,
            multi_intent: false,
          },
        })}
      />,
    );
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    const block = screen.getByTestId("work-ledger-item-enrichment");
    expect(block.textContent).toContain("not used");
    expect(block.textContent?.toLowerCase()).toContain("python not configured");
  });

  it("renders no enrichment block when enrichment never ran", () => {
    render(<WorkLedgerItem entry={entry({ extraction_source: "TYPESCRIPT_DETERMINISTIC" })} />);
    fireEvent.click(screen.getByTestId("work-ledger-item-view"));
    expect(screen.queryByTestId("work-ledger-item-enrichment")).toBeNull();
  });
});
