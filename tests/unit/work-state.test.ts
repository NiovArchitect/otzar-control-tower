// FILE: work-state.test.ts
// PURPOSE: Phase 1285-H (Phase 5 additive) — lock the shared WorkStateChanged
//          channel: subscribers receive matching events, unsubscribe works, a
//          throwing subscriber never blocks others or the emitter, and emitting
//          with no subscribers is a no-op (additive — never required).
// CONNECTS TO: src/lib/events/work-state.ts

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emitWorkStateChanged,
  onWorkStateChanged,
  _listenerCount,
} from "@/lib/events/work-state";

afterEach(() => {
  // Best-effort: ensure no listeners leak between tests.
  expect(_listenerCount()).toBe(0);
});

describe("WorkStateChanged channel", () => {
  it("delivers events to subscribers and unsubscribes cleanly", () => {
    const seen: string[] = [];
    const off = onWorkStateChanged((e) => seen.push(e.type));
    emitWorkStateChanged({ type: "TASK_COMPLETED", ledger_entry_id: "l1" });
    emitWorkStateChanged({ type: "WAITING_ON_CHANGED" });
    expect(seen).toEqual(["TASK_COMPLETED", "WAITING_ON_CHANGED"]);
    off();
    emitWorkStateChanged({ type: "LEDGER_UPDATED" });
    expect(seen).toEqual(["TASK_COMPLETED", "WAITING_ON_CHANGED"]); // no more after unsubscribe
  });

  it("a throwing subscriber never blocks other subscribers or the emitter", () => {
    const good = vi.fn();
    const offBad = onWorkStateChanged(() => {
      throw new Error("subscriber blew up");
    });
    const offGood = onWorkStateChanged(good);
    expect(() => emitWorkStateChanged({ type: "SIGNAL_TRACKED" })).not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
    offBad();
    offGood();
  });

  it("emitting with no subscribers is a safe no-op", () => {
    expect(() => emitWorkStateChanged({ type: "MESSAGE_CREATED" })).not.toThrow();
  });
});
