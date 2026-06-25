// FILE: tests/unit/flow-store.test.ts
// PURPOSE: [OTZAR-LIVE-6] The flow-event model behind directional traces is REAL
//          and EPHEMERAL: an event exists only when emitted, the live event is
//          the most-recent non-expired one, events expire by TTL, and direction
//          maps inbound vs outbound. No event = no trace.
// CONNECTS TO: src/lib/stores/flow.ts.

import { describe, it, expect, beforeEach } from "vitest";
import {
  useFlowStore,
  liveFlow,
  flowDirection,
  DEFAULT_FLOW_TTL_MS,
} from "@/lib/stores/flow";

beforeEach(() => useFlowStore.getState().clear());

describe("flow store — ephemeral, real, expiring", () => {
  it("has no live event until one is emitted (no trace from nothing)", () => {
    expect(useFlowStore.getState().events).toEqual([]);
    expect(liveFlow(useFlowStore.getState().events, 1000)).toBeNull();
  });

  it("emits a real flow event with the given kind + label", () => {
    useFlowStore.getState().emit({
      kind: "otzar_to_person",
      label: "Routed to David",
      now: 1000,
    });
    const live = liveFlow(useFlowStore.getState().events, 1100);
    expect(live?.kind).toBe("otzar_to_person");
    expect(live?.label).toBe("Routed to David");
    expect(live?.intensity).toBe("working");
  });

  it("the most recent event wins as the live trace", () => {
    const s = useFlowStore.getState();
    s.emit({ kind: "context_to_action", label: "Context", now: 1000 });
    s.emit({ kind: "reply_to_user", label: "David replied", now: 1500 });
    expect(liveFlow(useFlowStore.getState().events, 1600)?.kind).toBe("reply_to_user");
  });

  it("a flow event expires after its TTL (the trace fades)", () => {
    useFlowStore.getState().emit({
      kind: "otzar_to_person",
      label: "Routed",
      now: 1000,
    });
    expect(liveFlow(useFlowStore.getState().events, 1000 + DEFAULT_FLOW_TTL_MS - 1)).not.toBeNull();
    expect(liveFlow(useFlowStore.getState().events, 1000 + DEFAULT_FLOW_TTL_MS + 1)).toBeNull();
  });

  it("prune drops expired events", () => {
    const s = useFlowStore.getState();
    s.emit({ kind: "otzar_to_person", label: "a", now: 1000, ttlMs: 100 });
    s.prune(2000);
    expect(useFlowStore.getState().events).toEqual([]);
  });

  it("maps inbound vs outbound direction by kind", () => {
    expect(flowDirection("reply_to_user")).toBe("in");
    expect(flowDirection("context_to_action")).toBe("in");
    expect(flowDirection("otzar_to_person")).toBe("out");
    expect(flowDirection("blocker_to_approval")).toBe("out");
  });
});
