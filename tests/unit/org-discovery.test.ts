// FILE: org-discovery.test.ts
// PURPOSE: Lock "Otzar found" derivation — Dandelion seeds surface as human
//          findings with review CTAs; never invents counts; preserves open seeds.
// CONNECTS TO: src/lib/setup/org-discovery.ts

import { describe, expect, it } from "vitest";
import { deriveOrgDiscovery } from "@/lib/setup/org-discovery";
import type { Entity, EntityMembership, OrgSeed } from "@/lib/types/foundation";
import { CAPABILITY_PRESERVATION_MAP } from "@/lib/setup/capability-preservation";

function person(id: string, activation = "active"): Entity {
  return {
    entity_id: `00000000-0000-0000-0000-0000000000${id}`,
    entity_type: "PERSON",
    display_name: `Person ${id}`,
    email: `p${id}@org.test`,
    status: "ACTIVE",
    activation_status: activation,
    clearance_level: 4,
    public_key: "pk",
    failed_auth_attempts: 0,
  } as Entity;
}

function seed(
  id: string,
  type: string,
  status: string = "SEED_NEEDS_REVIEW",
): OrgSeed {
  return {
    seed_id: id,
    seed_type: type,
    subject_name: "X",
    subject_entity_id: null,
    subject_key: id,
    recommended_action: "r",
    source_evidence: null,
    source_conversation_id: null,
    confidence: "low",
    approval_required: true,
    policy_status: "needs_review",
    sensitivity: "internal",
    risk_if_ignored: null,
    status: status as OrgSeed["status"],
    resulting_action: null,
    rejection_reason: null,
    hold_reason: null,
    reviewed: false,
    created_at: "2026-01-01T00:00:00Z",
  } as OrgSeed;
}

describe("deriveOrgDiscovery", () => {
  it("surfaces people counts and open Dandelion proposals as findings", () => {
    const people = [person("01"), person("02"), person("03", "activation_pending")];
    const memberships: EntityMembership[] = [
      {
        membership_id: "m1",
        parent_id: "org",
        child_id: people[0]!.entity_id,
        role_title: "ADMIN",
        department: "Engineering",
        hierarchy_level: 0,
        is_admin: true,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        membership_id: "m2",
        parent_id: people[0]!.entity_id,
        child_id: people[1]!.entity_id,
        role_title: null,
        department: "Engineering",
        hierarchy_level: 1,
        is_admin: false,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const seeds = [
      seed("s1", "set_manager"),
      seed("s2", "confirm_or_activate_person"),
      seed("s3", "add_project_membership", "SEED_APPROVED"),
    ];
    const d = deriveOrgDiscovery({
      people,
      memberships,
      seeds,
      orgEntityId: "org",
    });
    expect(d.available).toBe(true);
    expect(d.activePeopleCount).toBe(2);
    expect(d.openSeedCount).toBe(2);
    expect(d.reviewCta?.label).toMatch(/Review 2 items/);
    expect(d.reviewCta?.to).toBe("/organization-seeding");
    expect(d.findings.some((f) => /people/i.test(f.label))).toBe(true);
    expect(d.findings.some((f) => f.kind === "review")).toBe(true);
  });

  it("does not invent findings when all projections are null", () => {
    const d = deriveOrgDiscovery({
      people: null,
      memberships: null,
      seeds: null,
    });
    expect(d.available).toBe(false);
    expect(d.reviewCta).toBeNull();
  });

  it("keeps discovery route for full capability when no open seeds", () => {
    const d = deriveOrgDiscovery({
      people: [person("01")],
      memberships: [],
      seeds: [],
      orgEntityId: "org",
    });
    expect(d.openSeedCount).toBe(0);
    expect(d.reviewCta).toBeNull();
  });
});

describe("capability-preservation map", () => {
  it("maps Organization Seeding to Organization discovery with full route preserved", () => {
    const row = CAPABILITY_PRESERVATION_MAP.find(
      (e) => e.oldScreen === "Organization Seeding",
    );
    expect(row).toBeDefined();
    expect(row!.fullCapabilityRoute).toBe("/organization-seeding");
    expect(row!.status).not.toBe("NEEDS_WORK");
    expect(row!.capability.toLowerCase()).toMatch(/approve|sync|seed/);
  });

  it("does not leave NEEDS_WORK rows for Dandelion/seeding", () => {
    const bad = CAPABILITY_PRESERVATION_MAP.filter(
      (e) =>
        e.status === "NEEDS_WORK" &&
        /seed|dandelion|onboarding/i.test(e.oldScreen + e.capability),
    );
    expect(bad).toEqual([]);
  });
});
