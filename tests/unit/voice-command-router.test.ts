// FILE: tests/unit/voice-command-router.test.ts
// PURPOSE: Phase 1253 — locks voice as the remote control: the
//          surface registry covers every core employee surface,
//          admin surfaces are role-gated with a warm refusal, key
//          utterances map to the right place, write-style commands
//          route to GOVERNED surfaces (never direct execution), and
//          unknown commands fall through gracefully.

import { describe, expect, it } from "vitest";
import {
  routeVoiceCommand,
  VOICE_SURFACES,
} from "../../src/lib/voice/command-router";
import type { AuthCapabilities } from "../../src/lib/stores/auth";

const EMPLOYEE: AuthCapabilities = {
  can_read_capsules: true,
  can_write_capsules: true,
  can_share_capsules: false,
  can_admin_org: false,
  can_admin_niov: false,
};
const ADMIN: AuthCapabilities = { ...EMPLOYEE, can_admin_org: true };

describe("Phase 1253 — voice command router", () => {
  it("the registry covers every core employee surface", () => {
    const ids = VOICE_SURFACES.map((s) => s.surface_id);
    for (const required of [
      "my_day",
      "notifications",
      "approvals",
      "comms",
      "meeting_capture",
      "observe",
      "workspaces",
      "people",
      "memory",
      "authority",
    ]) {
      expect(ids).toContain(required);
    }
  });

  it("admin surfaces exist but are role-gated with a warm refusal", () => {
    const adminIds = VOICE_SURFACES.filter((s) => s.admin_only).map(
      (s) => s.surface_id,
    );
    expect(adminIds).toContain("provider_settings");
    expect(adminIds).toContain("production_readiness");
    const blocked = routeVoiceCommand("open provider settings", EMPLOYEE);
    expect(blocked.kind).toBe("ADMIN_BLOCKED");
    if (blocked.kind === "ADMIN_BLOCKED") {
      expect(blocked.spoken).toContain("for admins");
      expect(blocked.spoken).not.toMatch(/denied|forbidden|error/i);
    }
    const allowed = routeVoiceCommand("open provider settings", ADMIN);
    expect(allowed.kind).toBe("NAVIGATE");
    if (allowed.kind === "NAVIGATE") {
      expect(allowed.surface.route).toBe("/connector-rails");
    }
  });

  it("maps the Founder's key utterances to the right surfaces", () => {
    const cases: Array<[string, string]> = [
      ["what needs my approval?", "/app/action-center"],
      ["what matters today", "/app/my-day"],
      ["summarize the meeting", "/app/meeting-captures"],
      ["read this screen for me", "/app/observe"],
      ["who should we onboard next", "/app/collaboration"],
      ["save this to memory", "/app/my-twin"],
      ["why am I blocked", "/app/authority-grants"],
      ["open the launch workspace", "/app/collaboration-workspaces"],
    ];
    for (const [utterance, route] of cases) {
      const r = routeVoiceCommand(utterance, EMPLOYEE);
      expect(r.kind, utterance).toBe("NAVIGATE");
      if (r.kind === "NAVIGATE") expect(r.surface.route, utterance).toBe(route);
    }
  });

  it("write-style commands route to governed surfaces — the router never executes", () => {
    for (const utterance of [
      "approve that",
      "save this to memory",
      "draft the follow-up",
    ]) {
      const r = routeVoiceCommand(utterance, EMPLOYEE);
      expect(r.kind, utterance).toBe("NAVIGATE");
      if (r.kind === "NAVIGATE") {
        expect(r.surface.kind).toBe("GOVERNED_WRITE_SURFACE");
      }
    }
  });

  it("'make a transaction' routes admins to readiness truth — never real funds", () => {
    const r = routeVoiceCommand("make a transaction", ADMIN);
    expect(r.kind).toBe("NAVIGATE");
    if (r.kind === "NAVIGATE") {
      expect(r.surface.route).toBe("/onboarding");
      expect(r.spoken).toContain("mock-only");
    }
    // Employees don't get the admin readiness surface.
    expect(routeVoiceCommand("make a transaction", EMPLOYEE).kind).toBe(
      "ADMIN_BLOCKED",
    );
  });

  it("'call samiksha on work comms' routes to the comms surface (no fake live calling)", () => {
    const r = routeVoiceCommand("call Samiksha on work comms", EMPLOYEE);
    expect(r.kind).toBe("NAVIGATE");
    if (r.kind === "NAVIGATE") expect(r.surface.surface_id).toBe("comms");
  });

  it("unknown commands fall through to the conversational path, never crash", () => {
    expect(routeVoiceCommand("xyzzy plugh quux", EMPLOYEE)).toEqual({
      kind: "NO_MATCH",
    });
    expect(routeVoiceCommand("", EMPLOYEE)).toEqual({ kind: "NO_MATCH" });
    expect(routeVoiceCommand("hm", null)).toEqual({ kind: "NO_MATCH" });
  });

  it("registry copy stays plain — no developer vocabulary in acks", () => {
    for (const s of VOICE_SURFACES) {
      for (const banned of ["COSMP", "capsule_id", "wallet_id", "payload", "DMW object", "schema"]) {
        expect(s.ack, s.surface_id).not.toContain(banned);
      }
    }
  });
});
