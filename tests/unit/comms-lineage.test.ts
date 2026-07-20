// FILE: tests/unit/comms-lineage.test.ts
// PURPOSE: K-03 — communication lineage spine from extraction (+ ingest).

import { describe, expect, it } from "vitest";
import {
  buildCommsLineage,
  commsLineageFingerprint,
} from "@/lib/work-os/comms-lineage";
import type {
  CommsExtractionResult,
  CommsIngestResult,
  CommsSuggestedAction,
} from "@/lib/types/foundation";

function action(partial: Partial<CommsSuggestedAction> & { draft_text: string }): CommsSuggestedAction {
  return {
    local_id: "a1",
    action_type: "SEND_INTERNAL_NOTIFICATION",
    target: { display_name: "David", email: null, entity_id: null },
    reason: "follow up",
    source_excerpt: null,
    confidence: "HIGH",
    resolution_status: "RESOLVED",
    recipient_governance: {} as CommsSuggestedAction["recipient_governance"],
    autonomy: {} as CommsSuggestedAction["autonomy"],
    ...partial,
  };
}

const BASE: CommsExtractionResult = {
  summary: "Launch follow-up meeting.",
  decisions: ["Keep notes internal only", "No Slack send until approved"],
  commitments: ["David reviews UI by Friday", "Samiksha summarizes NLP notes"],
  risks_or_blockers: ["API keys may block demo"],
  suggested_actions: [
    action({ draft_text: "Please review the UI flow by Friday." }),
  ],
  extraction_mode: "DEMO_SCRIPTED",
  responsibility_graph: { lead: null, founderAuthority: null, nodes: [] },
  lead_card: null,
};

describe("K-03 buildCommsLineage", () => {
  it("builds continuous facets with decisions → commitments → truth → work", () => {
    const lin = buildCommsLineage(BASE, null);
    expect(lin.facets.map((f) => f.id)).toEqual([
      "decisions",
      "commitments",
      "blockers",
      "truth",
      "obligations",
      "follow_ups",
    ]);
    expect(lin.counts.decisions).toBe(2);
    expect(lin.counts.commitments).toBe(2);
    expect(lin.counts.blockers).toBe(1);
    expect(lin.counts.truthCandidates).toBe(3); // 2 decisions + 1 blocker
    expect(lin.counts.followUps).toBe(1);
    expect(lin.hasGovernedWork).toBe(true);
    expect(lin.spineSummary.toLowerCase()).toMatch(/decision|commitment|follow-up/);
    expect(commsLineageFingerprint(lin)).toContain("decision");
    expect(commsLineageFingerprint(lin)).toContain("follow_up");
  });

  it("keeps empty facets present (chain never missing)", () => {
    const empty: CommsExtractionResult = {
      ...BASE,
      decisions: [],
      commitments: [],
      risks_or_blockers: [],
      suggested_actions: [],
    };
    const lin = buildCommsLineage(empty, null);
    expect(lin.facets).toHaveLength(6);
    expect(lin.facets.every((f) => f.empty)).toBe(true);
    expect(lin.hasGovernedWork).toBe(false);
    expect(lin.spineSummary.toLowerCase()).toMatch(/no decisions|organized/);
  });

  it("prefers ingest work items as obligations", () => {
    const ingest = {
      counts: { owned: 1, needs_review: 0 },
      quality: { quarantined: 0 },
      work_items: [
        {
          ledger_entry_id: "le1",
          ledger_type: "FOLLOW_UP",
          owner_entity_id: "e1",
          owner_name: "David",
          title: "Review UI flow",
          status: "OPEN",
          needs_review: false,
          review_reason: null,
          execution: {
            execution_type: "notify",
            execution_mode: "draft",
            required_connector: "internal",
            capability_state: null,
            approval_required: true,
            blocker_reason: null,
            next_best_action: "approve",
          },
        },
      ],
    } as unknown as CommsIngestResult;
    const lin = buildCommsLineage(BASE, ingest);
    const obl = lin.facets.find((f) => f.id === "obligations")!;
    expect(obl.empty).toBe(false);
    expect(obl.items[0]!.text).toBe("Review UI flow");
    expect(obl.items[0]!.owner).toBe("David");
    expect(lin.hasGovernedWork).toBe(true);
  });

  it("each facet has why copy for continuous understanding", () => {
    const lin = buildCommsLineage(BASE, null);
    for (const f of lin.facets) {
      expect(f.why.length).toBeGreaterThan(12);
    }
  });
});
