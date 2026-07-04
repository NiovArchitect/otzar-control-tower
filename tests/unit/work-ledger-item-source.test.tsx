// FILE: tests/unit/work-ledger-item-source.test.tsx
// PURPOSE: [GAP-J] quiet-by-default source lineage. The card face shows at
//          most ONE calm muted source fragment ("From Slack") and ONLY for a
//          known system — unknown or missing lineage renders NOTHING on the
//          card (silence, not clutter; the honest state lives in the Why
//          panel). Raw backend tokens (SLACK / CONNECTOR / dedupe keys /
//          source ids) never appear as card copy.
// CONNECTS TO: src/lib/labels/source-lineage.ts,
//              src/components/work-os/WorkLedgerItem.tsx,
//              src/lib/work-os/view-why.ts (Why rows locked in view-why.test).
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { useAuthStore } from "@/lib/stores/auth";
import {
  sourceLineageLabel,
  sourceLineageWhyValue,
} from "@/lib/labels/source-lineage";
import type {
  SourceLineageView,
  WorkLedgerEntryView,
} from "@/lib/types/foundation";

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "vishesh@niovlabs.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: true, can_admin_org: false, can_admin_niov: false },
  });
});

function lineage(over: Partial<SourceLineageView> = {}): SourceLineageView {
  return {
    source_system: "SLACK",
    source_id_present: true,
    has_source_excerpt: true,
    source_actor: "Sadeil Lewis",
    source_timestamp: "2026-07-03T12:00:00.000Z",
    ...over,
  };
}

function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-1", ledger_type: "COMMITMENT", source_type: "CONNECTOR",
    source_command: null, work_plan_id: null, requester_entity_id: "u1", owner_entity_id: "u1",
    target_entity_id: null, title: "Grant the repo access", status: "PROPOSED",
    priority: "NORMAL", extraction_source: "LLM", next_action: null, due_at: null,
    created_at: "2026-07-03T00:00:00.000Z",
    ...over,
  };
}

describe("[GAP-J] source lineage labels — one human map, honest fallbacks", () => {
  it("maps the wired systems to calm customer copy", () => {
    expect(sourceLineageLabel(lineage())).toBe("From Slack");
    expect(sourceLineageLabel(lineage({ source_system: "ZOOM" }))).toBe("From Zoom recording");
    expect(sourceLineageLabel(lineage({ source_system: "TRANSCRIPT" }))).toBe("From Comms transcript");
  });

  it("unknown / missing lineage → null on the card path, honest copy on the Why path", () => {
    expect(sourceLineageLabel(undefined)).toBeNull();
    expect(sourceLineageLabel(null)).toBeNull();
    expect(sourceLineageLabel(lineage({ source_system: "SOME_FUTURE_TOOL" }))).toBeNull();
    expect(sourceLineageWhyValue(undefined)).toBe("Source not recorded yet");
    expect(sourceLineageWhyValue(lineage({ source_system: "SOME_FUTURE_TOOL" }))).toBe(
      "Source not recorded yet",
    );
    expect(sourceLineageWhyValue(lineage())).toBe("From Slack");
  });
});

// ── [T-1] external-party context — context, not CRM ──
describe("[T-1] WorkLedgerItem — external context fragment", () => {
  it("renders ONE calm fragment when a deterministic link proved external context", () => {
    render(
      <WorkLedgerItem
        entry={entry({
          external_context: {
            external_party_type: "client",
            external_org_label: "Acme",
            external_person_label: "Jordan Vale",
            relationship_label: "Client",
            safe_context_label: "Waiting on Acme",
            waiting_direction: "they_owe_us",
            source: "external_commitment",
          },
        })}
      />,
    );
    const el = screen.getByTestId("work-ledger-item-external");
    expect(el.textContent).toContain("Waiting on Acme");
    // No raw enums or machine tokens as card copy.
    expect(el.textContent).not.toMatch(/EXTERNAL_OWES|external_commitment/);
  });

  it("no external context → SILENCE (no fragment, no CRM chrome)", () => {
    render(<WorkLedgerItem entry={entry()} />);
    expect(screen.queryByTestId("work-ledger-item-external")).toBeNull();
  });
});

describe("[GAP-J] WorkLedgerItem card face — quiet by default", () => {
  it("a Slack-origin row shows ONE calm muted fragment: From Slack", () => {
    render(<WorkLedgerItem entry={entry({ source_lineage: lineage() })} />);
    const el = screen.getByTestId("work-ledger-item-source");
    expect(el.textContent).toContain("From Slack");
    // Raw backend tokens never appear as card copy.
    expect(el.textContent).not.toContain("SLACK");
    expect(el.textContent).not.toContain("CONNECTOR");
  });

  it("a row without recorded lineage shows NOTHING extra on the card face", () => {
    render(<WorkLedgerItem entry={entry()} />);
    expect(screen.queryByTestId("work-ledger-item-source")).toBeNull();
  });

  it("an unmapped source system stays silent on the card — never a raw token", () => {
    render(
      <WorkLedgerItem
        entry={entry({ source_lineage: lineage({ source_system: "SOME_FUTURE_TOOL" }) })}
      />,
    );
    expect(screen.queryByTestId("work-ledger-item-source")).toBeNull();
    expect(screen.queryByText(/SOME_FUTURE_TOOL/)).toBeNull();
  });
});
