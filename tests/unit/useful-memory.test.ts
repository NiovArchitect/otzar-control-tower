// FILE: useful-memory.test.ts
// PURPOSE: Slice 4 — useful memory + portable request honesty.

import { describe, expect, it, beforeEach } from "vitest";
import {
  PORTABLE_CAN_MOVE,
  PORTABLE_STAYS_WITH_ORG,
  buildActivePatterns,
  buildDecisionCards,
  buildRecentLearning,
  humanizePreference,
  loadPortableRequest,
  savePortableRequest,
} from "@/lib/work-os/useful-memory";
import {
  conversationCardTitle,
  filterConversations,
  historyPageLeaksHardwareRoadmap,
} from "@/lib/work-os/conversation-history-view";
import { detectTalkPreference } from "@/lib/voice/talk-preference-learning";

describe("useful-memory", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("builds active patterns without leading as storage counts", () => {
    const cards = buildActivePatterns([
      {
        correction_id: "c1",
        safe_summary: "[portable] Keep answers concise: direct answer first",
      },
      {
        correction_id: "c2",
        safe_summary: "Show recommendation and risk before background",
      },
    ]);
    expect(cards.length).toBe(2);
    expect(cards[0]?.title).toMatch(/Concise|Decision/i);
  });

  it("humanizes known preferences", () => {
    expect(humanizePreference("keep answers concise").title).toBe(
      "Concise answers",
    );
  });

  it("builds decisions and recent learning", () => {
    expect(
      buildRecentLearning([
        { correction_id: "a", safe_summary: "Use bullet points for plans" },
      ]),
    ).toHaveLength(1);
    expect(
      buildDecisionCards([
        { candidate_id: "x", plain_language: "Lead with risk" },
      ])[0]?.question,
    ).toMatch(/Lead with risk/);
  });

  it("never marks portable request Ready from client alone", () => {
    savePortableRequest({
      status: "ready",
      requested_at: new Date().toISOString(),
    });
    const loaded = loadPortableRequest();
    expect(loaded?.status).toBe("under_review");
    expect(PORTABLE_CAN_MOVE.length).toBeGreaterThan(0);
    expect(PORTABLE_STAYS_WITH_ORG.join(" ")).toMatch(/transcript/i);
  });
});

describe("conversation-history-view", () => {
  it("titles and filters conversations", () => {
    const rows = [
      {
        conversation_id: "1",
        twin_id: "t",
        source_type: "CHAT",
        status: "CLOSED",
        message_count: 4,
        started_at: new Date().toISOString(),
        closed_at: new Date().toISOString(),
        title: "Team status and security blocker",
        summary_preview: "You asked how the team was doing.",
        summary_available: true,
      },
    ];
    expect(conversationCardTitle(rows[0]!)).toMatch(/Team status/i);
    expect(filterConversations(rows, "security")).toHaveLength(1);
    expect(filterConversations(rows, "zzzz")).toHaveLength(0);
  });

  it("detects hardware roadmap leakage", () => {
    expect(
      historyPageLeaksHardwareRoadmap("glasses planned for capture"),
    ).toBe(true);
    expect(
      historyPageLeaksHardwareRoadmap("Conversation history with summaries"),
    ).toBe(false);
  });
});

describe("talk-preference-learning", () => {
  it("applies concise preference immediately", () => {
    const d = detectTalkPreference("Keep my answers concise.");
    expect(d?.apply_immediately).toBe(true);
    expect(d?.scope).toBe("personal");
    expect(d?.confirmation).toMatch(/answer first/i);
  });

  it("does not auto-apply org policy phrasing", () => {
    const d = detectTalkPreference(
      "All employees must use this company policy for external email.",
    );
    expect(d?.scope).toBe("organizational");
    expect(d?.apply_immediately).toBe(false);
  });

  it("asks when personal vs org is unclear", () => {
    const d = detectTalkPreference("Always ask before sending.");
    expect(d?.scope).toBe("unclear");
    expect(d?.confirmation).toMatch(/only to you|organization/i);
  });
});
