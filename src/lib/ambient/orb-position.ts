// FILE: orb-position.ts
// PURPOSE: P0H — pure position logic for the draggable Talk-to-Otzar
//          orb (clamp / snap / validate / persist / default). The orb
//          must never block primary CTAs, so the employee can drag it
//          anywhere; it snaps to the nearest horizontal edge, keeps
//          its vertical position, persists per device, and resets to
//          the default bottom-right when a stored position no longer
//          fits the current viewport.
//
//          Lives outside the React tree so every rule is unit-testable
//          without rendering the 4.8k-line AmbientOtzarBar.
//
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx (collapsed orb
//          drag + expanded dock anchoring), tests/unit/orb-position.test.ts.

/** localStorage key for the per-device orb position. Versioned so a
 *  future shape change can migrate cleanly instead of half-parsing. */
export const ORB_POSITION_STORAGE_KEY = "otzar.orb.position.v1";

/** Minimum gap between the orb and the viewport edge (px). Applied on
 *  top of the device safe-area insets (see orbPositionToStyle). */
export const ORB_EDGE_MARGIN = 16;

/** Pointer must travel at least this many px before a press counts as
 *  a drag — below it, the press stays a click (expand the dock). */
export const ORB_DRAG_THRESHOLD_PX = 6;

/** A resting orb position: snapped to one horizontal edge, with the
 *  vertical position stored as distance from the viewport bottom so it
 *  stays stable when content above changes. */
export interface OrbPosition {
  edge: "left" | "right";
  /** px from the viewport bottom to the orb's bottom edge. */
  bottom: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface OrbSize {
  width: number;
  height: number;
}

/** Reasonable fallback footprint for clamping before the orb has been
 *  measured (the collapsed pill is ~48px tall). */
export const DEFAULT_ORB_SIZE: OrbSize = { width: 160, height: 48 };

// WHAT: clamp a free drag point so the orb stays fully on-screen.
// INPUT: the orb's intended top-left point, viewport, orb footprint.
// OUTPUT: a point inside [margin, viewport - orb - margin] on both axes.
// WHY: during a drag the orb follows the pointer freely; this keeps it
//      from being parked (and lost) off-screen.
export function clampOrbPoint(
  x: number,
  y: number,
  viewport: ViewportSize,
  orb: OrbSize = DEFAULT_ORB_SIZE,
  margin: number = ORB_EDGE_MARGIN,
): { x: number; y: number } {
  const maxX = Math.max(margin, viewport.width - orb.width - margin);
  const maxY = Math.max(margin, viewport.height - orb.height - margin);
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
  };
}

// WHAT: pick the horizontal edge nearest to the orb's center.
// INPUT: the orb's top-left x, its width, and the viewport width.
// OUTPUT: "left" | "right".
// WHY: releasing a drag snaps to an edge so the orb never floats over
//      mid-page content (where it would block CTAs).
export function snapToNearestEdge(
  x: number,
  viewportWidth: number,
  orbWidth: number = DEFAULT_ORB_SIZE.width,
): "left" | "right" {
  const center = x + orbWidth / 2;
  return center < viewportWidth / 2 ? "left" : "right";
}

// WHAT: convert a released drag point into a resting OrbPosition.
// INPUT: the (already free) drop point, viewport, orb footprint.
// OUTPUT: an edge-snapped, vertically-clamped OrbPosition.
// WHY: single conversion used by pointer-up, so drag math and resting
//      math can never disagree.
export function snapOrbPosition(
  x: number,
  y: number,
  viewport: ViewportSize,
  orb: OrbSize = DEFAULT_ORB_SIZE,
  margin: number = ORB_EDGE_MARGIN,
): OrbPosition {
  const clamped = clampOrbPoint(x, y, viewport, orb, margin);
  return {
    edge: snapToNearestEdge(clamped.x, viewport.width, orb.width),
    bottom: Math.round(viewport.height - clamped.y - orb.height),
  };
}

// WHAT: check whether pointer travel counts as a drag (vs a click).
// INPUT: deltas from pointer-down, optional threshold.
// OUTPUT: true once the pointer moved past the threshold on either axis.
// WHY: keeps click-to-expand working — a shaky tap is still a tap.
export function isDragThresholdExceeded(
  dx: number,
  dy: number,
  threshold: number = ORB_DRAG_THRESHOLD_PX,
): boolean {
  return Math.abs(dx) > threshold || Math.abs(dy) > threshold;
}

// WHAT: validate a stored (untrusted) value as an on-screen OrbPosition.
// INPUT: anything JSON.parse produced + the CURRENT viewport + orb size.
// OUTPUT: a safe OrbPosition, or null → caller uses the default
//         bottom-right (the pre-P0H classes, unchanged).
// WHY: a position saved on a large monitor can be off-screen on a
//      laptop; malformed storage must never wedge the orb off-screen.
export function validateStoredOrbPosition(
  raw: unknown,
  viewport: ViewportSize,
  orb: OrbSize = DEFAULT_ORB_SIZE,
  margin: number = ORB_EDGE_MARGIN,
): OrbPosition | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as { edge?: unknown; bottom?: unknown };
  if (candidate.edge !== "left" && candidate.edge !== "right") return null;
  if (typeof candidate.bottom !== "number" || !Number.isFinite(candidate.bottom)) {
    return null;
  }
  const maxBottom = viewport.height - orb.height - margin;
  if (maxBottom < margin) return null; // viewport too small to place anything
  if (candidate.bottom < 0 || candidate.bottom > maxBottom) return null;
  return { edge: candidate.edge, bottom: Math.round(candidate.bottom) };
}

