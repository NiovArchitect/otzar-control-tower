// FILE: FlowTraceOverlay.tsx
// PURPOSE: [OTZAR-LIVE-6] Directional flow traces. When a REAL action moves work
//          (a governed send, an approval routed, a reply surfaced, context set),
//          a single soft streak sweeps once along the top edge in the direction
//          the work moved, with a short human label, then fades. No constant
//          animation, no trace without an event, reduced-motion safe (the sweep
//          is motion-safe-gated). Pointer-safe; never blocks work.
// CONNECTS TO: src/lib/stores/flow.ts, EmployeeLayout, src/lib/ambient/glass.ts,
//          tests/unit/flow-trace-overlay.test.tsx.

import { useEffect, useState } from "react";
import { useFlowStore, liveFlow, flowDirection } from "@/lib/stores/flow";
import type { PresenceIntensity } from "@/lib/stores/presence";
import { intensityDot } from "@/lib/ambient/glass";

function streakColor(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "via-amber-400/70";
    case "critical":
      return "via-rose-400/70";
    case "ambient":
      return "via-slate-300/60";
    case "working":
    default:
      return "via-sky-400/70";
  }
}

export function FlowTraceOverlay(): JSX.Element | null {
  const events = useFlowStore((s) => s.events);
  const prune = useFlowStore((s) => s.prune);
  const [, tick] = useState(0);
  const live = liveFlow(events, Date.now());

  // Re-render to retire the trace exactly when its TTL lapses — no polling.
  useEffect(() => {
    if (live === null) return undefined;
    const remaining = live.ttlMs - (Date.now() - live.createdAt);
    const t = setTimeout(
      () => {
        prune(Date.now());
        tick((n) => n + 1);
      },
      Math.max(0, remaining) + 60,
    );
    return () => clearTimeout(t);
  }, [live, prune]);

  if (live === null) return null;
  const dir = flowDirection(live.kind);

  return (
    <div
      aria-hidden
      data-testid="flow-trace"
      data-kind={live.kind}
      data-direction={dir}
      className="pointer-events-none fixed inset-x-0 top-0 z-[57]"
    >
      {/* The directional streak — sweeps once (motion-safe), static otherwise. */}
      <div
        className={`h-[2px] w-full bg-gradient-to-r from-transparent ${streakColor(
          live.intensity,
        )} to-transparent ${
          dir === "out"
            ? "motion-safe:animate-flow-streak-out"
            : "motion-safe:animate-flow-streak-in"
        }`}
      />
      {/* A short, human label — what just moved. */}
      <div className="flex justify-center">
        <span
          key={live.id}
          data-testid="flow-trace-label"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/75 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm backdrop-blur-xl"
        >
          <span
            aria-hidden
            className={`inline-block h-1 w-1 rounded-full ${intensityDot(live.intensity)}`}
          />
          {live.label}
        </span>
      </div>
    </div>
  );
}
