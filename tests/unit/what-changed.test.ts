// FILE: what-changed.test.ts
// PURPOSE: B-04 — what-changed strip is real-state only.

import { describe, expect, it } from "vitest";
import { buildWhatChanged } from "@/lib/today/what-changed";

const empty = {
  openHandoffCount: 0,
  handoffSampleTitles: [] as string[],
  attentionCount: 0,
  blockedOrUnpaired: false,
  twinWorkingCount: 0,
  toolsReconnectLabel: null as string | null,
  truthConflictCount: 0,
  teamOpenSample: null as string | null,
};

describe("B-04 buildWhatChanged", () => {
  it("is quiet when nothing real changed", () => {
    const items = buildWhatChanged(empty);
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("quiet");
    expect(items[0]?.testId).toBe("what-changed-quiet");
  });

  it("names specific reconnect need for missing integrations", () => {
    const items = buildWhatChanged({
      ...empty,
      toolsReconnectLabel: "Reconnect Google",
    });
    expect(items.some((i) => i.kind === "integration")).toBe(true);
    expect(items[0]?.title).toMatch(/Google/);
    expect(items[0]?.to).toContain("reconnect");
  });

  it("surfaces handoffs and twin work from counts", () => {
    const items = buildWhatChanged({
      ...empty,
      openHandoffCount: 2,
      handoffSampleTitles: ["Ship deck"],
      twinWorkingCount: 1,
    });
    expect(items.some((i) => i.kind === "handoff")).toBe(true);
    expect(items.some((i) => i.kind === "twin")).toBe(true);
    expect(items.every((i) => i.kind !== "quiet")).toBe(true);
  });

  it("never invents more than 4 lines", () => {
    const items = buildWhatChanged({
      openHandoffCount: 3,
      handoffSampleTitles: ["A"],
      attentionCount: 5,
      blockedOrUnpaired: true,
      twinWorkingCount: 2,
      toolsReconnectLabel: "Reconnect Slack",
      truthConflictCount: 1,
      teamOpenSample: "Maya has open work",
    });
    expect(items.length).toBeLessThanOrEqual(4);
  });
});
