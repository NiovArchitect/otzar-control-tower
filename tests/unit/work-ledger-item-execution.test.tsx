// FILE: tests/unit/work-ledger-item-execution.test.tsx
// PURPOSE: PROD-UX-P0A — the WorkLedger item surfaces the governed execution loop
//          and its actions are real (no dead/fake buttons): "Ask Otzar to handle"
//          promotes to a governed Action; an executed item shows its real receipt;
//          a blocked item shows the setup state and offers NO ask button.
import { describe, expect, it, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../msw/server";
import { MemoryRouter } from "react-router-dom";
import { WorkLedgerItem } from "@/components/work-os/WorkLedgerItem";
import { useAuthStore } from "@/lib/stores/auth";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";

const API_BASE = "http://localhost:3000/api/v1";

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "vishesh@niovlabs.com" },
    isAuthenticated: true,
    capabilities: { can_read_capsules: true, can_write_capsules: true, can_share_capsules: true, can_admin_org: false, can_admin_niov: false },
  });
});

function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-1", ledger_type: "COMMITMENT", source_type: "TRANSCRIPT",
    source_command: null, work_plan_id: null, requester_entity_id: "u1", owner_entity_id: "u1",
    target_entity_id: null, title: "Post the launch note", status: "READY_TO_EXECUTE",
    priority: "NORMAL", extraction_source: "LLM", next_action: null, due_at: null,
    created_at: "2026-07-01T00:00:00.000Z",
    execution_plan: { requiredConnector: "SLACK", executionMode: "otzar_can_execute_with_approval", executionType: "message", capabilityState: "available_and_authorized" },
    ...over,
  };
}

describe("WorkLedgerItem — governed execution actions (P0A)", () => {
  it("Otzar-can-handle: shows 'Ask Otzar to handle' and promoting routes for approval", async () => {
    let executed = false;
    server.use(
      http.post(`${API_BASE}/work-os/ledger/led-1/execute`, () => {
        executed = true;
        return HttpResponse.json({ ok: true, outcome: "action_created", action_id: "act-1", action_status: "PROPOSED", ledger_status: "NEEDS_APPROVAL" });
      }),
    );
    render(<MemoryRouter><WorkLedgerItem entry={entry()} /></MemoryRouter>);
    expect(screen.getByTestId("work-ledger-item-exec-state")).toHaveAttribute("data-exec-state", "otzar_can_handle");
    const ask = screen.getByTestId("work-ledger-item-ask-otzar");
    expect(screen.queryByTestId("work-ledger-item-receipt")).toBeNull();
    await userEvent.click(ask);
    await waitFor(() => expect(executed).toBe(true));
    expect(await screen.findByTestId("work-ledger-item-exec-msg")).toHaveTextContent(/routed for approval/i);
  });

  it("blocked setup: shows the setup state and offers NO ask button", () => {
    render(<MemoryRouter><WorkLedgerItem entry={entry({ execution_plan: { requiredConnector: "SLACK", executionMode: "otzar_can_execute_with_approval", capabilityState: "not_connected" } })} /></MemoryRouter>);
    const chip = screen.getByTestId("work-ledger-item-exec-state");
    expect(chip).toHaveAttribute("data-exec-state", "blocked_setup");
    expect(chip).toHaveTextContent(/Slack/);
    expect(screen.queryByTestId("work-ledger-item-ask-otzar")).toBeNull();
    // PROD-UX — setup_required deep-links to the setup surface (the wire
    // the smoke matrix flagged as missing).
    const setup = screen.getByTestId("work-ledger-item-request-setup");
    expect(setup).toHaveAttribute("href", "/tools-connections");
    expect(setup).toHaveTextContent(/Connect Slack/);
  });

  it("executed: shows a real receipt (channel + ts), not a fabricated one", async () => {
    server.use(
      http.get(`${API_BASE}/actions/act-1/attempts`, () =>
        HttpResponse.json({
          ok: true,
          attempts: [{ outcome: "SUCCEEDED", result_metadata: { connector_type: "SLACK_WRITE", delivery_metadata: { provider: "SlackWriteProvider", mode: "real", channel: "C090K5KGS6B", ts: "1782924452.082959", permalink: "https://slack.example/p1" } } }],
        }),
      ),
    );
    render(<MemoryRouter><WorkLedgerItem entry={entry({ status: "EXECUTED", proposed_action_id: "act-1" })} /></MemoryRouter>);
    expect(screen.getByTestId("work-ledger-item-exec-state")).toHaveAttribute("data-exec-state", "executed");
    expect(screen.queryByTestId("work-ledger-item-ask-otzar")).toBeNull();
    await userEvent.click(screen.getByTestId("work-ledger-item-receipt"));
    const panel = await screen.findByTestId("work-ledger-item-receipt-panel");
    await waitFor(() => expect(panel).toHaveTextContent(/C090K5KGS6B/));
    expect(panel).toHaveTextContent(/1782924452\.082959/);
  });
});
