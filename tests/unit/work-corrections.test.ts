// Phase 3D — correction capture (pure detection + application).
import { describe, it, expect } from "vitest";
import {
  detectCorrection,
  applyCorrection,
} from "@/lib/work-os/work-corrections";
import type { TranscriptProposedAction } from "@/lib/work-os/transcript-actions";

function action(
  overrides: Partial<TranscriptProposedAction> = {},
): TranscriptProposedAction {
  return {
    id: "pa-1",
    kind: "save_follow_up",
    title: "Follow-up",
    body: "prepare the investor deck",
    sourceKind: "follow_up",
    confidence: 0.7,
    status: "proposed",
    ...overrides,
  };
}

describe("detectCorrection", () => {
  it("classifies the correction types", () => {
    expect(detectCorrection("No, David owns that.")?.kind).toBe("owner_correction");
    expect(detectCorrection("No, David owns that.")?.ownerName).toBe("David");
    const t = detectCorrection("Send that to Samiksha, not William.");
    expect(t?.kind).toBe("target_correction");
    expect(t?.targetName).toBe("Samiksha");
    const due = detectCorrection("That's due next Friday.");
    expect(due?.kind).toBe("due_date_correction");
    expect(due?.dueHint?.toLowerCase()).toContain("next friday");
    expect(detectCorrection("That's not blocked anymore.")?.kind).toBe("not_blocked");
    expect(detectCorrection("Don't mark that as a follow-up.")?.kind).toBe("not_follow_up");
    expect(detectCorrection("That should be a blocker.")?.kind).toBe("kind_correction");
    expect(detectCorrection("That should be a blocker.")?.newKind).toBe("blocker");
    expect(detectCorrection("That should be a follow-up.")?.newKind).toBe("follow_up");
    expect(detectCorrection("Don't interrupt me for that.")?.kind).toBe("interruption_preference");
    expect(detectCorrection("Use a warmer tone with Annie.")?.kind).toBe("tone_preference");
    expect(detectCorrection("When I say client note, I mean the current project note.")?.kind).toBe("context_alias");
  });

  it("[OTZAR-LIVE-6] broadened owner-correction variants", () => {
    for (const phrase of [
      "That changed. Samiksha owns it now.",
      "Samiksha owns it now.",
      "Samiksha owns this now.",
      "That belongs to Samiksha now.",
      "This belongs to Samiksha.",
      "Make Samiksha the owner.",
      "Assign this to Samiksha.",
      "Change the owner to Samiksha.",
      "Actually, Samiksha is responsible.",
      "Put Samiksha on that.",
      "Give that to Samiksha.",
      "Samiksha should take that.",
      "Move ownership to Samiksha.",
      "That should be on Samiksha.",
    ]) {
      const c = detectCorrection(phrase);
      expect(c?.kind, phrase).toBe("owner_correction");
      expect(c?.ownerName, phrase).toBe("Samiksha");
    }
  });

  it("[OTZAR-LIVE-6] owner-correction rejects indefinite 'names' (vague guard owns these)", () => {
    // These must NOT become owner_correction with ownerName='Someone'/'They'/… —
    // they fall through to the endpoint-clarity guard instead.
    expect(detectCorrection("Someone should follow up.")).toBeNull();
    expect(detectCorrection("Someone should take that.")).toBeNull();
    expect(detectCorrection("They own this now.")).toBeNull();
    expect(detectCorrection("We should take that.")).toBeNull();
  });

  it("[OTZAR-LIVE-6] broadened due-date variants", () => {
    for (const phrase of [
      "Update the follow-up from Friday to Monday.",
      "Move that from Friday to Monday.",
      "The deadline is Monday now.",
      "Use Monday, not Friday.",
      "Push that to next Friday.",
    ]) {
      const c = detectCorrection(phrase);
      expect(c?.kind, phrase).toBe("due_date_correction");
      expect(c?.dueHint?.toLowerCase(), phrase).toMatch(/monday|friday/);
    }
  });

  it("[OTZAR-LIVE-6] stale→current supersession asks (never auto-mutates)", () => {
    for (const phrase of [
      "Use the latest decision, not the old one.",
      "Ignore the older launch note.",
      "That decision changed.",
      "This supersedes the old plan.",
      "Don't use the old note.",
    ]) {
      expect(detectCorrection(phrase)?.kind, phrase).toBe("stale_supersession");
    }
    const r = applyCorrection(detectCorrection("Use the latest decision, not the old one.")!, [action({ sourceKind: "decision" })]);
    expect(r.applied).toBe(false);
    expect(r.needsClarification).toBe(true);
    expect(r.clarificationQuestion).toMatch(/which decision|what should replace/i);
  });

  it("[OTZAR-LIVE-6] broadened blocker-cleared variants", () => {
    for (const phrase of [
      "That blocker is no longer blocked.",
      "David is unblocked now.",
      "That blocker is cleared.",
      "This blocker is resolved.",
    ]) {
      expect(detectCorrection(phrase)?.kind, phrase).toBe("not_blocked");
    }
  });

  it("[OTZAR-LIVE-6] canonical phrasings still classify (regression)", () => {
    expect(detectCorrection("No, Samiksha owns that.")?.kind).toBe("owner_correction");
    expect(detectCorrection("That's due next Friday.")?.kind).toBe("due_date_correction");
    expect(detectCorrection("That's not blocked anymore.")?.kind).toBe("not_blocked");
    expect(detectCorrection("Send that to Samiksha, not William.")?.kind).toBe("target_correction");
  });

  it("returns null for non-correction text (handled safely)", () => {
    expect(detectCorrection("Summarize this transcript.")).toBeNull();
    expect(detectCorrection("good morning")).toBeNull();
    // Outbound requests must NOT be hijacked as corrections.
    expect(detectCorrection("Ask David to review this.")).toBeNull();
    expect(detectCorrection("Send William the decisions.")).toBeNull();
  });

  it("preferences are future_preference_candidate scope", () => {
    expect(detectCorrection("Don't interrupt me for that.")?.scope).toBe("future_preference_candidate");
    expect(detectCorrection("No, David owns that.")?.scope).toBe("current_flow");
  });
});

