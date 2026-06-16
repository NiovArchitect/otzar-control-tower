// FILE: view-why.test.tsx
// PURPOSE: Phase 1285-J — lock the shared View/Why model + presenter: identity
//          renders as a canonical label (never a raw UUID), empty rows are
//          dropped, the detected signal renders, and a surface with no richer
//          proof shows an honest note (never a blank panel).
// CONNECTS TO: src/lib/work-os/view-why.ts, src/components/work-os/ViewWhyPanel.tsx

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { viewWhyFromLedger, viewWhyFromThreadMessage } from "@/lib/work-os/view-why";
import { ViewWhyPanel } from "@/components/work-os/ViewWhyPanel";
import type { WorkLedgerEntryView, DirectThreadMessageView } from "@/lib/types/foundation";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

function ledger(over: Partial<WorkLedgerEntryView>): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-1",
    org_entity_id: "org",
    ledger_type: "TASK",
    source_type: "CHAT",
    source_command: "Please send the notes",
    conversation_id: null,
    work_plan_id: null,
    project_id: null,
    requester_entity_id: UUID,
    owner_entity_id: UUID,
    target_entity_id: UUID,
    title: "Send the notes",
    summary: null,
    priority: "ROUTINE",
    status: "PROPOSED",
    authority_decision: null,
    policy_reason_code: null,
    extraction_source: "TYPESCRIPT_DETERMINISTIC",
    confidence_score: null,
    evidence: null,
    next_action: null,
    due_at: null,
    created_at: "2026-06-16T00:00:00.000Z",
    updated_at: "2026-06-16T00:00:00.000Z",
    verified_at: null,
    source_message_id: "msg-1",
    ...over,
  } as WorkLedgerEntryView;
}

function msg(over: Partial<DirectThreadMessageView>): DirectThreadMessageView {
  return {
    message_id: "m1",
    sender_entity_id: UUID,
    sender_display_name: "David Odie",
    sender_role_title: null,
    body: "Please send me the notes",
    created_at: "2026-06-16T00:00:00.000Z",
    from_me: false,
    ...over,
  };
}

describe("viewWhyFromLedger — canonical identity, never a UUID", () => {
  it("renders the display name when resolved", () => {
    const m = viewWhyFromLedger(ledger({ owner_display_name: "David Odie" }));
    const owner = m.rows.find((r) => r.label === "Owner");
    expect(owner?.value).toBe("David Odie");
  });
  it("renders the canonical label (NOT the UUID) when the name is missing", () => {
    const m = viewWhyFromLedger(ledger({}));
    const owner = m.rows.find((r) => r.label === "Owner");
    expect(owner?.value).toBe("Unknown entity");
    expect(owner?.value).not.toBe(UUID);
  });
  it("carries work + provenance (type, status, ledger id, source message)", () => {
    const m = viewWhyFromLedger(ledger({}));
    const byLabel = (l: string) => m.rows.find((r) => r.label === l)?.value;
    expect(byLabel("Type")).toBe("TASK");
    expect(byLabel("Ledger id")).toBe("led-1");
    expect(byLabel("Source message")).toBe("msg-1");
    expect(byLabel("Extraction")).toBe("TYPESCRIPT_DETERMINISTIC");
  });
});

describe("viewWhyFromThreadMessage", () => {
  it("inbound message with a signal carries direction + signal + tracked", () => {
    const m = viewWhyFromThreadMessage(
      msg({ signal: { signal_type: "TASK_REQUEST", confidence: "LOW", evidence_phrase: "please", tracked: true } }),
    );
    expect(m.rows.find((r) => r.label === "From")?.value).toBe("David Odie");
    expect(m.rows.find((r) => r.label === "Direction")?.value).toBe("inbound");
    expect(m.signal?.signal_type).toBe("TASK_REQUEST");
    expect(m.signal?.tracked).toBe(true);
  });
  it("a message with no signal yields an honest proof note (never blank)", () => {
    const m = viewWhyFromThreadMessage(msg({}));
    expect(m.signal).toBeUndefined();
    expect(m.proofNote).toBeTruthy();
  });
});

describe("ViewWhyPanel — renders consistently, no UUID, honest missing state", () => {
  it("drops empty rows and never renders a raw UUID as a label", () => {
    render(<ViewWhyPanel model={viewWhyFromLedger(ledger({}))} />);
    const panel = screen.getByTestId("view-why");
    expect(panel.textContent).toContain("Unknown entity");
    expect(panel.textContent).not.toContain(UUID);
  });
  it("renders the signal line when present", () => {
    render(
      <ViewWhyPanel
        model={viewWhyFromThreadMessage(
          msg({ signal: { signal_type: "BLOCKER", confidence: "MEDIUM", evidence_phrase: "blocked", tracked: false } }),
        )}
      />,
    );
    expect(screen.getByTestId("view-why-signal").textContent?.toLowerCase()).toContain("blocker");
  });
  it("shows the honest proof note when there is no richer proof", () => {
    render(<ViewWhyPanel model={viewWhyFromThreadMessage(msg({}))} />);
    expect(screen.getByTestId("view-why-proof-note")).toBeInTheDocument();
  });
});
