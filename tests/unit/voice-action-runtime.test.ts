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

describe("Phase 1284 Wave 2 — 'tell X …' routes to the human-authority draft card", () => {
  it("classifies the EXACT failing phrase as a direct internal message to David", () => {
    const a = classifyVoiceAction(
      "Tell David I said good morning and looking forward to seeing his progress on what he is working on.",
      ADMIN,
    );
    // Must route to the draft-card path (executeMessageAction), NOT chat.
    expect(a.kind).toBe("SEND_REQUIRES_APPROVAL");
    expect(a.targetEntity).toBe("David");
    expect(a.connector).toBe("internal");
    // Body strips the "tell David I said" prefix.
    expect(a.draftPayload).toContain("good morning");
    expect(a.draftPayload).toContain("looking forward");
    // Human-authority: not flagged as approval-required by default.
    expect(a.requiresApproval).toBe(false);
  });

  it("'let David know the build passed' also routes to the draft card", () => {
    const a = classifyVoiceAction("Let David know the build passed.", ADMIN);
    expect(a.kind).toBe("SEND_REQUIRES_APPROVAL");
    expect(a.targetEntity).toBe("David");
    expect(a.draftPayload).toContain("build passed");
  });

  it("'tell David ... on slack' is NOT the internal path (external stays gated)", () => {
    const a = classifyVoiceAction("Tell David on slack we shipped.", ADMIN);
    // Falls through to the external/send path, never the internal direct path.
    expect(a.connector).not.toBe("internal");
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
    expect(a.route).toBe("/connector-rails?focus=slack");
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

  it("'send David a message' → SEND_REQUIRES_APPROVAL, no auto-send", () => {
    const a = classifyVoiceAction("Send David this message.", EMPLOYEE);
    expect(a.kind).toBe("SEND_REQUIRES_APPROVAL");
    expect(a.requiresApproval).toBe(true);
    expect(a.spoken.toLowerCase()).toContain("approval");
    expect(a.spoken.toLowerCase()).not.toContain("sent it");
  });

  it("'draft a message to David' → DRAFT_MESSAGE, approval required, no send", () => {
    const a = classifyVoiceAction("Draft a message to David.", EMPLOYEE);
    expect(a.kind).toBe("DRAFT_MESSAGE");
    expect(a.requiresApproval).toBe(true);
    expect(a.targetEntity).toBe("David");
    expect(a.spoken.toLowerCase()).toContain("approval");
  });
});

// ── Phase 1265 Work OS action runtime ───────────────────────────────
describe("Work OS action classifier", () => {
  it("'What's connected?' → CONNECTOR_STATUS_SUMMARY (read-only), not chat", () => {
    const a = classifyVoiceAction("What's connected?", ADMIN);
    expect(a.kind).toBe("CONNECTOR_STATUS_SUMMARY");
    expect(a.isReadOnly).toBe(true);
  });

  it("multi-provider status → CONNECTOR_STATUS_SUMMARY", () => {
    expect(
      classifyVoiceAction("Show me Google, Slack and Zoom status.", ADMIN).kind,
    ).toBe("CONNECTOR_STATUS_SUMMARY");
  });

  it("single 'show Slack verification' stays focus-navigation", () => {
    expect(classifyVoiceAction("Show me Slack verification.", ADMIN).kind).toBe(
      "CONNECTOR_STATUS_NAVIGATION",
    );
  });

  it("'What needs my approval?' → APPROVALS_REVIEW (routes to approvals)", () => {
    const a = classifyVoiceAction("What needs my approval?", EMPLOYEE);
    expect(a.kind).toBe("APPROVALS_REVIEW");
    expect(a.route).toBe("/app/approvals");
  });

  it("'Ask David's Twin what he thinks.' → ASK_TWIN, never fakes the answer", () => {
    const a = classifyVoiceAction("Ask David's Twin what he thinks.", EMPLOYEE);
    expect(a.kind).toBe("ASK_TWIN");
    expect(a.route).toBe("/app/collaboration");
    expect(a.spoken.toLowerCase()).toContain("won't answer for them");
  });

  it("'Schedule a meeting with Vishesh tomorrow.' → SCHEDULE_MEETING, gate-aware, no auto-create", () => {
    const a = classifyVoiceAction("Schedule a meeting with Vishesh tomorrow.", EMPLOYEE);
    expect(a.kind).toBe("SCHEDULE_MEETING");
    expect(a.requiresApproval).toBe(true);
    expect(a.isExternalWrite).toBe(true);
    // Phase 1274/1275: gate-aware copy (no stale "isn't exposed"); names
    // the gates + the standing safety line.
    expect(a.spoken.toLowerCase()).toContain("gated");
    expect(a.spoken.toLowerCase()).not.toContain("isn't exposed");
    expect(a.spoken.toLowerCase()).toContain("no event is created");
  });

  it("'After Samiksha confirms, put it on the calendar.' → SCHEDULE_MEETING with prerequisite", () => {
    const a = classifyVoiceAction(
      "After Samiksha confirms, put it on the calendar.",
      EMPLOYEE,
    );
    expect(a.kind).toBe("SCHEDULE_MEETING");
    expect(a.spoken).toContain("Samiksha");
    expect(a.spoken.toLowerCase()).toContain("confirmation");
  });

  it("'Pull latest Zoom recordings.' → ZOOM_RECORDINGS, real read-only runtime (Phase 1270)", () => {
    const a = classifyVoiceAction("Pull latest Zoom recordings.", ADMIN);
    expect(a.kind).toBe("ZOOM_RECORDINGS");
    expect(a.isReadOnly).toBe(true);
    // The recordings runtime now exists (GET /api/v1/zoom/recordings),
    // so the classifier no longer announces it as unexposed.
    expect(a.spoken.toLowerCase()).toContain("zoom");
    expect(a.spoken.toLowerCase()).not.toContain("isn't exposed");
    expect(a.blockedReason).toBeUndefined();
  });

  it("'Turn this meeting into action items.' → MEETING_NOTES_TO_ACTIONS", () => {
    expect(
      classifyVoiceAction("Turn this meeting into action items.", EMPLOYEE).kind,
    ).toBe("MEETING_NOTES_TO_ACTIONS");
  });

  it("'Start the onboarding workflow.' → WORKFLOW_START, needs confirmation", () => {
    const a = classifyVoiceAction("Start the onboarding workflow.", ADMIN);
    expect(a.kind).toBe("WORKFLOW_START");
    expect(a.needsConfirmation).toBe(true);
  });

  it("a hard work verb with no handler → UNSUPPORTED, never chat", () => {
    const a = classifyVoiceAction("Notify accounting about the invoice.", EMPLOYEE);
    expect(["SEND_REQUIRES_APPROVAL", "UNSUPPORTED"]).toContain(a.kind);
    expect(a.kind).not.toBe("GOVERNED_CHAT");
  });

  it("pure conversational prompt still reaches GOVERNED_CHAT", () => {
    expect(classifyVoiceAction("Explain what this means.", EMPLOYEE).kind).toBe(
      "GOVERNED_CHAT",
    );
    expect(
      classifyVoiceAction("Help me think through this.", EMPLOYEE).kind,
    ).toBe("GOVERNED_CHAT");
  });
});

// ── Phase 1268 Addendum — No-Homework / context-first defaults ──────
describe("context-first defaults (no homework)", () => {
  it("internal draft defaults to the internal channel — never asks which channel", () => {
    const a = classifyVoiceAction(
      "Draft a message to David saying we need to review this.",
      EMPLOYEE,
    );
    expect(a.kind).toBe("DRAFT_MESSAGE");
    expect(a.connector).toBe("internal");
    // Otzar inferred the body; it does not ask "what should I say?".
    expect(a.draftPayload?.toLowerCase()).toContain("we need to review this");
    // No channel question in the spoken copy.
    expect(a.spoken.toLowerCase()).not.toContain("which channel");
  });

  it("uses Slack ONLY when explicitly named", () => {
    const slack = classifyVoiceAction(
      "Draft a Slack message to David saying ship it.",
      EMPLOYEE,
    );
    expect(slack.connector).toBe("slack");
    const internal = classifyVoiceAction(
      "Draft a message to David saying ship it.",
      EMPLOYEE,
    );
    expect(internal.connector).toBe("internal");
  });

  it("a missing optional project does not block the draft", () => {
    const a = classifyVoiceAction("Draft a message to David: looks good.", EMPLOYEE);
    expect(a.kind).toBe("DRAFT_MESSAGE");
    expect(a.requiresApproval).toBe(true);
  });

  it("meeting proposal infers participant + does not interrogate upfront", () => {
    const a = classifyVoiceAction("Schedule a meeting with Vishesh tomorrow.", EMPLOYEE);
    expect(a.kind).toBe("SCHEDULE_MEETING");
    expect(a.targetEntity).toBe("Vishesh");
    // Single targeted note about approval — not a five-question form.
    expect(a.spoken.toLowerCase()).not.toContain("what duration");
    expect(a.spoken.toLowerCase()).not.toContain("which project");
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
