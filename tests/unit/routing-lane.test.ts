// FILE: tests/unit/routing-lane.test.ts
// PURPOSE: PROD-UX-P0R — lock the lane→chip presentation contract: every
//          non-silent lane maps to one short human chip (customer copy,
//          never an enum literal), the two silent lanes stay silent (no
//          card spam), sparse payloads (no routing yet) render nothing,
//          and the why panel surfaces the server-humanized reason + risk
//          without leaking raw policy/tool tokens.

import { describe, expect, it } from "vitest";
import { routingLaneChip, routingLaneEdge, routingWhyLine } from "@/lib/work-os/routing-lane";
import type {
  RoutingDecisionView,
  RoutingLane,
} from "@/lib/types/foundation";

function decision(overrides: Partial<RoutingDecisionView>): RoutingDecisionView {
  return {
    lane: "silent_routing",
    reason: "Tracked and routed to its owner — nothing is needed from you right now.",
    risk: "low",
    confidence: 0.9,
    policy_basis: null,
    owner_entity_id: "ent-1",
    owner_status: "resolved",
    next_best_action: null,
    required_tool: null,
    evidence_refs: [],
    audit_pointer: null,
    ...overrides,
  };
}

const NON_SILENT_LANES: RoutingLane[] = [
  "notify_owner",
  "draft_ready",
  "execute_when_allowed",
  "ask_approval",
  "escalate",
  "blocked",
  "setup_required",
  "identity_review",
];

describe("routing-lane — chip matrix", () => {
  it("every non-silent lane maps to a distinct, human, chip-sized label", () => {
    const labels = new Set<string>();
    for (const lane of NON_SILENT_LANES) {
      const chip = routingLaneChip(decision({ lane }));
      expect(chip, lane).not.toBeNull();
      // Customer copy: no underscores, no ALL-CAPS enum shapes, short.
      expect(chip!.label).not.toMatch(/_/);
      expect(chip!.label).not.toMatch(/^[A-Z_]+$/);
      expect(chip!.label.length).toBeLessThanOrEqual(24);
      // Every chip carries a tone class from the cockpit palette.
      expect(chip!.cls).toMatch(/border-.*text-/);
      labels.add(chip!.label);
    }
    expect(labels.size).toBe(NON_SILENT_LANES.length);
  });

  it("the two silent lanes render NO chip (calm by design)", () => {
    expect(routingLaneChip(decision({ lane: "silent_capture" }))).toBeNull();
    expect(routingLaneChip(decision({ lane: "silent_routing" }))).toBeNull();
  });

  it("an item without a routing projection (older payloads) renders nothing", () => {
    expect(routingLaneChip(undefined)).toBeNull();
    expect(routingWhyLine(undefined)).toBeNull();
  });

  it("attention lanes carry warn/critical tones; assist lanes stay calm", () => {
    expect(routingLaneChip(decision({ lane: "blocked" }))!.cls).toMatch(/rose/);
    for (const lane of ["ask_approval", "setup_required", "identity_review", "escalate"] as const) {
      expect(routingLaneChip(decision({ lane }))!.cls, lane).toMatch(/amber/);
    }
    for (const lane of ["draft_ready", "execute_when_allowed"] as const) {
      expect(routingLaneChip(decision({ lane }))!.cls, lane).toMatch(/sky/);
    }
  });
});

describe("routing-lane — why panel", () => {
  it("passes the server-humanized reason through untouched", () => {
    const why = routingWhyLine(
      decision({
        lane: "ask_approval",
        reason: "Needs your approval before Otzar posts to Slack — outside writes always get a person's sign-off first.",
        risk: "high",
        next_best_action: "Approve or edit the draft",
      }),
    );
    expect(why).not.toBeNull();
    expect(why!.reason).toMatch(/Needs your approval before Otzar posts to Slack/);
    expect(why!.risk).toBe("High risk. A person stays in the loop");
    expect(why!.nextBestAction).toBe("Approve or edit the draft");
  });

  it("risk wording is a sentence, never a bare enum", () => {
    expect(routingWhyLine(decision({ risk: "low" }))!.risk).toBe("Low risk");
    expect(routingWhyLine(decision({ risk: "medium" }))!.risk).toBe("Medium risk");
  });

  it("silent lanes still get a why line (View/Why shows it; only the chip is silent)", () => {
    const why = routingWhyLine(decision({ lane: "silent_capture", reason: "Captured for the record — nothing needs to happen." }));
    expect(why).not.toBeNull();
    expect(why!.reason).toMatch(/Captured for the record/);
  });

  it("never surfaces raw policy/tool tokens (audit material stays out of normal flow)", () => {
    const why = routingWhyLine(
      decision({
        lane: "setup_required",
        reason: "Slack isn't set up yet — connect it so Otzar can help with this.",
        policy_basis: "POLICY_REASON_X",
        required_tool: "SLACK",
      }),
    )!;
    const flat = `${why.reason} ${why.risk} ${why.nextBestAction ?? ""}`;
    expect(flat).not.toMatch(/POLICY_REASON_X|SLACK\b/);
  });
});

// PROD-MODEL-P5 §19 — the card edge is driven by the SAME lane vocabulary
// (real state, never decoration): attention lanes forward, silent recede.
describe("routing-lane — ambient card edge (P5)", () => {
  it("attention lanes carry warm edges; silent lanes recede; absent routing is neutral", () => {
    expect(routingLaneEdge(decision({ lane: "blocked" }))).toMatch(/rose/);
    for (const lane of ["ask_approval", "setup_required", "identity_review", "escalate"] as const) {
      expect(routingLaneEdge(decision({ lane })), lane).toMatch(/amber/);
    }
    for (const lane of ["silent_capture", "silent_routing"] as const) {
      expect(routingLaneEdge(decision({ lane })), lane).toMatch(/border\/60/);
    }
    expect(routingLaneEdge(undefined)).toMatch(/border\/60/);
  });
});
