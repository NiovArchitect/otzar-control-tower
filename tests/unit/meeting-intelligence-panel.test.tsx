// FILE: tests/unit/meeting-intelligence-panel.test.tsx
// PURPOSE: Phase 1286-C — locks the read-only MeetingIntelligencePanel: renders
//          summary + grouped sections (decisions / action items / blockers+risks
//          / open questions / follow-ups) when present, renders NOTHING when
//          absent or empty, truncates long lists, shows the advisory label, never
//          implies it created tasks, and surfaces on a WorkLedgerItem only when
//          the row carries it. No raw UUID labels.
// CONNECTS TO: src/components/work-os/MeetingIntelligencePanel.tsx +
//          src/components/work-os/WorkLedgerItem.tsx.

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MeetingIntelligencePanel } from "@/components/work-os/MeetingIntelligencePanel";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import type { MeetingIntelligenceView, WorkLedgerEntryView } from "@/lib/types/foundation";

function mi(over: Partial<MeetingIntelligenceView> = {}): MeetingIntelligenceView {
  return {
    status: "PYTHON_ENRICHED",
    authority: "FOUNDATION_VALIDATED",
    capability: "MEETING_INTELLIGENCE",
    summary: "Launch follow-up meeting.",
    candidates: [
      { candidate_type: "DECISION", text: "Go with the new onboarding copy.", confidence: "HIGH" },
      { candidate_type: "ACTION_ITEM", text: "David to review the UI flow by Friday.", confidence: "HIGH" },
      { candidate_type: "BLOCKER", text: "Blocked on compliance sign-off.", confidence: "MEDIUM" },
      { candidate_type: "RISK", text: "Launch date may slip.", confidence: "LOW" },
      { candidate_type: "OPEN_QUESTION", text: "Do we need legal to approve the date?", confidence: "MEDIUM" },
      { candidate_type: "FOLLOW_UP", text: "Circle back next week.", confidence: "LOW" },
    ],
    ...over,
  };
}

describe("MeetingIntelligencePanel — render only when present", () => {
  it("renders the summary and an advisory label when validated", () => {
    render(<MeetingIntelligencePanel data={mi()} />);
    expect(screen.getByTestId("meeting-intelligence-panel")).toBeInTheDocument();
    expect(screen.getByTestId("mi-summary").textContent).toContain("Launch follow-up meeting.");
    expect(screen.getByTestId("mi-advisory-label").textContent).toBe("Advisory (Python)");
    expect(screen.getByTestId("mi-provenance").textContent).toMatch(/did not create tasks or send anything/i);
  });

  it("expands into grouped sections with candidate text", async () => {
    render(<MeetingIntelligencePanel data={mi()} />);
    await userEvent.click(screen.getByTestId("mi-toggle"));
    const sections = screen.getByTestId("mi-sections");
    expect(within(sections).getByText(/Go with the new onboarding copy/)).toBeInTheDocument();
    expect(within(sections).getByText(/David to review the UI flow by Friday/)).toBeInTheDocument();
    expect(within(sections).getByText(/Blocked on compliance sign-off/)).toBeInTheDocument();
    expect(within(sections).getByText(/Do we need legal to approve the date/)).toBeInTheDocument();
    const labels = screen.getAllByTestId("mi-section").map((n) => n.getAttribute("data-section"));
    expect(labels).toEqual(expect.arrayContaining(["Decisions", "Action items", "Blockers / risks", "Open questions", "Follow-ups"]));
  });

  it("renders NOTHING when data is absent", () => {
    const { container } = render(<MeetingIntelligencePanel data={undefined} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("meeting-intelligence-panel")).toBeNull();
  });

  it("renders NOTHING when there is no summary and no candidates", () => {
    const { container } = render(<MeetingIntelligencePanel data={mi({ summary: null, candidates: [] })} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the summary safely when candidates is an empty array", () => {
    render(<MeetingIntelligencePanel data={mi({ candidates: [] })} />);
    expect(screen.getByTestId("mi-summary")).toBeInTheDocument();
    expect(screen.queryByTestId("mi-counts")).toBeNull();
  });

  it("truncates a long section and shows a +N more note", async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ candidate_type: "DECISION", text: `Decision ${i}`, confidence: "HIGH" }));
    render(<MeetingIntelligencePanel data={mi({ candidates: many })} />);
    await userEvent.click(screen.getByTestId("mi-toggle"));
    const decisions = screen.getAllByTestId("mi-section").find((n) => n.getAttribute("data-section") === "Decisions")!;
    expect(within(decisions).getByText("+3 more")).toBeInTheDocument(); // 8 - 5 shown
  });

  it("labels generic 'Advisory' when not Python-validated", () => {
    render(<MeetingIntelligencePanel data={mi({ authority: null, status: "FOUNDATION_DOWNGRADED" })} />);
    expect(screen.getByTestId("mi-advisory-label").textContent).toBe("Advisory");
  });
});

describe("MeetingIntelligencePanel — surfaced on WorkLedgerItem only when present", () => {
  function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
    return {
      ledger_entry_id: "led-1",
      ledger_type: "MEETING",
      source_type: "MEETING_TRANSCRIPT",
      status: "PROPOSED",
      priority: "ROUTINE",
      title: "Launch sync",
      owner_entity_id: null,
      requester_entity_id: null,
      target_entity_id: null,
      ...over,
    } as WorkLedgerEntryView;
  }

  it("shows the panel on a Work Ledger item that carries meeting intelligence", () => {
    render(<WorkLedgerItem entry={entry({ meeting_intelligence: mi() })} />);
    expect(screen.getByTestId("meeting-intelligence-panel")).toBeInTheDocument();
    // The title is the primary label; the entry id is never shown as one.
    expect(screen.getByTestId("work-ledger-item").textContent).not.toContain("led-1");
  });

  it("renders normally (no panel) on a Work Ledger item without meeting intelligence", () => {
    render(<WorkLedgerItem entry={entry()} />);
    expect(screen.getByTestId("work-ledger-item")).toBeInTheDocument();
    expect(screen.queryByTestId("meeting-intelligence-panel")).toBeNull();
  });
});
