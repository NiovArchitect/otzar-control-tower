// FILE: thread-signal.test.ts
// PURPOSE: Phase 1285 slice 3 — the signal→label and signal→Work-Ledger-type
//          mapping is stable, and QUESTION is informational (not addable work).
// CONNECTS TO: src/lib/work-os/thread-signal.ts

import { describe, expect, it } from "vitest";
import { signalLabel, ledgerTypeForSignal, isAddable } from "@/lib/work-os/thread-signal";

describe("thread-signal mapping", () => {
  it("labels each signal type", () => {
    expect(signalLabel("TASK_REQUEST")).toBe("Possible task");
    expect(signalLabel("BLOCKER")).toBe("Possible blocker");
    expect(signalLabel("DECISION")).toBe("Possible decision");
    expect(signalLabel("QUESTION")).toBe("Question");
  });

  it("maps work signals to Work Ledger types", () => {
    expect(ledgerTypeForSignal("TASK_REQUEST")).toBe("TASK");
    expect(ledgerTypeForSignal("BLOCKER")).toBe("BLOCKER");
    expect(ledgerTypeForSignal("DECISION")).toBe("DECISION");
    expect(ledgerTypeForSignal("COMMITMENT")).toBe("FOLLOW_UP");
    expect(ledgerTypeForSignal("APPROVAL_LIKE")).toBe("APPROVAL");
  });

  it("QUESTION is informational — not addable as work", () => {
    expect(ledgerTypeForSignal("QUESTION")).toBeNull();
    expect(isAddable("QUESTION")).toBe(false);
    expect(isAddable("TASK_REQUEST")).toBe(true);
  });
});
