// FILE: tests/unit/work-ledger-item-routing.test.tsx
// PURPOSE: PROD-UX-P0R — the work item card renders the routing decision
//          Otzar made: one calm chip for non-silent lanes (with the reason
//          as its tooltip), NO chip for silent lanes (no card spam), and
//          the plain-language why (reason + risk + next step) inside the
//          opened View/Why detail. Items without a routing projection
//          (older payloads) render exactly as before.
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { useAuthStore } from "@/lib/stores/auth";
import type {
  RoutingDecisionView,
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

function routing(over: Partial<RoutingDecisionView> = {}): RoutingDecisionView {
  return {
    lane: "ask_approval",
    reason: "Needs your approval before Otzar posts to Slack — outside writes always get a person's sign-off first.",
    risk: "high",
    confidence: 0.9,
    policy_basis: null,
    owner_entity_id: "u1",
    owner_status: "resolved",
    next_best_action: "Approve or edit the draft",
    required_tool: "SLACK",
    evidence_refs: [],
    audit_pointer: null,
    ...over,
  };
}

function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-1", ledger_type: "COMMITMENT", source_type: "TRANSCRIPT",
    source_command: null, work_plan_id: null, requester_entity_id: "u1", owner_entity_id: "u1",
    target_entity_id: null, title: "Post the launch note", status: "PROPOSED",
    priority: "NORMAL", extraction_source: "LLM", next_action: null, due_at: null,
    created_at: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

describe("WorkLedgerItem — routing decision surface (P0R)", () => {
  it("a non-silent lane renders one calm chip with the reason as its tooltip", () => {
    render(<WorkLedgerItem entry={entry({ routing: routing() })} />);
    const chip = screen.getByTestId("work-ledger-item-routing-lane");
    expect(chip).toHaveTextContent("Needs your approval");
    expect(chip).toHaveAttribute("data-lane", "ask_approval");
    expect(chip).toHaveAttribute("title", expect.stringContaining("sign-off"));
  });

  it("silent lanes render NO chip — calm by design", () => {
    render(
      <WorkLedgerItem
        entry={entry({
          routing: routing({ lane: "silent_routing", risk: "low", reason: "Tracked and routed to its owner — nothing is needed from you right now." }),
        })}
      />,
    );
    expect(screen.queryByTestId("work-ledger-item-routing-lane")).toBeNull();
  });

  it("the opened detail shows the routing why: reason + risk + next step", async () => {
    render(<WorkLedgerItem entry={entry({ routing: routing() })} />);
    await userEvent.click(screen.getByTestId("work-ledger-item-view"));
    const why = await screen.findByTestId("work-ledger-item-routing-why");
    expect(why).toHaveTextContent(/Needs your approval before Otzar posts to Slack/);
    expect(why).toHaveTextContent(/High risk — a person stays in the loop/);
    expect(why).toHaveTextContent(/Next: Approve or edit the draft/);
  });

  it("silent lanes still explain themselves inside View/Why", async () => {
    render(
      <WorkLedgerItem
        entry={entry({
          routing: routing({ lane: "silent_capture", risk: "low", reason: "Captured for the record — nothing needs to happen.", next_best_action: null }),
        })}
      />,
    );
    await userEvent.click(screen.getByTestId("work-ledger-item-view"));
    const why = await screen.findByTestId("work-ledger-item-routing-why");
    expect(why).toHaveTextContent(/Captured for the record/);
    expect(why).toHaveTextContent(/Low risk/);
  });

  it("an item without a routing projection renders no chip and no routing why", async () => {
    render(<WorkLedgerItem entry={entry()} />);
    expect(screen.queryByTestId("work-ledger-item-routing-lane")).toBeNull();
    await userEvent.click(screen.getByTestId("work-ledger-item-view"));
    expect(screen.queryByTestId("work-ledger-item-routing-why")).toBeNull();
  });
});

// PROD-UX-VIS-C — the card face says WHO owns it, pronoun-guarded.
describe("WorkLedgerItem — ownership on the card face (VIS-C)", () => {
  it("shows 'Owned by <name>' when the enriched name is a real name", () => {
    render(
      <WorkLedgerItem entry={entry({ owner_display_name: "David Odie" })} />,
    );
    expect(screen.getByTestId("work-ledger-item-owner")).toHaveTextContent(
      "Owned by David Odie",
    );
  });

  it("a pronoun-ish owner renders the review copy, never 'Owned by his'", () => {
    render(<WorkLedgerItem entry={entry({ owner_display_name: "his" })} />);
    expect(screen.getByTestId("work-ledger-item-owner")).toHaveTextContent(
      /Owner needs review/,
    );
  });

  it("no enriched owner name → no owner fragment (no fake ownership)", () => {
    render(<WorkLedgerItem entry={entry()} />);
    expect(screen.queryByTestId("work-ledger-item-owner")).toBeNull();
  });
});
