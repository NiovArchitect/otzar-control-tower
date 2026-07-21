// FILE: SpatialPresenceLayer.tsx
// PURPOSE: Optional CSS depth on Today hero (no WebGL). Builder "Spatial
//          readiness" note is NOT shown on normal product surfaces (RC2).
// CONNECTS TO: AmbientWorkSurface, spatial-readiness.ts, index.css.

import { useEffect, useState } from "react";
import {
  prefersReducedMotion,
  resolveSpatialMode,
  type SpatialMode,
} from "@/lib/ambient/spatial-readiness";

export function SpatialPresenceLayer({
  depthEnabled = true,
  showReadinessNote = false,
}: {
  depthEnabled?: boolean;
  /** Ignored — readiness copy is purged from product UI. */
  showReadinessNote?: boolean;
}): JSX.Element {
  void showReadinessNote;
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
      <div
        className="otzar-spatial-plane otzar-spatial-plane-far"
        data-testid="spatial-plane-far"
      />
      <div
        className="otzar-spatial-plane otzar-spatial-plane-mid"
        data-testid="spatial-plane-mid"
      />
      <div
        className="otzar-spatial-plane otzar-spatial-plane-near"
        data-testid="spatial-plane-near"
      />
    </div>
  );
}

/** Purged from product UI — returns null. */
export function SpatialReadinessNote(): null {
  return null;
}