describe("applyCorrection", () => {
  it("owner correction updates a single obvious item", () => {
    const r = applyCorrection(detectCorrection("No, Samiksha owns that.")!, [action()]);
    expect(r.applied).toBe(true);
    expect(r.actions?.[0]!.ownerName).toBe("Samiksha");
    expect(r.message).toMatch(/Samiksha owns that/);
  });

  it("ambiguous 'that' (multiple items) asks one focused question", () => {
    const r = applyCorrection(detectCorrection("No, David owns that.")!, [
      action({ id: "pa-1" }),
      action({ id: "pa-2", body: "review the note" }),
    ]);
    expect(r.applied).toBe(false);
    expect(r.needsClarification).toBe(true);
    expect(r.clarificationQuestion).toMatch(/Which item should I update\?/);
  });

  it("due date correction updates the due hint", () => {
    const r = applyCorrection(detectCorrection("That's due next Friday.")!, [action()]);
    expect(r.actions?.[0]!.dueHint?.toLowerCase()).toContain("next friday");
  });

  it("target correction retargets but does NOT send", () => {
    const r = applyCorrection(detectCorrection("Send that to Samiksha, not William.")!, [action()]);
    expect(r.actions?.[0]!.targetName).toBe("Samiksha");
    // status untouched — no auto-send.
    expect(r.actions?.[0]!.status).toBe("proposed");
  });

  it("not_blocked reclassifies the blocker to a follow-up", () => {
    const r = applyCorrection(detectCorrection("That's not blocked anymore.")!, [
      action({ sourceKind: "blocker", kind: "mark_blocker", title: "Blocker", body: "the API keys" }),
    ]);
    expect(r.actions?.[0]!.sourceKind).toBe("follow_up");
  });

  it("not_follow_up dismisses the follow-up", () => {
    const r = applyCorrection(detectCorrection("Don't mark that as a follow-up.")!, [action()]);
    expect(r.actions?.[0]!.status).toBe("dismissed");
  });

  it("kind correction promotes a follow-up to a blocker", () => {
    const r = applyCorrection(detectCorrection("That should be a blocker.")!, [action()]);
    expect(r.actions?.[0]!.sourceKind).toBe("blocker");
  });

  it("a preference correction confirms locally without targeting an item", () => {
    const r = applyCorrection(detectCorrection("Don't interrupt me for that.")!, []);
    expect(r.applied).toBe(true);
    expect(r.message).toMatch(/preference for this workflow/i);
    expect(r.actions).toBeUndefined();
  });
});
