// FILE: tests/unit/relay-boundary.test.ts
// PURPOSE: T-01 — Relay vs Control Tower boundary contract.

import { describe, expect, it } from "vitest";
import {
  RELAY_BOUNDARY_RULES,
  T01_DOCTRINE,
  T01_RELAY_APP_RESIDUAL,
  claimsRelayMergedIntoCt,
  classifyProductSurface,
  isEmployeePrimaryNavPath,
} from "@/lib/work-os/relay-boundary";

describe("T-01 Relay boundary", () => {
  it("states separate-app doctrine and five rules", () => {
    expect(T01_DOCTRINE).toMatch(/separate|not merged/i);
    expect(RELAY_BOUNDARY_RULES.map((r) => r.id)).toEqual([
      "separate_app",
      "not_slack_clone",
      "ct_shell_clear",
      "foundation_authority",
      "roadmap_honest",
    ]);
    expect(T01_RELAY_APP_RESIDUAL).toMatch(/not built|roadmap|boundary/i);
  });

  it("flags confusion copy that merges Relay into CT", () => {
    expect(claimsRelayMergedIntoCt("Relay is built into Control Tower")).toBe(
      true,
    );
    expect(
      claimsRelayMergedIntoCt("Comms captures meetings under governance"),
    ).toBe(false);
  });

  it("classifies CT vs Relay paths", () => {
    expect(classifyProductSurface("/app")).toBe("control_tower");
    expect(classifyProductSurface("/app/comms")).toBe("control_tower");
    expect(classifyProductSurface("/setup/company-profile")).toBe(
      "control_tower",
    );
    expect(classifyProductSurface("/relay/inbox")).toBe("relay");
  });

  it("recognizes employee primary nav paths", () => {
    expect(isEmployeePrimaryNavPath("/app")).toBe(true);
    expect(isEmployeePrimaryNavPath("/app/voice")).toBe(true);
    expect(isEmployeePrimaryNavPath("/app/action-center")).toBe(true);
    expect(isEmployeePrimaryNavPath("/users")).toBe(false);
    expect(isEmployeePrimaryNavPath("/relay")).toBe(false);
  });
});
