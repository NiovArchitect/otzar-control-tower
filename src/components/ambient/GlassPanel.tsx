// FILE: GlassPanel.tsx
// PURPOSE: Frosted-glass panel — building block of ambient surfaces.
//          Carries presence intensity (priority accent), short label,
//          glanceable content. Never a dense dashboard card.
// CONNECTS TO: src/lib/ambient/glass.ts, AmbientWorkSurface, Action Center.

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
      className={`${GLASS_SURFACE} ${panelAccent(intensity)} px-4 py-4 sm:px-5 ${className}`}
    >
      {label !== undefined ? (
        <div className="mb-2 flex items-center gap-1.5">
          <span
            aria-hidden
            className={`inline-block h-1.5 w-1.5 rounded-full ${intensityDot(intensity)} ${
              intensity === "attention" || intensity === "critical"
                ? "motion-safe:animate-pulse"
                : ""
            }`}
          />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {label}
          </h2>
        </div>
      ) : null}
      <div className="text-slate-800">{children}</div>
    </section>
  );
}
