// Phase 3A — transcript/meeting intelligence (deterministic extraction).
import { describe, it, expect } from "vitest";
import {
  extractTranscriptDigest,
  detectTranscriptCommand,
  whyThisMatters,
  pickItems,
  digestCounts,
} from "@/lib/work-os/transcript-intelligence";

const TRANSCRIPT = [
  "We decided to ship the onboarding flow next week.",
  "David is blocked on the API keys.",
  "I will prepare the investor deck by Friday.",
  "We need to follow up with Samiksha about the pricing.",
  "There's a risk the demo could slip.",
  "Should we include the new pricing?",
  "It's unclear who owns the launch checklist.",
].join(" ");

describe("extractTranscriptDigest", () => {
  const d = extractTranscriptDigest(TRANSCRIPT);

  it("extracts decisions / blockers / commitments / follow-ups / risks / open questions", () => {
    expect(d.decisions.length).toBe(1);
    expect(d.blockers.length).toBe(1);
    expect(d.commitments.length).toBe(1);
    expect(d.followUps.length).toBe(1);
    expect(d.risks.length).toBe(1);
    expect(d.openQuestions.length).toBe(2);
  });

  it("every item carries a confidence score", () => {
    const all = [
      ...d.decisions,
      ...d.blockers,
      ...d.commitments,
      ...d.followUps,
      ...d.risks,
      ...d.openQuestions,
    ];
    expect(all.length).toBeGreaterThan(0);
    for (const item of all) {
      expect(item.confidence).toBeGreaterThan(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("captures a due hint and proposes next actions", () => {
    expect(d.commitments[0]!.dueHint?.toLowerCase()).toContain("friday");
    // proposed actions = commitments + follow-ups.
    expect(d.proposedActions.length).toBe(2);
  });

  it("is honest when there is no structure", () => {
    const empty = extractTranscriptDigest("Nice weather today. Coffee was good.");
    expect(empty.decisions.length).toBe(0);
    expect(empty.summary.toLowerCase()).toMatch(/couldn't find/);
  });

  it("digestCounts is a compact human line", () => {
    expect(digestCounts(d)).toMatch(/I found 1 decision, 2 follow-ups, and 1 blocker\./);
  });
});

describe("whyThisMatters", () => {
  it("answers from context — blockers / deadline / risk / decisions", () => {
    const d = extractTranscriptDigest(TRANSCRIPT);
    const why = whyThisMatters(d).toLowerCase();
    expect(why).toMatch(/^this matters because/);
    expect(why).toContain("blocker");
  });
  it("is honest when nothing makes it urgent", () => {
    const d = extractTranscriptDigest("We chatted about the weather.");
    expect(whyThisMatters(d).toLowerCase()).toMatch(/don't see a blocker/);
  });
});

describe("pickItems", () => {
  it("selects the requested category", () => {
    const d = extractTranscriptDigest(TRANSCRIPT);
    expect(pickItems(d, "decisions").length).toBe(1);
    expect(pickItems(d, "blockers").length).toBe(1);
    expect(pickItems(d, "next_steps")).toEqual(d.followUps);
  });
});

describe("detectTranscriptCommand", () => {
  it("DIGEST for summarize/extract/what-were", () => {
    expect(detectTranscriptCommand("Summarize this transcript.")?.kind).toBe("DIGEST");
    expect(detectTranscriptCommand("Summarize this meeting.")?.kind).toBe("DIGEST");
    expect(detectTranscriptCommand("Extract decisions from this.")?.kind).toBe("DIGEST");
    expect(detectTranscriptCommand("What were the blockers?")?.kind).toBe("DIGEST");
  });

  it("ACTIONS for create/turn-into/make-actionable/what-next (Phase 3B review)", () => {
    expect(detectTranscriptCommand("Create follow-ups from this.")?.kind).toBe("ACTIONS");
    expect(detectTranscriptCommand("Create action items from this meeting.")?.kind).toBe("ACTIONS");
    expect(detectTranscriptCommand("Turn this into actions.")?.kind).toBe("ACTIONS");
    expect(detectTranscriptCommand("Make this actionable.")?.kind).toBe("ACTIONS");
    expect(detectTranscriptCommand("What should we do next?")?.kind).toBe("ACTIONS");
  });

  it("WHY for why-this-matters (incl. ask my twin)", () => {
    expect(detectTranscriptCommand("Why does this matter?")?.kind).toBe("WHY");
    expect(detectTranscriptCommand("ask my twin why this matters")?.kind).toBe("WHY");
  });

  it("ROUTE for 'send X the decisions'", () => {
    const r = detectTranscriptCommand("After this meeting, send William the decisions.");
    expect(r?.kind).toBe("ROUTE");
    expect(r?.kind === "ROUTE" && r.targetName).toBe("William");
    expect(r?.kind === "ROUTE" && r.selector).toBe("decisions");
  });

  it("returns null for a delegation ('tell/ask X to …') and for non-transcript text", () => {
    expect(detectTranscriptCommand("Tell Samiksha to summarize this transcript.")).toBeNull();
    expect(detectTranscriptCommand("Ask David to review the transcript.")).toBeNull();
    expect(detectTranscriptCommand("summarize my open work")).toBeNull();
    expect(detectTranscriptCommand("good morning team")).toBeNull();
  });
});
