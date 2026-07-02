// FILE: tests/unit/blind-spot-triage.test.ts
// PURPOSE: PROD-UX — the blind-spot backlog is triaged, never an equal-
//          weight wall: human-needed routing lanes first (identity review >
//          blocked > setup > approval), oldest first inside a lane, silent
//          tail last, and items without a routing projection sort with the
//          tail (never above real attention).
import { describe, expect, it } from "vitest";
import { triageBlindSpots, TRIAGE_INITIAL_COUNT } from "@/lib/work-os/blind-spot-triage";
import type { RoutingLane, WorkLedgerEntryView } from "@/lib/types/foundation";

function entry(id: string, lane: RoutingLane | null, created: string): WorkLedgerEntryView {
  return {
    ledger_entry_id: id, ledger_type: "TASK", source_type: "TRANSCRIPT",
    source_command: null, work_plan_id: null, requester_entity_id: null,
    owner_entity_id: null, target_entity_id: null, title: id, status: "DETECTED",
    priority: "NORMAL", extraction_source: "LLM", next_action: null, due_at: null,
    created_at: created,
    ...(lane !== null
      ? {
          routing: {
            lane, reason: "x", risk: "low", confidence: null, policy_basis: null,
            owner_entity_id: null, owner_status: "unowned", next_best_action: null,
            required_tool: null, evidence_refs: [], audit_pointer: null,
          },
        }
      : {}),
  };
}

describe("blind-spot triage", () => {
  it("orders human-needed lanes first, silent tail last", () => {
    const out = triageBlindSpots([
      entry("silent", "silent_capture", "2026-06-01T00:00:00Z"),
      entry("draft", "draft_ready", "2026-06-01T00:00:00Z"),
      entry("blocked", "blocked", "2026-06-01T00:00:00Z"),
      entry("setup", "setup_required", "2026-06-01T00:00:00Z"),
      entry("identity", "identity_review", "2026-06-01T00:00:00Z"),
      entry("approval", "ask_approval", "2026-06-01T00:00:00Z"),
    ]).map((e) => e.ledger_entry_id);
    expect(out).toEqual(["identity", "blocked", "setup", "approval", "draft", "silent"]);
  });

  it("ties break oldest-first so nothing rots at the bottom", () => {
    const out = triageBlindSpots([
      entry("newer", "blocked", "2026-06-30T00:00:00Z"),
      entry("older", "blocked", "2026-06-01T00:00:00Z"),
    ]).map((e) => e.ledger_entry_id);
    expect(out).toEqual(["older", "newer"]);
  });

  it("missing routing sorts with the silent tail, never above attention", () => {
    const out = triageBlindSpots([
      entry("noRouting", null, "2026-05-01T00:00:00Z"),
      entry("setup", "setup_required", "2026-06-30T00:00:00Z"),
    ]).map((e) => e.ledger_entry_id);
    expect(out[0]).toBe("setup");
  });

  it("does not mutate the input and exposes a sane initial cap", () => {
    const input = [entry("a", "blocked", "2"), entry("b", "identity_review", "1")];
    const copy = [...input];
    triageBlindSpots(input);
    expect(input).toEqual(copy);
    expect(TRIAGE_INITIAL_COUNT).toBeGreaterThanOrEqual(10);
  });
});
