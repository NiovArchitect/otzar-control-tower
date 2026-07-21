// FILE: tests/unit/spatial-readiness.test.ts
// PURPOSE: D-03 — spatial mode resolution + reduced-motion fallback.

import { describe, expect, it } from "vitest";
import {
  D03_DOCTRINE,
  D03_IMMERSIVE_RESIDUAL,
  SPATIAL_READINESS_RULES,
  isSpatialProductReady,
  prefersReducedMotion,
  resolveSpatialMode,
  spatialModeLabel,
} from "@/lib/ambient/spatial-readiness";

describe("D-03 spatial readiness", () => {
  it("states doctrine, 4 rules, immersive residual", () => {
    expect(D03_DOCTRINE).toMatch(/optional|reduced-motion|purposeful/i);
    expect(SPATIAL_READINESS_RULES.map((r) => r.id)).toEqual([
      "purposeful",
      "optional",
      "reduced_motion",
      "immersive_residual",
    ]);
    expect(D03_IMMERSIVE_RESIDUAL).toMatch(/not shipped|WebGL|walkthrough/i);
  });

  it("forces flat_2d under reduced motion", () => {
    expect(
      resolveSpatialMode({ reducedMotion: true, depthEnabled: true }),
    ).toBe("flat_2d");
    expect(
      resolveSpatialMode({ reducedMotion: false, depthEnabled: false }),
    ).toBe("flat_2d");
    expect(
      resolveSpatialMode({ reducedMotion: false, depthEnabled: true }),
    ).toBe("depth_css");
  });

  it("never auto-selects immersive residual as live mode", () => {
    const mode = resolveSpatialMode({ reducedMotion: false });
    expect(mode).not.toBe("immersive_residual");
    expect(isSpatialProductReady(mode)).toBe(true);
    expect(isSpatialProductReady("immersive_residual")).toBe(false);
  });

  it("labels modes and detects matchMedia reduce", () => {
    expect(spatialModeLabel("flat_2d")).toMatch(/Flat 2D/i);
    expect(spatialModeLabel("depth_css")).toMatch(/depth/i);
    expect(
      prefersReducedMotion(() => ({ matches: true })),
    ).toBe(true);
    expect(
      prefersReducedMotion(() => ({ matches: false })),
    ).toBe(false);
  });
});
