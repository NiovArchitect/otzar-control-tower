// FILE: transcript-ingestion.ts
// PURPOSE: Phase 4C — bring an EXISTING, governed meeting/transcript artifact
//          into the same current-context → digest → actions → tracking flow that
//          already works for provided text. Uses the typed, consent-gated
//          MeetingCapture rail (Phase 1222): its SAFE view exposes only a
//          `summary` text + `has_transcript` flag — never the raw transcript.
//          No recording, no mic/screen capture, no new provider work, no faking
//          transcript from metadata.
// CONNECTS TO: api.meetingCaptures.list, current-surface-context (load),
//          transcript-intelligence / work-tracking (reuse), AmbientOtzarBar,
//          tests/unit/transcript-ingestion.test.ts.

import type { MeetingCaptureSafeView } from "@/lib/types/foundation";

export interface TranscriptArtifactCandidate {
  id: string;
  title: string;
  source: "meeting_capture" | "recent_artifact" | "unknown";
  text?: string;
  summary?: string;
  createdAt?: string;
  confidence: number;
}

export interface TranscriptIngestionResult {
  kind: "loaded" | "needs_choice" | "missing_text" | "not_found";
  candidate?: TranscriptArtifactCandidate;
  candidates?: TranscriptArtifactCandidate[];
  message: string;
}

// WHAT: Project governed meeting captures into transcript candidates. Only the
//        SAFE summary text is carried (the raw transcript is never exposed).
export function meetingCapturesToCandidates(
  captures: ReadonlyArray<MeetingCaptureSafeView>,
): TranscriptArtifactCandidate[] {
  return captures.map((c) => {
    const text =
      c.summary !== null && c.summary.trim().length > 0
        ? c.summary
        : undefined;
    return {
      id: c.meeting_capture_id,
      title: c.title,
      source: "meeting_capture" as const,
      ...(text !== undefined ? { text, summary: text } : {}),
      createdAt: c.created_at,
      // Lower confidence when we only know a transcript exists but have no text.
      confidence: text !== undefined ? 0.75 : c.has_transcript ? 0.4 : 0.3,
    };
  });
}

// WHAT: Decide what to do with the candidates.
// INPUT: candidates + whether the command asked for "the latest" (disambiguates
//        to the most recent instead of asking).
// OUTPUT: loaded (one usable artifact) / needs_choice (pick one) / missing_text
//         (a meeting exists but no usable text yet) / not_found.
export function ingestFromCandidates(
  candidates: ReadonlyArray<TranscriptArtifactCandidate>,
  preferLatest: boolean,
): TranscriptIngestionResult {
  if (candidates.length === 0) {
    return {
      kind: "not_found",
      message: "Paste or select the transcript you want me to use.",
    };
  }
  const withText = candidates.filter(
    (c) => c.text !== undefined && c.text.trim().length > 0,
  );
  if (withText.length === 0) {
    return {
      kind: "missing_text",
      candidate: candidates[0]!,
      message: "I found the meeting, but I don't have transcript text yet.",
    };
  }
  if (withText.length === 1) {
    return {
      kind: "loaded",
      candidate: withText[0]!,
      message: "Using the latest transcript.",
    };
  }
  // Multiple usable transcripts.
  if (preferLatest) {
    const latest = [...withText].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    )[0]!;
    return {
      kind: "loaded",
      candidate: latest,
      message: "Using the latest transcript.",
    };
  }
  return {
    kind: "needs_choice",
    candidates: withText,
    message: "Which transcript should I use?",
  };
}

export interface IngestionCommand {
  // What to do once the transcript is loaded into current context.
  followOn: "none" | "digest" | "actions" | "tracking";
  // "the latest …" → resolve to the most recent rather than asking.
  latest: boolean;
}

// WHAT: Detect a "use/summarize/action/what-was-blocked the LATEST/meeting
//        transcript" command. Returns null when the text doesn't reference an
//        existing meeting/transcript artifact (so "summarize THIS transcript"
//        and other provided-context commands are untouched).
export function detectIngestionCommand(text: string): IngestionCommand | null {
  const t = text.toLowerCase();
  const refs =
    /\b(?:the\s+)?latest\s+(?:meeting\s+)?transcript\b/.test(t) ||
    /\bmeeting\s+transcript\b/.test(t) ||
    /\b(?:the\s+)?latest\s+meeting\b/.test(t);
  if (!refs) return null;
  const latest = /\blatest\b/.test(t);
  if (
    /\b(?:create\s+(?:action\s+items?|follow[\s-]?ups?)|turn\s+.*\binto\b\s+actions?|make\s+.*\bactionable\b)\b/.test(
      t,
    )
  ) {
    return { followOn: "actions", latest };
  }
  if (/\b(?:summari[sz]e|recap|digest)\b/.test(t)) {
    return { followOn: "digest", latest };
  }
  if (/\bwhat\s+(?:was|were|is|'s)?\s*blocked\b/.test(t)) {
    return { followOn: "tracking", latest };
  }
  return { followOn: "none", latest };
}
