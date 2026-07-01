// FILE: tests/unit/prod-ux-copy-gate.test.tsx
// PURPOSE: PROD-UX-P2 — the copy gate. Two guarantees:
//          (1) owner lines can never render a pronoun/non-name as an owner
//              ("Owned by his" is impossible), mirroring the P0D backend
//              guard client-side; and
//          (2) the normal-flow copy produced by the new PROD-UX pure
//              modules (routing lanes, connector failure copy, voice
//              fallback copy) passes findBackendTermLeak — no route names,
//              policy codes, id/type field names, or page-handoff phrasing
//              ever reaches ambient copy.

import { describe, expect, it } from "vitest";
import {
  formatOwnedByLine,
  isPronounOrNonNameOwner,
  OWNER_NEEDS_REVIEW_COPY,
} from "@/lib/identity/owner-display";
import { findBackendTermLeak } from "@/lib/work-os/ambient-visibility";
import { routingLaneChip, routingWhyLine } from "@/lib/work-os/routing-lane";
import { humanizeConnectorFailure } from "@/lib/connectors/connector-error-copy";
import {
  micCopyFor,
  SERVER_STT_DISCLOSURE,
  SERVER_STT_TRANSCRIBED_NOTE,
  speechRecognitionErrorCopy,
} from "@/lib/voice/diagnostics";
import type { RoutingDecisionView, RoutingLane } from "@/lib/types/foundation";

describe("copy gate — owner display (P0D client mirror)", () => {
  it("pronouns and indirect references are never rendered as owners", () => {
    for (const junk of ["he", "His", "THEY", "someone", "everyone", "it", "me"]) {
      expect(isPronounOrNonNameOwner(junk), junk).toBe(true);
      expect(formatOwnedByLine(junk)).toBe(OWNER_NEEDS_REVIEW_COPY);
    }
  });

  it("empty / non-name-shaped / uncapitalized strings need review", () => {
    for (const junk of ["", "   ", "42skidoo", "@channel", "dishant"]) {
      expect(formatOwnedByLine(junk), JSON.stringify(junk)).toBe(
        OWNER_NEEDS_REVIEW_COPY,
      );
    }
  });

  it("real names render as 'Owned by <name>'", () => {
    expect(formatOwnedByLine("Sarah")).toBe("Owned by Sarah");
    expect(formatOwnedByLine("Vishesh Baghel")).toBe("Owned by Vishesh Baghel");
    expect(formatOwnedByLine("O'Brien")).toBe("Owned by O'Brien");
  });
});

describe("copy gate — findBackendTermLeak over the new normal-flow copy", () => {
  const ALL_LANES: RoutingLane[] = [
    "silent_capture", "silent_routing", "notify_owner", "draft_ready",
    "execute_when_allowed", "ask_approval", "escalate", "blocked",
    "setup_required", "identity_review",
  ];

  function decision(lane: RoutingLane): RoutingDecisionView {
    return {
      lane,
      reason: "Needs your approval before Otzar posts to Slack — outside writes always get a person's sign-off first.",
      risk: "high",
      confidence: null,
      policy_basis: null,
      owner_entity_id: null,
      owner_status: "unowned",
      next_best_action: null,
      required_tool: null,
      evidence_refs: [],
      audit_pointer: null,
    };
  }

  it("routing lane chips + risk lines are leak-free", () => {
    for (const lane of ALL_LANES) {
      const chip = routingLaneChip(decision(lane));
      if (chip !== null) {
        expect(findBackendTermLeak(chip.label), chip.label).toBeNull();
      }
      const why = routingWhyLine(decision(lane));
      expect(findBackendTermLeak(why!.risk), why!.risk).toBeNull();
    }
  });

  it("connector failure copy is leak-free for every recognized failure", () => {
    const samples = [
      humanizeConnectorFailure({ summary: "slack_write: missing_scope:chat:write" }),
      humanizeConnectorFailure({ summary: "slack_write: not_in_channel" }),
      humanizeConnectorFailure({ summary: "slack_write: channel_not_found" }),
      humanizeConnectorFailure({ error_class: "CONNECTOR_AUTH" }),
      humanizeConnectorFailure({ error_class: "NOT_CONFIGURED" }),
      humanizeConnectorFailure({ error_class: "NETWORK" }),
      humanizeConnectorFailure({}),
    ];
    for (const s of samples) {
      expect(findBackendTermLeak(s), s).toBeNull();
    }
  });

  it("voice fallback copy is leak-free", () => {
    const samples = [
      SERVER_STT_DISCLOSURE,
      SERVER_STT_TRANSCRIBED_NOTE,
      speechRecognitionErrorCopy("network"),
      speechRecognitionErrorCopy("not-allowed"),
    ];
    for (const shell of ["browser_chromium", "browser_other", "tauri_webview"] as const) {
      const copy = micCopyFor(shell, "granted", false, true);
      samples.push(`${copy.headline} ${copy.detail}`);
    }
    for (const s of samples) {
      expect(findBackendTermLeak(s), s).toBeNull();
    }
  });
});
