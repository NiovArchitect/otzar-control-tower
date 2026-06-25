// FILE: tests/unit/flow-trace-overlay.test.tsx
// PURPOSE: [OTZAR-LIVE-6] The directional flow trace renders ONLY from a real
//          flow event, sweeps in the right direction, is reduced-motion safe (the
//          sweep is motion-safe-gated), and retires when the event expires.
// CONNECTS TO: src/components/ambient/FlowTraceOverlay.tsx, src/lib/stores/flow.ts.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { cleanup, render, screen, act } from "@testing-library/react";
import { FlowTraceOverlay } from "@/components/ambient/FlowTraceOverlay";
import { useFlowStore } from "@/lib/stores/flow";

beforeEach(() => useFlowStore.getState().clear());
afterEach(() => cleanup());

describe("FlowTraceOverlay — real, directional, reduced-motion safe", () => {
  it("renders NOTHING when no work has moved (no event)", () => {
    render(<FlowTraceOverlay />);
    expect(screen.queryByTestId("flow-trace")).not.toBeInTheDocument();
  });

  it("renders a directional trace + human label from a real flow event", () => {
    act(() => {
      useFlowStore.getState().emit({
        kind: "otzar_to_person",
        label: "Routed to David",
        now: Date.now(),
      });
    });
    render(<FlowTraceOverlay />);
    const trace = screen.getByTestId("flow-trace");
    expect(trace).toHaveAttribute("data-kind", "otzar_to_person");
    expect(trace).toHaveAttribute("data-direction", "out");
    expect(screen.getByTestId("flow-trace-label")).toHaveTextContent("Routed to David");
  });

  it("an inbound reply trace sweeps inward", () => {
    act(() => {
      useFlowStore.getState().emit({
        kind: "reply_to_user",
        label: "David replied",
        now: Date.now(),
      });
    });
    render(<FlowTraceOverlay />);
    expect(screen.getByTestId("flow-trace")).toHaveAttribute("data-direction", "in");
  });

  it("the sweep animation is motion-safe-gated (reduced-motion shows no animation)", () => {
    act(() => {
      useFlowStore.getState().emit({
        kind: "otzar_to_person",
        label: "Routed",
        now: Date.now(),
      });
    });
    const { container } = render(<FlowTraceOverlay />);
    const streak = container.querySelector("[data-testid='flow-trace'] > div");
    // The animation only applies under motion-safe — reduced-motion users get a
    // static streak, never an unconditional animate-* class.
    expect(streak?.className).toMatch(/motion-safe:animate-flow-streak/);
    expect(streak?.className).not.toMatch(/(^|\s)animate-flow-streak/);
  });

  it("retires the trace when the event expires", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    act(() => {
      useFlowStore.getState().emit({
        kind: "otzar_to_person",
        label: "Routed",
        now,
        ttlMs: 500,
      });
    });
    render(<FlowTraceOverlay />);
    expect(screen.getByTestId("flow-trace")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(screen.queryByTestId("flow-trace")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
