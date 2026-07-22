// FILE: activation-path.test.ts
// PURPOSE: 9-step activation path derives from journey + discovery truth.

import { describe, expect, it } from "vitest";
import { deriveActivationPath } from "@/lib/setup/activation-path";
import { deriveSetupJourney, type SetupInputs } from "@/lib/setup/setup-journey";
import { deriveOrgDiscovery } from "@/lib/setup/org-discovery";
import type { Entity, OrgSeed } from "@/lib/types/foundation";

function person(id: string, activation = "active"): Entity {
  return {
    entity_id: `00000000-0000-0000-0000-0000000000${id}`,
    entity_type: "PERSON",
    display_name: `P${id}`,
    email: `p${id}@t.test`,
    status: "ACTIVE",
    activation_status: activation,
    clearance_level: 4,
    public_key: "pk",
    failed_auth_attempts: 0,
  } as Entity;
}

function seed(id: string, type: string): OrgSeed {
  return {
    seed_id: id,
    seed_type: type,
    subject_name: "Alex",
    subject_entity_id: null,
    recommended_action: "Confirm",
    source_evidence: "Recent work",
    source_conversation_id: null,
    confidence: "medium",
    approval_required: true,
    policy_status: "needs_review",
    sensitivity: "internal",
    risk_if_ignored: null,
    status: "SEED_NEEDS_REVIEW",
    resulting_action: null,
    rejection_reason: null,
    hold_reason: null,
    reviewed: false,
    created_at: "2026-01-01T00:00:00Z",
  } as OrgSeed;
}

describe("deriveActivationPath", () => {
  it("emits 9 ordered steps with actions and marks focus", () => {
    const inputs: SetupInputs = {
      people: [person("01"), person("02", "activation_pending")],
      memberships: [],
      orgEntityId: "org",
      twins: [],
      twinAutonomyCeiling: "APPROVAL_REQUIRED",
      connectors: [],
      seeds: [seed("s1", "set_manager"), seed("s2", "confirm_or_activate_person")],
      analytics: null,
      settings: { require_human_approval: true, audit_ai_actions: true },
    };
    const journey = deriveSetupJourney(inputs);
    const discovery = deriveOrgDiscovery({
      people: inputs.people,
      memberships: inputs.memberships,
      seeds: inputs.seeds,
      orgEntityId: "org",
    });
    const path = deriveActivationPath(journey, discovery);
    expect(path.steps).toHaveLength(9);
    expect(path.steps.map((s) => s.label)).toEqual([
      "Organization",
      "People",
      "Structure",
      "Projects",
      "AI Teammates",
      "Connections",
      "Governance",
      "First workflow",
      "Ready",
    ]);
    expect(path.steps.every((s) => s.action.to.length > 0)).toBe(true);
    expect(path.steps.every((s) => s.action.label.length > 0)).toBe(true);
    expect(path.focusStepId).toBeTruthy();
    const org = path.steps.find((s) => s.id === "organization")!;
    expect(org.stateLabel).toMatch(/2 need review|need review/);
  });

  it("marks Ready when journey is calm and no open seeds", () => {
    const inputs: SetupInputs = {
      people: [person("01")],
      memberships: [
        {
          membership_id: "m1",
          parent_id: "mgr",
          child_id: "00000000-0000-0000-0000-000000000001",
          role_title: "IC",
          department: "Eng",
          hierarchy_level: 1,
          is_admin: false,
          is_active: true,
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      orgEntityId: "org",
      twins: [],
      twinAutonomyCeiling: "APPROVAL_REQUIRED",
      connectors: [
        {
          slug: "google",
          display_name: "Google",
          status: "VERIFIED",
        } as never,
      ],
      seeds: [],
      analytics: { decision_count: 1, capsule_count: 1 } as never,
      settings: { require_human_approval: true, audit_ai_actions: true },
    };
    // Minimal twins so roles don't hard-block — journey may still need attention.
    const journey = deriveSetupJourney(inputs);
    const discovery = deriveOrgDiscovery({
      people: inputs.people,
      memberships: inputs.memberships,
      seeds: [],
      orgEntityId: "org",
    });
    const path = deriveActivationPath(journey, discovery);
    expect(path.steps).toHaveLength(9);
    expect(path.steps.find((s) => s.id === "organization")!.state).toBe("ready");
  });
});
