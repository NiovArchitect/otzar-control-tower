// FILE: SpatialPresenceLayer.tsx
// PURPOSE: D-03 — optional purposeful spatial depth on Today hero with
//          reduced-motion 2D fallback. No WebGL; immersive residual honest.
// CONNECTS TO: AmbientWorkSurface, spatial-readiness.ts, index.css.

import { useEffect, useState } from "react";
import {
  D03_DOCTRINE,
  D03_IMMERSIVE_RESIDUAL,
  SPATIAL_READINESS_RULES,
  prefersReducedMotion,
  resolveSpatialMode,
  spatialModeLabel,
  type SpatialMode,
} from "@/lib/ambient/spatial-readiness";

export function SpatialPresenceLayer({
  /** When false, force flat 2D even if motion is allowed. */
  depthEnabled = true,
  showReadinessNote = true,
}: {
  depthEnabled?: boolean;
  showReadinessNote?: boolean;
}): JSX.Element {
  // Default flat until client effect measures motion preference (SSR/jsdom safe).
  const [mode, setMode] = useState<SpatialMode>("flat_2d");

  useEffect(() => {
    const apply = (): void => {
      setMode(
        resolveSpatialMode({
          reducedMotion: prefersReducedMotion(),
          depthEnabled,
        }),
      );
    };
    apply();
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (): void => apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
    // Safari < 14
    if (typeof mq.addListener === "function") {
      mq.addListener(handler);
      return () => mq.removeListener(handler);
    }
  }, [depthEnabled]);

  const isFlat = mode === "flat_2d";

  return (
    <div
      data-testid="spatial-presence-layer"
      data-d03="true"
      data-spatial-mode={mode}
      data-reduced-motion={isFlat ? "true" : "false"}
      data-depth-enabled={depthEnabled ? "true" : "false"}
      data-immersive-shipped="false"
      className={
        isFlat
          ? "otzar-spatial-stage otzar-spatial-flat pointer-events-none absolute inset-0"
          : "otzar-spatial-stage otzar-spatial-depth pointer-events-none absolute inset-0"
      }
      aria-hidden
    >
      {/* Depth planes — CSS only; disabled under flat mode via class */}
      <div className="otzar-spatial-plane otzar-spatial-plane-far" data-testid="spatial-plane-far" />
      <div className="otzar-spatial-plane otzar-spatial-plane-mid" data-testid="spatial-plane-mid" />
      <div className="otzar-spatial-plane otzar-spatial-plane-near" data-testid="spatial-plane-near" />

      {showReadinessNote ? (
        <div
          className="pointer-events-none absolute bottom-1 left-2 right-2 sr-only"
          data-testid="spatial-readiness-sr"
        >
          {spatialModeLabel(mode)}. {D03_DOCTRINE} {D03_IMMERSIVE_RESIDUAL}
        </div>
      ) : null}
    </div>
  );
}

/** Compact visible readiness strip (not on primary Focus path). */
export function SpatialReadinessNote(): JSX.Element {
  const [mode, setMode] = useState<SpatialMode>("flat_2d");

  useEffect(() => {
    setMode(resolveSpatialMode({ reducedMotion: prefersReducedMotion() }));
  }, []);

  return (
    <div
      className="rounded-md border border-border/50 bg-muted/20 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground"
      data-testid="spatial-readiness-note"
      data-d03="true"
      data-spatial-mode={mode}
      data-immersive-shipped="false"
    >
      <p className="font-medium text-foreground/80" data-testid="d03-doctrine-line">
        Spatial readiness
      </p>
      <p data-testid="d03-mode-label">{spatialModeLabel(mode)}</p>
      <p className="mt-0.5" data-testid="d03-doctrine">
        {D03_DOCTRINE}
      </p>
      <ul className="mt-1 grid gap-0.5 sm:grid-cols-2" data-testid="d03-rules-list">
        {SPATIAL_READINESS_RULES.map((r) => (
          <li key={r.id} data-testid="d03-rule-row" data-rule-id={r.id}>
            <span className="font-medium text-foreground/70">{r.label}</span>
            {" — "}
            {r.plain}
          </li>
        ))}
      </ul>
      <p className="mt-1" data-testid="d03-immersive-residual">
        {D03_IMMERSIVE_RESIDUAL}
      </p>
    </div>
  );
}
