// FILE: tests/unit/orb-position.test.ts
// PURPOSE: PROD-UX-P0H — full coverage of the pure draggable-orb position
//          logic (clamp / snap / drag-threshold / validate / persist /
//          style / dock anchoring). Locks the product guarantees: the orb
//          can never be parked off-screen, a stored position that no
//          longer fits the CURRENT viewport resets to the default, a tap
//          is never mistaken for a drag, and the expanded dock's anchor
//          always keeps the 88vh panel on-screen.

import { describe, expect, it } from "vitest";
import {
  clampDockBottom,
  clampOrbPoint,
  isDragThresholdExceeded,
  ORB_DRAG_THRESHOLD_PX,
  ORB_EDGE_MARGIN,
  orbPositionToStyle,
  parseStoredOrbPosition,
  serializeOrbPosition,
  snapOrbPosition,
  snapToNearestEdge,
  validateStoredOrbPosition,
} from "@/lib/ambient/orb-position";

const VIEWPORT = { width: 1280, height: 800 };
const ORB = { width: 160, height: 48 };

describe("orb-position — clampOrbPoint", () => {
  it("keeps an in-bounds point unchanged", () => {
    expect(clampOrbPoint(400, 300, VIEWPORT, ORB)).toEqual({ x: 400, y: 300 });
  });

  it("clamps a point dragged past the left/top edges to the margin", () => {
    expect(clampOrbPoint(-500, -500, VIEWPORT, ORB)).toEqual({
      x: ORB_EDGE_MARGIN,
      y: ORB_EDGE_MARGIN,
    });
  });

  it("clamps a point dragged past the right/bottom edges so the orb stays fully visible", () => {
    const out = clampOrbPoint(99999, 99999, VIEWPORT, ORB);
    expect(out.x).toBe(VIEWPORT.width - ORB.width - ORB_EDGE_MARGIN);
    expect(out.y).toBe(VIEWPORT.height - ORB.height - ORB_EDGE_MARGIN);
  });

  it("degrades safely on a viewport smaller than the orb (never negative bounds)", () => {
    const tiny = { width: 100, height: 40 };
    const out = clampOrbPoint(50, 20, tiny, ORB);
    expect(out.x).toBe(ORB_EDGE_MARGIN);
    expect(out.y).toBe(ORB_EDGE_MARGIN);
  });
});

describe("orb-position — snapToNearestEdge", () => {
  it("snaps left when the orb center sits in the left half", () => {
    expect(snapToNearestEdge(100, VIEWPORT.width, ORB.width)).toBe("left");
  });

  it("snaps right when the orb center sits in the right half", () => {
    expect(snapToNearestEdge(900, VIEWPORT.width, ORB.width)).toBe("right");
  });

  it("an exactly-centered orb snaps right (deterministic tie-break)", () => {
    const centeredX = VIEWPORT.width / 2 - ORB.width / 2;
    expect(snapToNearestEdge(centeredX, VIEWPORT.width, ORB.width)).toBe(
      "right",
    );
  });
});

describe("orb-position — snapOrbPosition", () => {
  it("converts a drop point into an edge + bottom-offset resting position", () => {
    const pos = snapOrbPosition(100, 300, VIEWPORT, ORB);
    expect(pos.edge).toBe("left");
    // bottom = viewport.height - y - orb.height = 800 - 300 - 48
    expect(pos.bottom).toBe(452);
  });

  it("clamps an off-screen drop before snapping (never a lost orb)", () => {
    const pos = snapOrbPosition(99999, 99999, VIEWPORT, ORB);
    expect(pos.edge).toBe("right");
    expect(pos.bottom).toBe(ORB_EDGE_MARGIN);
  });

  it("drag math and resting math agree: re-snapping a snapped position is a no-op", () => {
    const first = snapOrbPosition(500, 200, VIEWPORT, ORB);
    const y = VIEWPORT.height - first.bottom - ORB.height;
    const x = first.edge === "left" ? ORB_EDGE_MARGIN : VIEWPORT.width - ORB.width - ORB_EDGE_MARGIN;
    expect(snapOrbPosition(x, y, VIEWPORT, ORB)).toEqual(first);
  });
});

