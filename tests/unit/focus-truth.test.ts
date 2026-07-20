// FILE: focus-truth.test.ts
// PURPOSE: B-02 — every Focus card has why + object link (or honest queue link).

import { describe, expect, it } from "vitest";
import {
  focusApprovals,
  focusBlindSpots,
  focusHandoff,
  focusNextBestStep,
  focusReplies,
  focusTwinBlocked,
  focusTwinUnpaired,
  focusTwinWork,
  type FocusTruthItem,
} from "@/lib/today/focus-truth";

function expectB02(item: FocusTruthItem): void {
  expect(item.why.trim().length).toBeGreaterThan(8);
  // Either deep-link to object/queue, or inline action (verify) with objectId
  const hasLink = item.to !== null && item.to.startsWith("/app");
  const hasObjectAction = item.objectId !== null && item.actionLabel !== null;
  expect(hasLink || hasObjectAction).toBe(true);
}

describe("B-02 Focus card truth", () => {
  it("approvals count card explains why and links Needs me queue", () => {
    const item = focusApprovals(3);
    expectB02(item);
    expect(item.title).toMatch(/3 approvals/);
    expect(item.to).toContain("action-center");
    expect(item.why.toLowerCase()).toMatch(/approval/);
  });

  it("blind-spot card links stuck work surface", () => {
    const item = focusBlindSpots(1);
    expectB02(item);
    expect(item.to).toBe("/app/action-center");
  });

  it("replies card links Comms", () => {
    const item = focusReplies(2);
    expectB02(item);
    expect(item.to).toBe("/app/comms");
  });

  it("next-best-step uses route_hint and reason as why", () => {
    const item = focusNextBestStep({
      title: "Review handoff",
      reason: "Open handoff from Maya",
      routeHint: "/app/action-center?handoff=h1",
    });
    expectB02(item);
    expect(item.why).toMatch(/Maya/);
    expect(item.to).toContain("handoff=h1");
  });

  it("handoff card carries exact object id + deep link", () => {
    const item = focusHandoff({
      handoffId: "ho-99",
      title: "Ship deck",
      summary: "Needs acknowledge",
    });
    expectB02(item);
    expect(item.objectId).toBe("ho-99");
    expect(item.to).toContain("ho-99");
    expect(item.actionLabel).toBe("Acknowledge");
  });

  it("twin work verify has object id; open path has ledger link", () => {
    const verify = focusTwinWork({
      ledgerEntryId: "led-1",
      title: "Draft reply",
      stateLabel: "Needs verify",
      needsVerify: true,
    });
    expectB02(verify);
    expect(verify.objectId).toBe("led-1");
    expect(verify.actionLabel).toBe("Verify");

    const open = focusTwinWork({
      ledgerEntryId: "led-2",
      title: "Clarify scope",
      stateLabel: "Needs clarity",
      needsVerify: false,
    });
    expectB02(open);
    expect(open.to).toContain("led-2");
  });

  it("pairing blocked/unpaired link My Twin with why", () => {
    expectB02(focusTwinBlocked(2));
    expectB02(focusTwinUnpaired());
  });
});
