// Phase 2.5 (deepened) — the ambient visibility policy, enforced in code.
// Proof/audit is silent, low-risk success is a calm confirmation, approval /
// blocked / ambiguous / missing-context / failure interrupt, summaries digest.
// Copy stays human.
import { describe, it, expect } from "vitest";
import {
  decideAmbientVisibility,
  findBackendTermLeak,
} from "@/lib/work-os/ambient-visibility";

describe("decideAmbientVisibility — visibility levels", () => {
  it("message sent → confirmation, spoken + inline, not an interrupt", () => {
    const d = decideAmbientVisibility({ kind: "MESSAGE_SENT" });
    expect(d.visibility).toBe("confirmation");
    expect(d.importance).toBe("useful");
    expect(d.shouldShowInline).toBe(true);
    expect(d.shouldSpeak).toBe(true);
    expect(d.shouldInterruptFocus).toBe(false);
  });

  it("self work saved → confirmation", () => {
    expect(decideAmbientVisibility({ kind: "SELF_WORK_SAVED" }).visibility).toBe(
      "confirmation",
    );
  });

  it("collaboration sent → confirmation, tracked", () => {
    const d = decideAmbientVisibility({ kind: "COLLABORATION_SENT" });
    expect(d.visibility).toBe("confirmation");
    expect(d.shouldPersistToLedger).toBe(true);
  });

  it("ledger / audit / proof → silent: not inline, not spoken, audit-only", () => {
    const d = decideAmbientVisibility({ kind: "LEDGER_PROOF" });
    expect(d.visibility).toBe("silent");
    expect(d.importance).toBe("routine");
    expect(d.shouldShowInline).toBe(false);
    expect(d.shouldSpeak).toBe(false);
    expect(d.shouldShowInAuditOnly).toBe(true);
    expect(d.shouldPersistToLedger).toBe(true);
    expect(d.detailLabel).toBe("Show proof");
  });

  it("approval needed → interrupt, breaks focus, badged, importance approval_required", () => {
    const d = decideAmbientVisibility({ kind: "APPROVAL_NEEDED" });
    expect(d.visibility).toBe("interrupt");
    expect(d.importance).toBe("approval_required");
    expect(d.shouldInterruptFocus).toBe(true);
    expect(d.shouldBadge).toBe(true);
    expect(d.detailLabel).toBe("Why");
  });

  it("blocked / denied → interrupt (blocked importance)", () => {
    const d = decideAmbientVisibility({ kind: "BLOCKED_DENIED" });
    expect(d.visibility).toBe("interrupt");
    expect(d.importance).toBe("blocked");
    expect(d.shouldInterruptFocus).toBe(true);
  });

  it("ambiguous target → interrupt + asks one focused clarification", () => {
    const d = decideAmbientVisibility(
      {
        kind: "AMBIGUOUS_TARGET",
        clarificationQuestion: "Do you mean David Odie or David Ramirez?",
      },
    );
    expect(d.visibility).toBe("interrupt");
    expect(d.shouldAskClarification).toBe(true);
    expect(d.clarificationQuestion).toMatch(/David Odie or David Ramirez/);
  });

  it("missing context → interrupt + asks one focused clarification", () => {
    const d = decideAmbientVisibility({ kind: "MISSING_CONTEXT" });
    expect(d.visibility).toBe("interrupt");
    expect(d.shouldAskClarification).toBe(true);
  });

  it("action failed → interrupt", () => {
    expect(decideAmbientVisibility({ kind: "ACTION_FAILED" }).visibility).toBe(
      "interrupt",
    );
  });

  it("digest → digest level, grouped, badged, not spoken aloud", () => {
    const d = decideAmbientVisibility({ kind: "DIGEST_READY" });
    expect(d.visibility).toBe("digest");
    expect(d.shouldGroupIntoDigest).toBe(true);
    expect(d.shouldBadge).toBe(true);
    expect(d.shouldSpeak).toBe(false);
    expect(d.detailLabel).toBe("What changed");
  });
});

describe("decideAmbientVisibility — quiet mode & focus mode", () => {
  it("quiet mode suppresses a spoken low-risk success but keeps it inline", () => {
    const d = decideAmbientVisibility(
      { kind: "MESSAGE_SENT" },
      { quietMode: true },
    );
    expect(d.shouldShowInline).toBe(true);
    expect(d.shouldSpeak).toBe(false);
  });

  it("quiet mode NEVER silences an interrupt", () => {
    const d = decideAmbientVisibility(
      { kind: "APPROVAL_NEEDED" },
      { quietMode: true },
    );
    expect(d.shouldSpeak).toBe(true);
    expect(d.shouldInterruptFocus).toBe(true);
  });

  it("focus mode folds a routine confirmation into a digest instead of inline", () => {
    const d = decideAmbientVisibility(
      { kind: "MESSAGE_SENT" },
      { focusMode: true },
    );
    expect(d.shouldShowInline).toBe(false);
    expect(d.shouldGroupIntoDigest).toBe(true);
  });

  it("focus mode NEVER hides an interrupt the human must act on", () => {
    const d = decideAmbientVisibility(
      { kind: "APPROVAL_NEEDED" },
      { focusMode: true },
    );
    expect(d.shouldShowInline).toBe(true);
    expect(d.shouldInterruptFocus).toBe(true);
  });

  it("passes through the caller's human copy untouched", () => {
    const copy = "I saved that as a note to yourself.";
    expect(
      decideAmbientVisibility({ kind: "SELF_WORK_SAVED", userFacingCopy: copy })
        .userFacingCopy,
    ).toBe(copy);
  });
});

describe("findBackendTermLeak — copy stays human", () => {
  it("flags backend codes / route names / id fields / page hand-offs", () => {
    expect(findBackendTermLeak("blocked: CROSS_ORG_DENIED")).toBe(
      "CROSS_ORG_DENIED",
    );
    expect(findBackendTermLeak("status NEEDS_APPROVAL")).toBe("NEEDS_APPROVAL");
    expect(
      findBackendTermLeak("posted to /work-os/collaboration-requests"),
    ).not.toBeNull();
    expect(findBackendTermLeak("set the entity_id field")).not.toBeNull();
    expect(findBackendTermLeak("request_type REVIEW_REQUEST")).not.toBeNull();
    expect(findBackendTermLeak("Open Collaboration to route it")).toBe(
      "Open Collaboration",
    );
    expect(
      findBackendTermLeak("go to the Collaboration page to finish"),
    ).not.toBeNull();
  });

  it("does NOT flag legitimate human copy", () => {
    const clean = [
      "I sent David a review request on your behalf and I'll track their response here.",
      "That needs approval first — I've queued it for David and I'll keep track of it.",
      "I can't reach David — they're outside your organization.",
      "I saved that as a note to yourself.",
      "I found more than one David — do you mean David Odie or David Ramirez?",
      "I added that as a task for you.",
      "I created a self-task linked to the message you received from Sadeil.",
    ];
    for (const c of clean) {
      expect(findBackendTermLeak(c)).toBeNull();
    }
  });
});