// WHAT: parse the raw localStorage string into a validated OrbPosition.
// INPUT: localStorage.getItem(...) result + current viewport.
// OUTPUT: OrbPosition or null (→ default position).
// WHY: one guarded entry point — JSON errors and off-screen values both
//      collapse to "use the default", never a crash.
export function parseStoredOrbPosition(
  json: string | null,
  viewport: ViewportSize,
  orb: OrbSize = DEFAULT_ORB_SIZE,
): OrbPosition | null {
  if (json === null || json.length === 0) return null;
  try {
    return validateStoredOrbPosition(JSON.parse(json), viewport, orb);
  } catch {
    return null;
  }
}

// WHAT: serialize an OrbPosition for storage.
// INPUT: the resting position.
// OUTPUT: the JSON string to write under ORB_POSITION_STORAGE_KEY.
// WHY: pairs with parseStoredOrbPosition so the shape stays versioned
//      in exactly one module.
export function serializeOrbPosition(pos: OrbPosition): string {
  return JSON.stringify({ edge: pos.edge, bottom: pos.bottom });
}

// WHAT: turn a resting OrbPosition into fixed-position CSS.
// INPUT: the position.
// OUTPUT: a style object anchoring the orb to its edge with safe-area
//         insets respected (env(safe-area-inset-*)).
// WHY: inline styles override the default Tailwind anchor classes only
//      when the employee actually moved the orb.
export function orbPositionToStyle(pos: OrbPosition): {
  left?: string;
  right?: string;
  bottom: string;
} {
  const horizontal = `calc(env(safe-area-inset-${pos.edge}, 0px) + ${ORB_EDGE_MARGIN}px)`;
  return {
    ...(pos.edge === "left" ? { left: horizontal } : { right: horizontal }),
    bottom: `calc(env(safe-area-inset-bottom, 0px) + ${pos.bottom}px)`,
  };
}

// WHAT: derive the expanded dock's bottom anchor from the orb position.
// INPUT: the orb's stored bottom offset + current viewport height.
// OUTPUT: a bottom offset that keeps the max-h-[88vh] dock fully
//         on-screen (dock grows upward from its bottom anchor).
// WHY: the dock opens at the orb's edge; if the orb sits high up, an
//      unclamped anchor would push the dock's top past the viewport.
export function clampDockBottom(
  orbBottom: number,
  viewportHeight: number,
): number {
  // The dock may occupy up to 88vh; leave the remaining 12vh (minus a
  // small breath) as the maximum bottom offset.
  const maxBottom = Math.max(0, Math.floor(viewportHeight * 0.12) - 8);
  return Math.min(Math.max(orbBottom, 0), maxBottom);
}
