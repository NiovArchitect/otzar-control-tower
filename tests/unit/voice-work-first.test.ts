// FILE: tests/unit/voice-work-first.test.ts
// PURPOSE: D-02 — voice-first / text-second / work-driving contract.
//          Locks classifiers and copy so shallow UI churn cannot
//          rebrand a decorative mic page as "driving work".

import { describe, expect, it } from "vitest";
import {
  isWorkDrivingVoiceAction,
  isWorkPathOutcomeCopy,
  TEXT_SECONDARY_LABEL,
  TEXT_SECONDARY_PLACEHOLDER,
  VOICE_FIRST_HEADLINE,
  VOICE_PAGE_DESCRIPTION,
  VOICE_PAGE_TITLE,
  VOICE_WORK_PATH_COPY,
  voiceComposePriority,
} from "../../src/lib/voice/voice-work-first";
import type { VoiceActionKind } from "../../src/lib/voice/voice-action-runtime";

describe("D-02 voice-work-first contract", () => {
  it("frames voice as primary work driver, not a demo toy", () => {
    expect(VOICE_FIRST_HEADLINE.toLowerCase()).toMatch(/speak|voice/);
    expect(VOICE_FIRST_HEADLINE.toLowerCase()).toMatch(/work|type/);
    expect(VOICE_WORK_PATH_COPY.toLowerCase()).toMatch(/same governed work path|actions|needs me|approval/);
    expect(VOICE_PAGE_DESCRIPTION.toLowerCase()).toMatch(/drive real work|type is secondary/);
    expect(VOICE_PAGE_TITLE).toMatch(/Talk to Otzar/i);
    expect(TEXT_SECONDARY_LABEL.toLowerCase()).toMatch(/type|secondary/);
    expect(TEXT_SECONDARY_PLACEHOLDER.toLowerCase()).toMatch(/type/);
  });

  it("mic is voice_primary; text is text_secondary", () => {
    expect(voiceComposePriority("mic")).toBe("voice_primary");
    expect(voiceComposePriority("text")).toBe("text_secondary");
  });

  it("work-driving kinds cover nav, chat, drafts, meeting→actions", () => {
    const work: VoiceActionKind[] = [
      "GOVERNED_CHAT",
      "INTERNAL_NAVIGATION",
      "APPROVALS_REVIEW",
      "MEETING_NOTES_TO_ACTIONS",
      "DRAFT_MESSAGE",
      "SEND_REQUIRES_APPROVAL",
      "ASK_TWIN",
      "SCHEDULE_MEETING",
      "READ_ONLY_SUMMARY",
      "WORKFLOW_START",
      "CONNECTOR_STATUS_SUMMARY",
      "CONNECTOR_STATUS_NAVIGATION",
      "DRAFT_ONLY",
    ];
    for (const k of work) {
      expect(isWorkDrivingVoiceAction(k), k).toBe(true);
    }
  });

  it("blocked / unsupported / external open are not auto-counted as work", () => {
    // EXTERNAL_URL_OPEN can be work-adjacent but is not the governed ledger path
    expect(isWorkDrivingVoiceAction("BLOCKED_URL")).toBe(false);
    expect(isWorkDrivingVoiceAction("UNSUPPORTED")).toBe(false);
    expect(isWorkDrivingVoiceAction("ADMIN_BLOCKED")).toBe(false);
    expect(isWorkDrivingVoiceAction("EXTERNAL_URL_OPEN")).toBe(false);
    expect(isWorkDrivingVoiceAction("ZOOM_RECORDINGS")).toBe(false);
  });

  it("outcome copy rejects decorative listening-only lines", () => {
    expect(isWorkPathOutcomeCopy("Listening")).toBe(false);
    expect(isWorkPathOutcomeCopy("Ready")).toBe(false);
    expect(isWorkPathOutcomeCopy("Speak now.")).toBe(false);
    expect(isWorkPathOutcomeCopy("")).toBe(false);
  });

  it("outcome copy accepts real work responses", () => {
    expect(
      isWorkPathOutcomeCopy("I found 6 proposed actions from this meeting."),
    ).toBe(true);
    expect(
      isWorkPathOutcomeCopy("Opened Action Center."),
    ).toBe(true);
    expect(
      isWorkPathOutcomeCopy("What should I use as the current context?"),
    ).toBe(true);
    expect(
      isWorkPathOutcomeCopy("I sent David Odie a review request."),
    ).toBe(true);
    expect(
      isWorkPathOutcomeCopy("Who should own this?"),
    ).toBe(true);
  });
});
