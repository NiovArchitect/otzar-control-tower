// FILE: founder-signal-hierarchy.test.ts
// PURPOSE: YC-clear Today hierarchy — comms never primary alone.

import { describe, expect, it } from "vitest";
import {
  buildFounderSignalLanes,
  collapseCommunicationSignal,
} from "@/lib/today/founder-signal-hierarchy";

const base = {
  nextDecisionTitle: null as string | null,
  nextDecisionReason: null as string | null,
  nextDecisionRoute: null as string | null,
  completedActionTitle: null as string | null,
  completedActionTo: null as string | null,
  completedCollabTitle: null as string | null,
  completedCollabTo: null as string | null,
  failedActionTitle: null as string | null,
  failedActionTo: null as string | null,
  approvalsCount: 0,
  blindSpotCount: 0,
  openHandoffCount: 0,
  handoffTitle: null as string | null,
  communicationReplyCount: 19,
  teamSamples: [] as Array<{ name: string; openLabel: string }>,
  toolsReconnectLabel: null as string | null,
  truthConflictCount: 0,
};

describe("buildFounderSignalLanes", () => {
  it("never puts communication volume as the first lane", () => {
    const lanes = buildFounderSignalLanes({
      ...base,
      completedActionTitle: "Recorded proof capsule",
      completedCollabTitle: "Research handoff",
      communicationReplyCount: 19,
    });
    expect(lanes[0]?.lane).not.toBe("communications");
    expect(lanes[0]?.lane).toBe("primary_objective");
    const firstTitles = lanes.flatMap((l) => l.items.map((i) => i.title)).join(" ");
    expect(firstTitles).not.toMatch(/^19 replies/);
  });

  it("leads with completed work and collab when present", () => {
    const lanes = buildFounderSignalLanes({
      ...base,
      nextDecisionTitle: "Confirm launch readiness",
      completedActionTitle: "Recorded proof capsule",
      completedCollabTitle: "Annie research for David",
      failedActionTitle: "Internal notification",
      teamSamples: [{ name: "David", openLabel: "1 open · engineering" }],
      communicationReplyCount: 19,
    });
    const handled = lanes.find((l) => l.lane === "otzar_handled");
    expect(handled?.items.some((i) => /proof capsule/i.test(i.title))).toBe(
      true,
    );
    expect(handled?.items.some((i) => /collaborat/i.test(i.title))).toBe(true);
    const comms = lanes.find((l) => l.lane === "communications");
    expect(comms).toBeDefined();
    expect(comms?.items[0]?.title).toMatch(/grouped|secondary|communication/i);
    // communications is last
    expect(lanes[lanes.length - 1]?.lane).toBe("communications");
  });

  it("collapseCommunicationSignal demotes raw counts", () => {
    expect(collapseCommunicationSignal(19)).toMatch(/secondary|grouped/i);
    expect(collapseCommunicationSignal(19)).not.toBe("19 replies to review");
  });
});
