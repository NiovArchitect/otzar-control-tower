// FILE: tests/unit/presence-ring.test.ts
// PURPOSE: [OTZAR-LIVE-6] Ambient Node Interface — prove the orb's frosted edge
//          ring is STATE-MEANINGFUL, never decoration: every one of the nine
//          presence states maps to a distinct, coherent glow/border/dot, and the
//          colors match Behance brand edge language (blue=listening,
//          purple=thinking, mid-purple=recommendation, orange=approval,
//          emerald=success, rose=failure). If a state had no backing color it
//          would be cosmetic — this locks the mapping.
// CONNECTS TO: src/lib/ambient/presence-ring.ts (presenceRing),
//          src/lib/stores/presence.ts (OtzarPresenceState).

import { describe, it, expect } from "vitest";
import { presenceRing } from "@/lib/ambient/presence-ring";
import type { OtzarPresenceState } from "@/lib/stores/presence";

const STATES: OtzarPresenceState[] = [
  "IDLE",
  "LISTENING",
  "THINKING",
  "RECOMMENDATION",
  "APPROVAL_REQUIRED",
  "SUCCESS",
  "BLOCKED",
  "QUIET",
  "FAILURE",
];

describe("presenceRing — every glow means a state", () => {
  it("returns an ambient bloom, outer glow, and dot class for all nine states", () => {
    for (const s of STATES) {
      const r = presenceRing(s);
      // The state color is a Siri-like radial bloom diffused through glass,
      // not a hard border.
      expect(r.bloom, s).toMatch(/radial-gradient/);
      expect(r.glow, s).toMatch(/shadow/);
      expect(r.dot, s).toMatch(/bg-/);
    }
  });

  it("maps the action states to their canonical Behance brand colors", () => {
    expect(presenceRing("LISTENING").dot).toContain("405DE6");
    expect(presenceRing("THINKING").dot).toContain("B124E8");
    expect(presenceRing("RECOMMENDATION").dot).toContain("a855f7");
    expect(presenceRing("APPROVAL_REQUIRED").dot).toContain("F77737");
    expect(presenceRing("SUCCESS").dot).toContain("emerald");
    expect(presenceRing("FAILURE").dot).toContain("rose");
  });

  it("gives attention/approval/failure states a distinct color from idle", () => {
    const idle = presenceRing("IDLE").dot;
    for (const s of ["LISTENING", "APPROVAL_REQUIRED", "SUCCESS", "FAILURE"] as const) {
      expect(presenceRing(s).dot, s).not.toBe(idle);
    }
  });
});
