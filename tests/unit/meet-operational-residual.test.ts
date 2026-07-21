// FILE: tests/unit/meet-operational-residual.test.ts
// PURPOSE: N-02 — Meet operational residual honesty contract.

import { describe, expect, it } from "vitest";
import {
  N02_DOCTRINE,
  N02_OPERATOR_STEPS,
  N02_RESIDUAL_COPY,
  N02_STATUS,
  claimsMeetFullyOperational,
  meetModeLabel,
  resolveMeetOperationalMode,
} from "@/lib/work-os/meet-operational-residual";

describe("N-02 Meet operational residual", () => {
  it("states externally blocked doctrine and operator steps", () => {
    expect(N02_STATUS).toBe("EXTERNALLY_BLOCKED");
    expect(N02_DOCTRINE).toMatch(/oauth|never claim|paste/i);
    expect(N02_OPERATOR_STEPS.map((s) => s.id)).toEqual([
      "open_tools",
      "reauth_scopes",
      "verify_ambient",
      "paste_fallback",
    ]);
    expect(N02_RESIDUAL_COPY).toMatch(/EXTERNALLY_BLOCKED|operator/i);
  });

  it("resolves modes without false provider proven by default", () => {
    expect(resolveMeetOperationalMode({})).toBe("externally_blocked");
    expect(resolveMeetOperationalMode({ needsReconnect: true })).toBe(
      "reconnect_needed",
    );
    expect(resolveMeetOperationalMode({ providerProven: true })).toBe(
      "provider_proven",
    );
    expect(meetModeLabel("externally_blocked")).toMatch(/blocked|oauth/i);
  });

  it("flags false complete Meet claims", () => {
    expect(
      claimsMeetFullyOperational("Meet transcripts fully operational"),
    ).toBe(true);
    expect(
      claimsMeetFullyOperational("Reconnect Google Meet in Tools"),
    ).toBe(false);
  });
});
