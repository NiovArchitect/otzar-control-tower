import { describe, expect, it } from "vitest";
import {
  classifyLedgerHumanState,
  composeHomeBands,
  humanWorkStateLabel,
} from "@/lib/today/human-work-state";

describe("human work states", () => {
  it("labels states plainly", () => {
    expect(humanWorkStateLabel("to_do")).toBe("To do");
    expect(humanWorkStateLabel("waiting")).toBe("Waiting");
    expect(humanWorkStateLabel("done")).toBe("Done");
  });

  it("classifies completed and waiting", () => {
    expect(classifyLedgerHumanState({ completed: true })).toBe("done");
    expect(classifyLedgerHumanState({ waiting_on_other: true })).toBe("waiting");
    expect(classifyLedgerHumanState({ needs_user: true })).toBe("needs_review");
    expect(classifyLedgerHumanState({ status: "EXECUTED" })).toBe("done");
  });

  it("omits empty home bands", () => {
    const bands = composeHomeBands({
      needsMe: [{ key: "1", title: "Approve brief", testId: "n1", to: "/app/action-center" }],
      changed: [],
      handled: [],
      waiting: [],
      next: [],
    });
    expect(bands).toHaveLength(1);
    expect(bands[0]?.band).toBe("needs_me");
    expect(bands[0]?.label).toBe("Needs me");
  });
});
