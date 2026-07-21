// FILE: spatial-readiness.ts
// PURPOSE: D-03 — purposeful optional spatial/3D depth with reduced-motion
//          2D fallback and honest immersive residual (no forced walkthrough).
// CONNECTS TO: SpatialPresenceLayer, AmbientWorkSurface, OtzarMark, index.css,
//          FOUNDER D-03.

export const D03_DOCTRINE =
  "Spatial depth is optional and purposeful — it carries presence and calm, " +
  "not decoration or a forced 3D tour. When motion is reduced, Otzar stays " +
  "fully usable in flat 2D. Immersive 3D walkthroughs remain a future residual.";

/** Modes the product may render. Immersive is residual (not shipped). */
export type SpatialMode = "flat_2d" | "depth_css" | "immersive_residual";

export const SPATIAL_READINESS_RULES = [
  {
    id: "purposeful",
    label: "Purposeful only",
    plain: "Depth supports presence and focus — never a gimmick or maze.",
  },
  {
    id: "optional",
    label: "Optional",
    plain: "Spatial layer never blocks work; Today remains one-shot ADHD-safe.",
  },
  {
    id: "reduced_motion",
    label: "Reduced-motion 2D",
    plain: "prefers-reduced-motion forces flat 2D with no parallax animation.",
  },
  {
    id: "immersive_residual",
    label: "Immersive residual",
    plain: "Full 3D walkthrough / WebGL scene is not shipped — readiness only.",
  },
] as const;

export function prefersReducedMotion(
  matchMedia: ((query: string) => { matches: boolean }) | null | undefined =
    typeof window !== "undefined" ? window.matchMedia.bind(window) : null,
): boolean {
  if (!matchMedia) return false;
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Resolve spatial render mode.
 * - reduced motion → flat_2d always
 * - otherwise → depth_css (CSS perspective / subtle transform — not WebGL)
 * - immersive is never auto-selected (residual)
 */
export function resolveSpatialMode(opts: {
  reducedMotion: boolean;
  /** User/org preference to disable depth even when motion is fine. */
  depthEnabled?: boolean;
}): SpatialMode {
  if (opts.reducedMotion) return "flat_2d";
  if (opts.depthEnabled === false) return "flat_2d";
  return "depth_css";
}

export function spatialModeLabel(mode: SpatialMode): string {
  switch (mode) {
    case "flat_2d":
      return "Flat 2D (reduced motion or depth off)";
    case "depth_css":
      return "Optional CSS depth (purposeful presence)";
    case "immersive_residual":
      return "Immersive 3D residual — not shipped";
    default:
      return "Unknown";
  }
}

/** True when mode is product-ready for live (not immersive residual). */
export function isSpatialProductReady(mode: SpatialMode): boolean {
  return mode === "flat_2d" || mode === "depth_css";
}

export const D03_IMMERSIVE_RESIDUAL =
  "Immersive 3D / WebGL walkthrough is not shipped. Spatial readiness means " +
  "optional CSS depth + guaranteed 2D under reduced motion — not a VR tour.";
