// Phase 4C — safe transcript ingestion from the governed MeetingCapture rail.
import { describe, it, expect } from "vitest";
import {
  meetingCapturesToCandidates,
  ingestFromCandidates,
  detectIngestionCommand,
} from "@/lib/work-os/transcript-ingestion";
import type { MeetingCaptureSafeView } from "@/lib/types/foundation";

function capture(
  overrides: Partial<MeetingCaptureSafeView> = {},
): MeetingCaptureSafeView {
  return {
    meeting_capture_id: "mc-1",
    provider: "MANUAL" as MeetingCaptureSafeView["provider"],
    provider_meeting_id: null,
    title: "Q3 planning",
    scheduled_start: null,
    scheduled_end: null,
    recorded_start: null,
    recorded_end: null,
    participant_count: 2,
    status: "READY" as MeetingCaptureSafeView["status"],
    workspace_id: null,
    source_conversation_id: null,
    summary: "We decided to ship onboarding.",
    has_transcript: true,
    created_at: "2026-06-23T09:00:00Z",
    updated_at: "2026-06-23T09:30:00Z",
    ...overrides,
  };
}

describe("meetingCapturesToCandidates", () => {
  it("carries only the safe summary text and a confidence", () => {
    const c = meetingCapturesToCandidates([capture()]);
    expect(c[0]!.text).toBe("We decided to ship onboarding.");
    expect(c[0]!.source).toBe("meeting_capture");
    expect(c[0]!.confidence).toBeGreaterThan(0.5);
  });
  it("a meeting with a transcript but no summary text carries no text", () => {
    const c = meetingCapturesToCandidates([
      capture({ summary: null, has_transcript: true }),
    ]);
    expect(c[0]!.text).toBeUndefined();
    expect(c[0]!.confidence).toBeLessThan(0.5);
  });
});

describe("ingestFromCandidates", () => {
  const one = meetingCapturesToCandidates([capture()]);
  it("no candidates → not_found, ask to paste/select", () => {
    const r = ingestFromCandidates([], true);
    expect(r.kind).toBe("not_found");
    expect(r.message).toMatch(/Paste or select the transcript/);
  });
  it("one usable transcript → loaded", () => {
    const r = ingestFromCandidates(one, true);
    expect(r.kind).toBe("loaded");
    expect(r.candidate?.text).toMatch(/ship onboarding/);
    expect(r.message).toMatch(/Using the latest transcript/);
  });
  it("a meeting with no text → missing_text (no fake digest)", () => {
    const noText = meetingCapturesToCandidates([capture({ summary: null })]);
    const r = ingestFromCandidates(noText, true);
    expect(r.kind).toBe("missing_text");
    expect(r.message).toMatch(/don't have transcript text yet/);
  });
  it("multiple usable + not preferLatest → needs_choice", () => {
    const many = meetingCapturesToCandidates([
      capture({ meeting_capture_id: "mc-1", title: "A" }),
      capture({ meeting_capture_id: "mc-2", title: "B" }),
    ]);
    const r = ingestFromCandidates(many, false);
    expect(r.kind).toBe("needs_choice");
    expect(r.message).toMatch(/Which transcript should I use\?/);
  });
  it("multiple usable + preferLatest → loaded the most recent", () => {
    const many = meetingCapturesToCandidates([
      capture({ meeting_capture_id: "mc-old", created_at: "2026-06-20T09:00:00Z" }),
      capture({ meeting_capture_id: "mc-new", created_at: "2026-06-23T09:00:00Z" }),
    ]);
    const r = ingestFromCandidates(many, true);
    expect(r.kind).toBe("loaded");
    expect(r.candidate?.id).toBe("mc-new");
  });
});

describe("detectIngestionCommand", () => {
  it("detects latest/meeting transcript commands + follow-on", () => {
    expect(detectIngestionCommand("Use the latest transcript.")).toEqual({ followOn: "none", latest: true });
    expect(detectIngestionCommand("Summarize the latest transcript.")).toEqual({ followOn: "digest", latest: true });
    expect(detectIngestionCommand("Create action items from the latest meeting.")).toEqual({ followOn: "actions", latest: true });
    expect(detectIngestionCommand("What was blocked in the latest meeting?")).toEqual({ followOn: "tracking", latest: true });
    expect(detectIngestionCommand("Use the meeting transcript.")).toEqual({ followOn: "none", latest: false });
  });
  it("does NOT match provided-text commands or unrelated text", () => {
    expect(detectIngestionCommand("Summarize this transcript.")).toBeNull();
    expect(detectIngestionCommand("Create action items from this meeting.")).toBeNull();
    expect(detectIngestionCommand("What is blocked?")).toBeNull();
    expect(detectIngestionCommand("good morning")).toBeNull();
  });
});
