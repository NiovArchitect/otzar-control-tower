// Phase 3C — derived work tracking (pure, read-only, honest).
import { describe, it, expect } from "vitest";
import { extractTranscriptDigest } from "@/lib/work-os/transcript-intelligence";
import { digestToProposedActions } from "@/lib/work-os/transcript-actions";
import {
  deriveTrackingFromActions,
  detectTrackingCommand,
  composeTrackingAnswer,
} from "@/lib/work-os/work-tracking";

const TRANSCRIPT = [
  "We decided to ship the onboarding flow next week.",
  "David is blocked on the API keys.",
  "I will prepare the investor deck by Friday.",
  "We need to follow up with Samiksha about the pricing.",
  "There's a risk the demo could slip.",
  "It's unclear who owns the launch checklist.",
].join(" ");

const actions = digestToProposedActions(extractTranscriptDigest(TRANSCRIPT), {
  type: "selected_text",
  id: "ctx-1",
  label: "the current context",
});

describe("deriveTrackingFromActions", () => {
  const s = deriveTrackingFromActions(actions);

  it("classifies blockers and follow-ups, preserving owner/due hints", () => {
    expect(s.blockers.length).toBeGreaterThanOrEqual(1);
    expect(s.followUps.length).toBeGreaterThanOrEqual(2);
    expect(s.blockers.some((b) => /API keys/i.test(b.title))).toBe(true);
    const due = s.followUps.find((f) => f.dueHint !== undefined);
    expect(due?.dueHint?.toLowerCase()).toContain("friday");
  });

  it("counts needsAttention and infers NO completion and NO staleness", () => {
    expect(s.counts.needsAttention).toBe(s.needsAttention.length);
    expect(s.needsAttention.length).toBeGreaterThan(0);
    expect(s.stale.length).toBe(0);
    // No item is ever marked completed without a real signal.
    const allStates = [
      ...s.blockers,
      ...s.followUps,
      ...s.waiting,
      ...s.needsAttention,
    ].map((i) => i.state);
    expect(allStates).not.toContain("completed_unknown");
  });

  it("a sent action becomes 'waiting on' its owner", () => {
    const sent = actions.map((a, i) =>
      i === 0 ? { ...a, status: "sent" as const } : a,
    );
    // give the first action an owner so waitingOn is populated
    sent[0] = { ...sent[0]!, ownerName: "David", status: "sent" };
    const s2 = deriveTrackingFromActions(sent);
    expect(s2.waiting.length).toBeGreaterThanOrEqual(1);
    expect(s2.waiting.some((w) => w.waitingOn === "David")).toBe(true);
  });
});

describe("detectTrackingCommand", () => {
  it("detects the tracking questions", () => {
    expect(detectTrackingCommand("What is blocked?")?.focus).toBe("blockers");
    expect(detectTrackingCommand("What is still blocked?")?.focus).toBe("blockers");
    expect(detectTrackingCommand("Who is waiting on whom?")?.focus).toBe("waiting");
    expect(detectTrackingCommand("What follow-ups came out of this meeting?")?.focus).toBe("followUps");
    expect(detectTrackingCommand("What still needs attention?")?.focus).toBe("needsAttention");
    expect(detectTrackingCommand("What is stale?")?.focus).toBe("stale");
    expect(detectTrackingCommand("Show me the tracking from this meeting.")?.focus).toBe("all");
    expect(detectTrackingCommand("What changed since the meeting?")?.focus).toBe("all");
  });
  it("returns null for non-tracking text", () => {
    expect(detectTrackingCommand("Summarize this transcript.")).toBeNull();
    expect(detectTrackingCommand("good morning")).toBeNull();
  });
});

describe("composeTrackingAnswer", () => {
  const s = deriveTrackingFromActions(actions);
  it("gives compact, honest answers", () => {
    expect(composeTrackingAnswer(s, "blockers")).toMatch(/I found \d+ blocker/);
    expect(composeTrackingAnswer(s, "followUps")).toMatch(/follow-up/);
    expect(composeTrackingAnswer(s, "all")).toMatch(/I found .* needing attention\./);
    // stale stays honest — never fabricated.
    expect(composeTrackingAnswer(s, "stale")).toMatch(/can't tell what's stale/i);
  });
  it("is honest when empty", () => {
    const empty = deriveTrackingFromActions([]);
    expect(composeTrackingAnswer(empty, "blockers")).toMatch(/Nothing is blocked/i);
    expect(composeTrackingAnswer(empty, "waiting")).toMatch(/Nobody is waiting/i);
  });
});
