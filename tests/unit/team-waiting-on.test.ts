// FILE: team-waiting-on.test.ts
// PURPOSE: Phase 1285-G — the Team Work "Waiting on team" panel derives
//          directional relationship state from REAL Work Ledger entries only.
//          These lock the filter (active directional asks), the grouping (by
//          owner, with names), and the honest age formatting.
// CONNECTS TO: src/lib/work-os/team-waiting-on.ts

import { describe, expect, it } from "vitest";
import {
  isWaitingOnItem,
  groupWaitingByOwner,
  ageOf,
} from "@/lib/work-os/team-waiting-on";
import type { WorkLedgerEntryView } from "@/lib/types/foundation";

function entry(over: Partial<WorkLedgerEntryView>): WorkLedgerEntryView {
  return {
    ledger_entry_id: "l1",
    org_entity_id: "org",
    ledger_type: "TASK",
    source_type: "CHAT",
    source_command: null,
    conversation_id: null,
    work_plan_id: null,
    project_id: null,
    requester_entity_id: "sadeil",
    owner_entity_id: "david",
    target_entity_id: "david",
    title: "Send the proof-layer notes",
    summary: null,
    priority: "ROUTINE",
    status: "PROPOSED",
    authority_decision: null,
    policy_reason_code: null,
    extraction_source: "DETERMINISTIC",
    confidence_score: null,
    evidence: null,
    next_action: null,
    due_at: null,
    created_at: "2026-06-16T00:00:00.000Z",
    updated_at: "2026-06-16T00:00:00.000Z",
    verified_at: null,
    ...over,
  } as WorkLedgerEntryView;
}

describe("isWaitingOnItem", () => {
  it("an active directional TASK (requester != owner) is waiting-on", () => {
    expect(isWaitingOnItem(entry({}))).toBe(true);
  });
  it("a completed (EXECUTED) ask drops out", () => {
    expect(isWaitingOnItem(entry({ status: "EXECUTED" }))).toBe(false);
    expect(isWaitingOnItem(entry({ status: "VERIFIED" }))).toBe(false);
    expect(isWaitingOnItem(entry({ status: "CANCELLED" }))).toBe(false);
  });
  it("a self-owned item (requester == owner) is NOT waiting-on", () => {
    expect(isWaitingOnItem(entry({ owner_entity_id: "sadeil" }))).toBe(false);
  });
  it("a non-directional type (e.g. MEETING/NOTIFICATION) is NOT waiting-on", () => {
    expect(isWaitingOnItem(entry({ ledger_type: "MEETING" }))).toBe(false);
    expect(isWaitingOnItem(entry({ ledger_type: "NOTIFICATION" }))).toBe(false);
  });
  it("missing owner or requester is NOT waiting-on", () => {
    expect(isWaitingOnItem(entry({ owner_entity_id: null }))).toBe(false);
    expect(isWaitingOnItem(entry({ requester_entity_id: null }))).toBe(false);
  });
});

describe("groupWaitingByOwner", () => {
  it("groups active asks by owner and carries the owner display name", () => {
    const groups = groupWaitingByOwner([
      entry({ ledger_entry_id: "a", owner_entity_id: "david", owner_display_name: "David Odie" }),
      entry({ ledger_entry_id: "b", owner_entity_id: "david", owner_display_name: "David Odie" }),
      entry({ ledger_entry_id: "c", owner_entity_id: "sami", owner_display_name: "Samiksha Sharma" }),
      entry({ ledger_entry_id: "d", owner_entity_id: "david", status: "EXECUTED" }), // dropped
    ]);
    expect(groups).toHaveLength(2);
    const david = groups.find((g) => g.owner_entity_id === "david")!;
    expect(david.name).toBe("David Odie");
    expect(david.items.map((i) => i.ledger_entry_id)).toEqual(["a", "b"]);
    const sami = groups.find((g) => g.owner_entity_id === "sami")!;
    expect(sami.name).toBe("Samiksha Sharma");
  });
  it("falls back to the canonical label (never a raw UUID) when unresolved", () => {
    // No owner_display_name set on the entry (server didn't resolve it).
    const groups = groupWaitingByOwner([entry({})]);
    expect(groups[0]!.name).toBe("Unknown entity");
    expect(groups[0]!.name).not.toBe(groups[0]!.owner_entity_id);
  });
});

describe("ageOf", () => {
  const base = Date.parse("2026-06-16T12:00:00.000Z");
  it("formats minutes / hours / days / just-now", () => {
    expect(ageOf("2026-06-16T11:59:30.000Z", base)).toBe("just now");
    expect(ageOf("2026-06-16T11:30:00.000Z", base)).toBe("30m");
    expect(ageOf("2026-06-16T09:00:00.000Z", base)).toBe("3h");
    expect(ageOf("2026-06-13T12:00:00.000Z", base)).toBe("3d");
  });
  it("returns empty for an unparseable timestamp", () => {
    expect(ageOf("not-a-date", base)).toBe("");
  });
});
