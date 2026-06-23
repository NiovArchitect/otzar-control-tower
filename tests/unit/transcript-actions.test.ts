// Phase 3B — transcript digest → reviewable proposed actions (pure).
import { describe, it, expect } from "vitest";
import { extractTranscriptDigest } from "@/lib/work-os/transcript-intelligence";
import {
  digestToProposedActions,
  proposedActionsCount,
} from "@/lib/work-os/transcript-actions";

const TRANSCRIPT = [
  "We decided to ship the onboarding flow next week.",
  "David is blocked on the API keys.",
  "I will prepare the investor deck by Friday.",
  "We need to follow up with Samiksha about the pricing.",
  "There's a risk the demo could slip.",
  "It's unclear who owns the launch checklist.",
].join(" ");

describe("digestToProposedActions", () => {
  const digest = extractTranscriptDigest(TRANSCRIPT);
  const actions = digestToProposedActions(digest, {
    type: "selected_text",
    id: "ctx-1",
    label: "the current context",
  });

  it("produces a proposed action per work item, preserving source kind", () => {
    const kinds = actions.map((a) => a.sourceKind);
    expect(kinds).toContain("decision");
    expect(kinds).toContain("blocker");
    expect(kinds).toContain("commitment");
    expect(kinds).toContain("follow_up");
    expect(kinds).toContain("risk");
    expect(kinds).toContain("open_question");
  });

  it("maps kinds correctly", () => {
    const bySource = (k: string) => actions.find((a) => a.sourceKind === k);
    expect(bySource("commitment")!.kind).toBe("save_follow_up");
    expect(bySource("follow_up")!.kind).toBe("save_follow_up");
    expect(bySource("decision")!.kind).toBe("save_follow_up");
    // a blocker WITH a named owner is routable → send_request.
    expect(bySource("blocker")!.kind).toBe("send_request");
    expect(bySource("blocker")!.ownerName).toBe("David");
    // a risk with no owner → mark_blocker.
    expect(bySource("risk")!.kind).toBe("mark_blocker");
    expect(bySource("open_question")!.kind).toBe("ask_clarification");
  });

  it("carries confidence, due hints, and the context reference", () => {
    for (const a of actions) {
      expect(a.confidence).toBeGreaterThan(0);
      expect(a.status).toBe("proposed");
      expect(a.contextRef?.id).toBe("ctx-1");
    }
    const commitment = actions.find((a) => a.sourceKind === "commitment");
    expect(commitment!.dueHint?.toLowerCase()).toContain("friday");
  });

  it("count line is compact and human", () => {
    expect(proposedActionsCount(actions)).toMatch(/I found \d+ proposed actions from this meeting\./);
    expect(proposedActionsCount([])).toMatch(/didn't find any clear next actions/);
  });
});