describe("orb-position — isDragThresholdExceeded", () => {
  it("a shaky tap below the threshold stays a click", () => {
    expect(isDragThresholdExceeded(ORB_DRAG_THRESHOLD_PX, 0)).toBe(false);
    expect(isDragThresholdExceeded(0, -ORB_DRAG_THRESHOLD_PX)).toBe(false);
  });

  it("movement past the threshold on either axis counts as a drag", () => {
    expect(isDragThresholdExceeded(ORB_DRAG_THRESHOLD_PX + 1, 0)).toBe(true);
    expect(isDragThresholdExceeded(0, -(ORB_DRAG_THRESHOLD_PX + 1))).toBe(true);
  });
});

describe("orb-position — validateStoredOrbPosition", () => {
  it("accepts a well-formed on-screen position", () => {
    expect(
      validateStoredOrbPosition({ edge: "left", bottom: 200 }, VIEWPORT, ORB),
    ).toEqual({ edge: "left", bottom: 200 });
  });

  it("rejects malformed shapes (null, arrays, wrong edge, non-finite bottom)", () => {
    expect(validateStoredOrbPosition(null, VIEWPORT, ORB)).toBeNull();
    expect(validateStoredOrbPosition("junk", VIEWPORT, ORB)).toBeNull();
    expect(validateStoredOrbPosition([1, 2], VIEWPORT, ORB)).toBeNull();
    expect(
      validateStoredOrbPosition({ edge: "top", bottom: 10 }, VIEWPORT, ORB),
    ).toBeNull();
    expect(
      validateStoredOrbPosition({ edge: "left", bottom: NaN }, VIEWPORT, ORB),
    ).toBeNull();
    expect(
      validateStoredOrbPosition({ edge: "left", bottom: "10" }, VIEWPORT, ORB),
    ).toBeNull();
  });

  it("rejects a position saved on a taller monitor that is off-screen HERE", () => {
    // Saved at bottom=900 on a big display; this laptop is 800px tall.
    expect(
      validateStoredOrbPosition({ edge: "right", bottom: 900 }, VIEWPORT, ORB),
    ).toBeNull();
  });

  it("rejects negative bottoms and a viewport too small to place the orb", () => {
    expect(
      validateStoredOrbPosition({ edge: "left", bottom: -5 }, VIEWPORT, ORB),
    ).toBeNull();
    expect(
      validateStoredOrbPosition(
        { edge: "left", bottom: 10 },
        { width: 60, height: 60 },
        ORB,
      ),
    ).toBeNull();
  });
});

describe("orb-position — parse / serialize round-trip", () => {
  it("round-trips a valid position through storage", () => {
    const pos = { edge: "left" as const, bottom: 240 };
    expect(parseStoredOrbPosition(serializeOrbPosition(pos), VIEWPORT, ORB)).toEqual(pos);
  });

  it("collapses null / empty / invalid JSON / off-screen values to null — never a crash", () => {
    expect(parseStoredOrbPosition(null, VIEWPORT, ORB)).toBeNull();
    expect(parseStoredOrbPosition("", VIEWPORT, ORB)).toBeNull();
    expect(parseStoredOrbPosition("{not json", VIEWPORT, ORB)).toBeNull();
    expect(
      parseStoredOrbPosition(
        JSON.stringify({ edge: "right", bottom: 99999 }),
        VIEWPORT,
        ORB,
      ),
    ).toBeNull();
  });
});

describe("orb-position — orbPositionToStyle", () => {
  it("anchors to the left edge with safe-area-aware CSS (no `right` key)", () => {
    const style = orbPositionToStyle({ edge: "left", bottom: 120 });
    expect(style.left).toContain("safe-area-inset-left");
    expect(style.left).toContain(`${ORB_EDGE_MARGIN}px`);
    expect(style).not.toHaveProperty("right");
    expect(style.bottom).toContain("safe-area-inset-bottom");
    expect(style.bottom).toContain("120px");
  });

  it("anchors to the right edge with safe-area-aware CSS (no `left` key)", () => {
    const style = orbPositionToStyle({ edge: "right", bottom: 32 });
    expect(style.right).toContain("safe-area-inset-right");
    expect(style).not.toHaveProperty("left");
  });
});

describe("orb-position — clampDockBottom", () => {
  it("keeps a low orb anchor as-is (dock fits)", () => {
    // 12vh of 800 = 96; minus breath 8 → max 88.
    expect(clampDockBottom(40, 800)).toBe(40);
  });

  it("clamps a high orb anchor so the 88vh dock stays on-screen", () => {
    expect(clampDockBottom(600, 800)).toBe(88);
  });

  it("never returns a negative anchor", () => {
    expect(clampDockBottom(-20, 800)).toBe(0);
    expect(clampDockBottom(10, 50)).toBe(0);
  });
});
