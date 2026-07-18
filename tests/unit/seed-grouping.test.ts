// FILE: tests/unit/seed-grouping.test.ts
// PURPOSE: PROD-UX-P0E — Organization Seeding groups duplicate suggestions by
//          person/target into prioritized queues (no 75-card wall; scales to
//          enterprise). Pure grouping logic proof.
import { describe, expect, it } from "vitest";
import { groupSeeds, seedKey, SEED_QUEUES } from "../../src/lib/work-os/seed-grouping";
import type { OrgSeed } from "../../src/lib/types/foundation";

function seed(over: Partial<OrgSeed>): OrgSeed {
  return {
    seed_id: Math.random().toString(36).slice(2),
    seed_type: "confirm_or_activate_person",
    subject_name: "David",
    subject_entity_id: null,
    subject_key: "name:david",
    recommended_action: "Confirm or activate David",
    source_evidence: "David will own the launch",
    source_conversation_id: "conv-1",
    confidence: "medium",
    approval_required: true,
    policy_status: "needs_review",
    sensitivity: "internal",
    risk_if_ignored: null,
    status: "SEED_PROPOSED",
    resulting_action: null,
    rejection_reason: null,
    hold_reason: null,
    reviewed: false,
    created_at: "2026-07-01T00:00:00.000Z",
    ...over,
  };
}

describe("seed-grouping — duplicate people collapse into one grouped queue", () => {
  it("five 'David' seeds become ONE group of 5 in People to review", () => {
    const g = groupSeeds([
      seed({ source_conversation_id: "c1" }),
      seed({ source_conversation_id: "c2" }),
      seed({ source_conversation_id: "c3" }),
      seed({ source_conversation_id: "c1" }),
      seed({ source_conversation_id: "c4" }),
    ]);
    const people = g.queues.find((q) => q.def.id === "people_to_review");
    expect(people).toBeDefined();
    expect(people!.groups).toHaveLength(1);
    const david = people!.groups[0]!;
    expect(david.subject_name).toBe("David");
    expect(david.count).toBe(5);
    expect(david.source_count).toBe(4); // distinct source conversations
    expect(g.total_groups).toBe(1);
    expect(g.total_seeds).toBe(5);
  });

  it("distinct people are distinct groups (no over-merge)", () => {
    const g = groupSeeds([
      seed({ subject_name: "David", subject_key: "name:david" }),
      seed({ subject_name: "Dishant", subject_key: "name:dishant" }),
    ]);
    const people = g.queues.find((q) => q.def.id === "people_to_review")!;
    expect(people.groups).toHaveLength(2);
    expect(new Set(people.groups.map((x) => x.subject_name))).toEqual(new Set(["David", "Dishant"]));
  });

  it("routes tool, role, held and resolved seeds to the right queues", () => {
    const g = groupSeeds([
      seed({ subject_name: "David", subject_key: "name:david" }), // person → people_to_review
      seed({ subject_name: "Ada", subject_key: "name:ada", seed_type: "connector_setup", recommended_action: "Connect Slack" }),
      seed({ subject_name: "Bo", subject_key: "name:bo", seed_type: "confirm_support_role" }),
      seed({ subject_name: "Cy", subject_key: "name:cy", status: "SEED_HELD" }),
      seed({ subject_name: "Di", subject_key: "name:di", status: "SEED_APPROVED", reviewed: true }),
    ]);
    const ids = g.queues.map((q) => q.def.id);
    expect(ids).toContain("people_to_review");
    expect(ids).toContain("tool_setup");
    expect(ids).toContain("role_project_team");
    expect(ids).toContain("held");
    expect(ids).toContain("resolved");
    // empty queues are omitted
    expect(g.queues.every((q) => q.groups.length > 0)).toBe(true);
  });

  it("low-confidence person seeds go to Ambiguous identities", () => {
    const g = groupSeeds([seed({ subject_name: "Zeta", subject_key: "name:zeta", confidence: "low" })]);
    expect(g.queues.find((q) => q.def.id === "ambiguous_identity")!.groups).toHaveLength(1);
  });

  it("seedKey falls back to a stable key when subject_key is absent (older data)", () => {
    const stripKey = (s: OrgSeed): OrgSeed => {
      const { subject_key: _omit, ...rest } = s;
      return rest as OrgSeed;
    };
    expect(seedKey(stripKey(seed({ subject_entity_id: null, subject_name: "David" })))).toBe("name:david");
    expect(seedKey(stripKey(seed({ subject_entity_id: "e-1", subject_name: null })))).toBe("entity:e-1");
    expect(seedKey(stripKey(seed({ subject_entity_id: null, subject_name: null, seed_type: "connector_setup" })))).toBe("type:connector_setup");
  });

  it("queue order is root-first Dandelion (people → structure → tools)", () => {
    expect(SEED_QUEUES[0]!.id).toBe("people_to_review");
    expect(SEED_QUEUES[1]!.id).toBe("role_project_team");
    expect(SEED_QUEUES[2]!.id).toBe("tool_setup");
    expect(SEED_QUEUES[SEED_QUEUES.length - 1]!.id).toBe("resolved");
  });
});
