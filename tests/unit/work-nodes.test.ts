// FILE: tests/unit/work-nodes.test.ts
// PURPOSE: [OTZAR-LIVE-6] Prove the ambient node model is REAL, never decorative:
//          no nodes when there's no state; a node appears iff its backing rail
//          has real data; presence intensity orders priority; no demo/fake nodes.
// CONNECTS TO: src/lib/work-os/work-nodes.ts.

import { describe, it, expect } from "vitest";
import {
  buildWorkNodes,
  type WorkNodeInputs,
} from "@/lib/work-os/work-nodes";

const EMPTY: WorkNodeInputs = {
  recipients: [],
  awaitingRecipient: false,
  draft: null,
  contextTitle: null,
  approvalsCount: 0,
  unreadCount: 0,
  correctionsActive: 0,
};

describe("buildWorkNodes — real nodes only", () => {
  it("returns NO nodes when there is no real state (never decorative)", () => {
    expect(buildWorkNodes(EMPTY)).toEqual([]);
  });

  it("creates a real person node per recipient in the active request", () => {
    const nodes = buildWorkNodes({
      ...EMPTY,
      recipients: ["David", "Samiksha"],
      awaitingRecipient: true,
    });
    const people = nodes.filter((n) => n.kind === "person");
    expect(people.map((n) => n.label)).toEqual(["David", "Samiksha"]);
    // While Otzar is waiting for the recipient, the people are attention-level.
    expect(people.every((n) => n.intensity === "attention")).toBe(true);
  });

  it("dedupes the draft target against the recipient people", () => {
    const nodes = buildWorkNodes({
      ...EMPTY,
      recipients: ["David"],
      draft: { targetLabel: "David", proposed: false, externalChannel: false },
    });
    expect(nodes.filter((n) => n.kind === "person")).toHaveLength(1);
  });

  it("a pending approval is an ATTENTION node", () => {
    const nodes = buildWorkNodes({ ...EMPTY, approvalsCount: 2 });
    const approval = nodes.find((n) => n.kind === "approval");
    expect(approval?.label).toBe("2 approvals");
    expect(approval?.intensity).toBe("attention");
  });

  it("a proposed draft is an ATTENTION request node (waiting on an approver)", () => {
    const nodes = buildWorkNodes({
      ...EMPTY,
      draft: { targetLabel: null, proposed: true, externalChannel: false },
    });
    const req = nodes.find((n) => n.kind === "request");
    expect(req?.label).toBe("Pending approval");
    expect(req?.intensity).toBe("attention");
  });

  it("active context becomes a calm AMBIENT context node", () => {
    const nodes = buildWorkNodes({ ...EMPTY, contextTitle: "the latest meeting note" });
    const ctx = nodes.find((n) => n.kind === "context");
    expect(ctx?.label).toBe("the latest meeting note");
    expect(ctx?.intensity).toBe("ambient");
  });

  it("unread replies become a working reply node", () => {
    expect(
      buildWorkNodes({ ...EMPTY, unreadCount: 3 }).find((n) => n.kind === "reply")
        ?.label,
    ).toBe("3 new replies");
  });

  it("orders the most-needed nodes first (attention before ambient)", () => {
    const nodes = buildWorkNodes({
      ...EMPTY,
      contextTitle: "a note",
      approvalsCount: 1,
    });
    expect(nodes[0]?.kind).toBe("approval"); // attention
    expect(nodes[nodes.length - 1]?.kind).toBe("context"); // ambient
  });

  it("never invents a node for empty/blank state", () => {
    const nodes = buildWorkNodes({ ...EMPTY, contextTitle: "   ", recipients: [""] });
    expect(nodes).toEqual([]);
  });
});
