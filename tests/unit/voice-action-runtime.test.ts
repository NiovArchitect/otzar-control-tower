// FILE: tests/unit/voice-action-runtime.test.ts
// PURPOSE: Phase 1264 Addendum (Parts J/K/O) — locks the deterministic
//          Voice Action Runtime: internal navigation, connector-status
//          navigation, SAFE external-URL open (http/https only, all
//          dangerous schemes blocked), draft-only/approval-gated comms,
//          and the governed-chat fall-through. Admin-only destinations
//          are role-gated.

import { describe, expect, it } from "vitest";
import {
  classifyVoiceAction,
  classifyUrlCandidate,
  safeOpenExternalUrl,
} from "../../src/lib/voice/voice-action-runtime";
import type { AuthCapabilities } from "../../src/lib/stores/auth";

const ADMIN: AuthCapabilities = {
  can_read_capsules: true,
  can_write_capsules: true,
  can_share_capsules: true,
  can_admin_org: true,
  can_admin_niov: false,
};
const EMPLOYEE: AuthCapabilities = {
  can_read_capsules: true,
  can_write_capsules: true,
  can_share_capsules: false,
  can_admin_org: false,
  can_admin_niov: false,
};

describe("classifyUrlCandidate — safe URL allowlist", () => {
  it("accepts an explicit https URL", () => {
    expect(classifyUrlCandidate("navigate to https://example.com/path")).toEqual({
      state: "ok",
      url: "https://example.com/path",
    });
  });

  it("normalizes a bare domain with open intent to https", () => {
    const r = classifyUrlCandidate("open niovlabs.com");
    expect(r.state).toBe("ok");
    if (r.state === "ok") expect(r.url).toBe("https://niovlabs.com/");
  });

  it("blocks javascript:, file:, data:, shell:, command: schemes", () => {
    for (const bad of [
      "open javascript:alert(1)",
      "open file:///etc/passwd",
      "open data:text/html,hi",
      "open shell:whoami",
      "open command:rm",
    ]) {
      expect(classifyUrlCandidate(bad).state).toBe("blocked");
    }
  });

  it("does not treat an ordinary sentence as a URL", () => {
    expect(classifyUrlCandidate("summarize what I should do next").state).toBe(
      "none",
    );
  });
});

describe("classifyVoiceAction — navigation + actions", () => {
  it("'take me to connectors' → internal navigation to Workspace connections", () => {
    const a = classifyVoiceAction("Take me to connectors.", ADMIN);
    expect(a.kind).toBe("INTERNAL_NAVIGATION");
    expect(a.route).toBe("/connector-rails");
  });

  it("'show me voice providers' → Voice Providers", () => {
    const a = classifyVoiceAction("Show me voice providers.", ADMIN);
    expect(a.kind).toBe("INTERNAL_NAVIGATION");
    expect(a.route).toBe("/voice-providers");
  });

  it("'open system health' → System Health", () => {
    const a = classifyVoiceAction("Open system health.", ADMIN);
    expect(a.kind).toBe("INTERNAL_NAVIGATION");
    expect(a.route).toBe("/system-health");
  });

  it("'show Slack verification' → connector-status nav, never auto-verifies", () => {
    const a = classifyVoiceAction("Show me Slack verification.", ADMIN);
    expect(a.kind).toBe("CONNECTOR_STATUS_NAVIGATION");
    expect(a.route).toBe("/connector-rails?provider=slack");
    expect(a.provider).toBe("slack");
    expect(a.spoken.toLowerCase()).toContain("won't run verification");
  });

  it("admin-only destination is blocked for a non-admin employee", () => {
    const a = classifyVoiceAction("Open system health.", EMPLOYEE);
    expect(a.kind).toBe("ADMIN_BLOCKED");
    expect(a.route).toBeUndefined();
  });

  it("'open niovlabs.com' → external URL open with browser confirmation", () => {
    const a = classifyVoiceAction("Open niovlabs.com", EMPLOYEE);
    expect(a.kind).toBe("EXTERNAL_URL_OPEN");
    expect(a.url).toBe("https://niovlabs.com/");
    expect(a.spoken.toLowerCase()).toContain("niovlabs.com");
  });

  it("'open javascript:alert' → blocked unsafe URL", () => {
    const a = classifyVoiceAction("Open javascript:alert(1)", EMPLOYEE);
    expect(a.kind).toBe("BLOCKED_URL");
    expect(a.blockedReason).toContain("unsafe URL protocol");
  });

  it("'ask Otzar what I should do next' → governed chat passthrough", () => {
    const a = classifyVoiceAction("What should I do next?", EMPLOYEE);
    expect(a.kind).toBe("GOVERNED_CHAT");
    expect(a.transcript).toBe("What should I do next?");
  });

  it("'send David a message' → draft-only, needs confirmation, no auto-send", () => {
    const a = classifyVoiceAction("Send David this message.", EMPLOYEE);
    expect(a.kind).toBe("DRAFT_ONLY");
    expect(a.needsConfirmation).toBe(true);
    expect(a.spoken.toLowerCase()).toContain("approval");
  });

  it("'draft a message to David' → draft-only without forced confirmation", () => {
    const a = classifyVoiceAction("Draft a message to David.", EMPLOYEE);
    expect(a.kind).toBe("DRAFT_ONLY");
    expect(a.needsConfirmation).toBe(false);
  });
});

