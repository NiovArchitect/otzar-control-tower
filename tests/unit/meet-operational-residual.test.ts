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
  it("states honest reconnect doctrine and operator steps (human copy)", () => {
    expect(N02_STATUS).toBe("EXTERNALLY_BLOCKED");
    expect(N02_DOCTRINE).toMatch(/reconnect|paste|not claim|permissions/i);
    expect(N02_DOCTRINE).not.toMatch(/EXTERNALLY_BLOCKED|PROVIDER_PROVEN/i);
    expect(N02_OPERATOR_STEPS.map((s) => s.id)).toEqual([
      "open_tools",
      "reauth_scopes",
      "verify_ambient",
      "paste_fallback",
    ]);
    expect(N02_OPERATOR_STEPS[0]?.plain).toMatch(/Connections/i);
    expect(N02_OPERATOR_STEPS[0]?.plain).not.toMatch(/Tools & Connections/i);
    expect(N02_RESIDUAL_COPY).toMatch(/paste|reconnect|not claim|transcript/i);
    expect(N02_RESIDUAL_COPY).not.toMatch(/EXTERNALLY_BLOCKED|N-02/i);
  });

  it("resolves modes without false provider proven by default", () => {
    expect(resolveMeetOperationalMode({})).toBe("externally_blocked");
    expect(resolveMeetOperationalMode({ needsReconnect: true })).toBe(
      "reconnect_needed",
    );
    expect(resolveMeetOperationalMode({ providerProven: true })).toBe(
      "provider_proven",
    );
    expect(meetModeLabel("externally_blocked")).toMatch(
      /not fully connected|finish google|setup/i,
    );
  });

  it("flags false complete Meet claims", () => {
    expect(
      claimsMeetFullyOperational("Meet transcripts fully operational"),
    ).toBe(true);
    expect(
      claimsMeetFullyOperational("Reconnect Google Meet in Connections"),
    ).toBe(false);
  });
});
