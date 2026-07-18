// FILE: GlassPanel.tsx
// PURPOSE: Phase-F frosted panel — glanceable ambient building block.
// CONNECTS TO: glass.ts, AmbientWorkSurface, Action Center, Comms.

import type { ReactNode } from "react";
import type { PresenceIntensity } from "@/lib/stores/presence";
import { GLASS_SURFACE, panelAccent, intensityDot } from "@/lib/ambient/glass";

export function GlassPanel({
  intensity = "ambient",
  label,
  children,
  className = "",
  testId,
}: {
  intensity?: PresenceIntensity;
  /** Short, human heading (one line). */
  label?: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}): JSX.Element {
  return (
    <section
      data-testid={testId}
      data-intensity={intensity}
      className={`${GLASS_SURFACE} ${panelAccent(intensity)} px-4 py-4 transition-shadow duration-300 hover:shadow-[0_20px_56px_-24px_rgba(15,23,42,0.28)] sm:px-5 sm:py-5 ${className}`}
    >
      {label !== undefined ? (
        <div className="mb-2.5 flex items-center gap-2">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${intensityDot(intensity)} ${
              intensity === "attention" || intensity === "critical"
                ? "motion-safe:animate-pulse"
                : ""
            }`}
          />
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500/90">
            {label}
          </h2>
        </div>
      ) : null}
      <div className="text-slate-800">{children}</div>
    </section>
  );
}