describe("safeOpenExternalUrl — protocol re-validation at the boundary", () => {
  it("refuses a non-http(s) URL even if passed directly", () => {
    expect(safeOpenExternalUrl("file:///etc/passwd")).toBe("NEEDS_LINK");
  });
});

// ── HARD REGRESSION GUARD (the live failure) ────────────────────────
// "Take me to the onboarding screen" was answered by Sadeil's Twin
// ("I can't navigate your UI…") instead of navigating. These lock the
// deterministic interception so it can never regress.
describe("onboarding/setup navigation regression guard", () => {
  it("'Take me to the onboarding screen.' → INTERNAL_NAVIGATION, NOT chat", () => {
    const a = classifyVoiceAction("Take me to the onboarding screen.", ADMIN);
    expect(a.kind).toBe("INTERNAL_NAVIGATION");
    expect(a.kind).not.toBe("GOVERNED_CHAT");
    expect(a.route).toBe("/onboarding");
    expect(a.spoken.toLowerCase()).toContain("onboarding");
  });

  it("'Open onboarding.' → INTERNAL_NAVIGATION", () => {
    expect(classifyVoiceAction("Open onboarding.", ADMIN).kind).toBe(
      "INTERNAL_NAVIGATION",
    );
  });

  it("'Go to setup.' → INTERNAL_NAVIGATION", () => {
    expect(classifyVoiceAction("Go to setup.", ADMIN).kind).toBe(
      "INTERNAL_NAVIGATION",
    );
  });

  it("'Show me onboarding.' → INTERNAL_NAVIGATION", () => {
    expect(classifyVoiceAction("Show me onboarding.", ADMIN).kind).toBe(
      "INTERNAL_NAVIGATION",
    );
  });

  it("'Continue onboarding.' → INTERNAL_NAVIGATION (non-generic verb)", () => {
    expect(classifyVoiceAction("Continue onboarding.", ADMIN).kind).toBe(
      "INTERNAL_NAVIGATION",
    );
  });

  it("'How do I complete onboarding?' → GOVERNED_CHAT (a question, not nav)", () => {
    const a = classifyVoiceAction("How do I complete onboarding?", ADMIN);
    expect(a.kind).toBe("GOVERNED_CHAT");
  });

  it("employee onboarding nav lands on the employee onboarding route", () => {
    const a = classifyVoiceAction("Take me to the onboarding screen.", EMPLOYEE);
    expect(a.kind).toBe("INTERNAL_NAVIGATION");
    expect(a.route).toBe("/app/onboarding-readiness");
  });
});

describe("expanded deterministic navigation map", () => {
  it("admin surfaces resolve to real routes", () => {
    expect(classifyVoiceAction("open workflows", ADMIN).route).toBe("/workflows");
    expect(classifyVoiceAction("go to retention", ADMIN).route).toBe("/retention");
    expect(classifyVoiceAction("open data knowledge", ADMIN).route).toBe(
      "/data-knowledge",
    );
  });
  it("employee surfaces resolve to real routes", () => {
    expect(classifyVoiceAction("take me to corrections", EMPLOYEE).route).toBe(
      "/app/corrections",
    );
    expect(classifyVoiceAction("open conversations", EMPLOYEE).route).toBe(
      "/app/conversations",
    );
    expect(classifyVoiceAction("go to preferences", EMPLOYEE).route).toBe(
      "/app/preferences",
    );
  });
});

describe("UNSUPPORTED guardrail — never hand screen-nav to the LLM", () => {
  it("an unknown 'X screen' request → UNSUPPORTED, not GOVERNED_CHAT", () => {
    const a = classifyVoiceAction("Take me to the holodeck screen.", ADMIN);
    expect(a.kind).toBe("UNSUPPORTED");
    expect(a.kind).not.toBe("GOVERNED_CHAT");
    expect(a.spoken.toLowerCase()).toContain("can't open that screen");
  });

  it("a plain question with no screen/page word still reaches chat", () => {
    expect(classifyVoiceAction("What should I do next?", EMPLOYEE).kind).toBe(
      "GOVERNED_CHAT",
    );
  });
});
