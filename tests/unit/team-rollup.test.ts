// FILE: tests/unit/team-rollup.test.ts
// PURPOSE: CX-SLICE-1 — the manager rollup contract: per-direct-report
//          counts from REAL manager edges (stable ids; email-resolved
//          caller), honest attention buckets from lanes+statuses, a
//          no-manager fallback (null section, never invented reports),
//          and an explicit coverage note under pagination.
import { describe, expect, it } from "vitest";
import { buildTeamRollup } from "@/lib/work-os/team-rollup";
import type { Entity, EntityMembership, WorkLedgerEntryView } from "@/lib/types/foundation";

const ORG = "org-1";
function person(id: string, name: string, email: string): Entity {
  return { entity_id: id, entity_type: "PERSON", display_name: name, email, status: "ACTIVE", created_at: "x", updated_at: "x" } as Entity;
}
function edge(parent: string, child: string): EntityMembership {
  return { membership_id: `${parent}-${child}`, parent_id: parent, child_id: child, role_title: null, department: null, hierarchy_level: 0, is_admin: false, is_active: true, created_at: "x" };
}
function entry(id: string, over: Partial<WorkLedgerEntryView>): WorkLedgerEntryView {
  return {
    ledger_entry_id: id, ledger_type: "TASK", source_type: "TRANSCRIPT", source_command: null,
    work_plan_id: null, requester_entity_id: null, owner_entity_id: null, target_entity_id: null,
    title: id, status: "DETECTED", priority: "NORMAL", extraction_source: "LLM",
    next_action: null, due_at: null, created_at: "2026-07-01T00:00:00Z", ...over,
  };
}
const lane = (l: string) => ({ routing: { lane: l, reason: "x", risk: "low", confidence: null, policy_basis: null, owner_entity_id: null, owner_status: "unowned", next_best_action: null, required_tool: null, evidence_refs: [], audit_pointer: null } }) as Partial<WorkLedgerEntryView>;

const PEOPLE = [person("mgr", "Dana Manager", "dana@x.test"), person("r1", "Riley", "riley@x.test"), person("r2", "Sam", "sam@x.test")];
const EDGES = [edge(ORG, "mgr"), edge(ORG, "r1"), edge(ORG, "r2"), edge("mgr", "r1"), edge("mgr", "r2")];

describe("team-rollup — buildTeamRollup", () => {
  it("rolls up per direct report from manager edges (busiest first)", () => {
    const r = buildTeamRollup({
      entries: [
        entry("a", { owner_entity_id: "r1" }),
        entry("b", { owner_entity_id: "r1", status: "BLOCKED", ...lane("blocked") }),
        entry("c", { owner_entity_id: "r2", status: "NEEDS_APPROVAL", ...lane("ask_approval") }),
        entry("d", { owner_entity_id: "r1", status: "EXECUTED" }),
      ],
      callerEmail: "Dana@X.test", // case-insensitive resolution
      people: PEOPLE, memberships: EDGES, orgEntityId: ORG, hasMore: false,
    });
    expect(r.directReports).not.toBeNull();
    expect(r.directReports![0]).toMatchObject({ name: "Riley", open: 2, blocked: 1 });
    expect(r.directReports![1]).toMatchObject({ name: "Sam", approvals: 1 });
    expect(r.recentlyCompleted).toBe(1);
    expect(r.approvalsNeeded).toBe(1);
    expect(r.coverage).toBeNull();
  });

  it("no manager edges → null direct-report section (never invented)", () => {
    const r = buildTeamRollup({
      entries: [entry("a", {})],
      callerEmail: "riley@x.test", // an IC, not a manager
      people: PEOPLE, memberships: EDGES, orgEntityId: ORG, hasMore: false,
    });
    expect(r.directReports).toBeNull();
  });

  it("unowned/escalated counts NEEDS_OWNER, identity lanes, and ownerless open work", () => {
    const r = buildTeamRollup({
      entries: [
        entry("a", { status: "NEEDS_OWNER" }),
        entry("b", { ...lane("identity_review") }),
        entry("c", { owner_entity_id: null }),
        entry("d", { owner_entity_id: null, status: "EXECUTED" }), // completed: not unowned-open
      ],
      callerEmail: null, people: [], memberships: [], orgEntityId: null, hasMore: false,
    });
    expect(r.unownedOrEscalated).toBe(3);
  });

  it("pagination coverage is stated honestly", () => {
    const r = buildTeamRollup({
      entries: [entry("a", {}), entry("b", {})],
      callerEmail: null, people: [], memberships: [], orgEntityId: null, hasMore: true,
    });
    expect(r.coverage).toMatch(/first 2 items/);
  });
});
