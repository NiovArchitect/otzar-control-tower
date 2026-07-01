// FILE: tests/unit/work-item-execution.test.ts
// PURPOSE: PROD-UX-P0A — the WorkLedger item execution view maps each state to the
//          MINIMAL correct actions (no dead/fake buttons; Otzar-can-handle only when
//          it truly can; approval is a status not a button here).
import { describe, expect, it } from "vitest";
import { deriveWorkItemExecution } from "../../src/lib/work-os/work-item-execution";
import type { WorkLedgerEntryView } from "../../src/lib/types/foundation";

function entry(over: Partial<WorkLedgerEntryView> = {}): WorkLedgerEntryView {
  return {
    ledger_entry_id: "led-1",
    ledger_type: "COMMITMENT",
    source_type: "TRANSCRIPT",
    source_command: null,
    work_plan_id: null,
    requester_entity_id: "u1",
    owner_entity_id: "u1",
    target_entity_id: null,
    title: "Post the launch note to the team channel",
    status: "PROPOSED",
    priority: "NORMAL",
    extraction_source: "LLM",
    next_action: null,
    due_at: null,
    created_at: "2026-07-01T00:00:00.000Z",
    ...over,
  } as WorkLedgerEntryView;
}

const slackPlan = { requiredConnector: "SLACK", executionMode: "otzar_can_execute_with_approval", executionType: "message" };

describe("deriveWorkItemExecution — minimal correct actions per state", () => {
  it("Otzar-can-handle: connector + execute-with-approval, unlinked, ready → ask_otzar", () => {
    const v = deriveWorkItemExecution(entry({ status: "READY_TO_EXECUTE", execution_plan: { ...slackPlan, capabilityState: "available_and_authorized" }, conversation_id: "c1" }));
    expect(v.state).toBe("otzar_can_handle");
    expect(v.connectorLabel).toBe("Slack");
    expect(v.actions).toContain("ask_otzar");
    expect(v.actions).toContain("open_source");
    expect(v.actions).toContain("view_why");
    expect(v.actions).not.toContain("mark_done");
  });

  it("blocked_setup: connector not connected → request_setup, never ask_otzar", () => {
    const v = deriveWorkItemExecution(entry({ status: "READY_TO_EXECUTE", execution_plan: { ...slackPlan, capabilityState: "not_connected" } }));
    expect(v.state).toBe("blocked_setup");
    expect(v.stateLabel).toMatch(/Slack/);
    expect(v.actions).toContain("request_setup");
    expect(v.actions).not.toContain("ask_otzar");
  });

  it("pending_approval: a governed Action is linked → status only, no ask/mark", () => {
    const v = deriveWorkItemExecution(entry({ status: "NEEDS_APPROVAL", proposed_action_id: "act-1", execution_plan: slackPlan }));
    expect(v.state).toBe("pending_approval");
    expect(v.hasLinkedAction).toBe(true);
    expect(v.actions).not.toContain("ask_otzar");
    expect(v.actions).not.toContain("mark_done");
    expect(v.actions).toContain("view_why");
  });

  it("executed: connector write done → view_receipt", () => {
    const v = deriveWorkItemExecution(entry({ status: "EXECUTED", proposed_action_id: "act-1", execution_plan: slackPlan }));
    expect(v.state).toBe("executed");
    expect(v.actions).toContain("view_receipt");
    expect(v.stateLabel).toMatch(/Done/);
  });

  it("human task: no connector, caller can complete → mark_done + add_update", () => {
    const v = deriveWorkItemExecution(entry({ status: "PROPOSED", execution_plan: { executionMode: "human_must_do", executionType: "human_task" }, can_complete: true }));
    expect(v.state).toBe("human_task");
    expect(v.actions).toContain("mark_done");
    expect(v.actions).toContain("add_update");
    expect(v.actions).not.toContain("ask_otzar");
  });

  it("needs_owner: unconfirmed owner → no execute/mark buttons, just review", () => {
    const v = deriveWorkItemExecution(entry({ status: "NEEDS_OWNER" }));
    expect(v.state).toBe("needs_owner");
    expect(v.actions).not.toContain("ask_otzar");
    expect(v.actions).not.toContain("mark_done");
  });

  it("every state exposes view_why and never a dead ask_otzar", () => {
    for (const s of ["PROPOSED", "EXECUTED", "BLOCKED", "NEEDS_APPROVAL", "NEEDS_OWNER"]) {
      const v = deriveWorkItemExecution(entry({ status: s }));
      expect(v.actions).toContain("view_why");
      if (v.state !== "otzar_can_handle") expect(v.actions).not.toContain("ask_otzar");
    }
  });
});
