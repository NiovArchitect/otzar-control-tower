// FILE: tests/unit/presence-intensity.test.ts
// PURPOSE: [OTZAR-LIVE-6] Lock the presence-intensity model — presence must be
//          KNOWN but CALIBRATED. Idle stays ambient (barely-there); work is
//          softly noticeable; a needed answer / approval / blocker rises to
//          attention; only real failure is critical. This is the single mapping
//          the whole glass interface scales from, so it must be deterministic.
// CONNECTS TO: src/lib/stores/presence.ts (presenceIntensity).

import { describe, it, expect } from "vitest";
import {
  presenceIntensity,
  type OtzarPresenceState,
  type PresenceIntensity,
} from "@/lib/stores/presence";

const EXPECTED: Record<OtzarPresenceState, PresenceIntensity> = {
  IDLE: "ambient",
  QUIET: "ambient",
  LISTENING: "working",
  THINKING: "working",
  RECOMMENDATION: "working",
  SUCCESS: "working",
  APPROVAL_REQUIRED: "attention",
  BLOCKED: "attention",
  FAILURE: "critical",
};

describe("presenceIntensity — calibrated, not scattered", () => {
  it("maps every presence state to its intensity tier", () => {
    for (const [state, intensity] of Object.entries(EXPECTED) as Array<
      [OtzarPresenceState, PresenceIntensity]
    >) {
      expect(presenceIntensity(state), state).toBe(intensity);
    }
  });

  it("keeps idle + quiet ambient (barely-there, never loud)", () => {
    expect(presenceIntensity("IDLE")).toBe("ambient");
    expect(presenceIntensity("QUIET")).toBe("ambient");
  });

  it("raises approval + blocker to attention (the human needs to act)", () => {
    expect(presenceIntensity("APPROVAL_REQUIRED")).toBe("attention");
    expect(presenceIntensity("BLOCKED")).toBe("attention");
  });

  it("reserves critical for real failure only", () => {
    expect(presenceIntensity("FAILURE")).toBe("critical");
    // Working states are never critical (no false alarms).
    for (const s of ["LISTENING", "THINKING", "SUCCESS", "RECOMMENDATION"] as const) {
      expect(presenceIntensity(s)).not.toBe("critical");
    }
  });
});
