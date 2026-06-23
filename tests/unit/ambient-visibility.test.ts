// Phase 2.5 — the ambient visibility policy, enforced in code.
// Proof/audit is silent, low-risk success is a quiet confirmation, and
// approval / blocked / ambiguous / failure interrupt. Copy stays human.
import { describe, it, expect } from "vitest";
import {
  decideAmbientVisibility,
  findBackendTermLeak,
} from "@/lib/work-os/ambient-visibility";

describe("decideAmbientVisibility — visibility levels", () => {
  it("message sent → confirmation, announced, not an interrupt", () => {
    const d = decideAmbientVisibility({ kind: "MESSAGE_SENT" });
    expect(d.visibility).toBe("confirmation");
    expect(d.shouldNotify).toBe(true);
    expect(d.shouldAnnounce).toBe(true);
  });

  it("self work saved → confirmation", () => {
    expect(decideAmbientVisibility({ kind: "SELF_WORK_SAVED" }).visibility).toBe(
      "confirmation",
    );
  });

  it("collaboration sent → confirmation", () => {
    expect(
      decideAmbientVisibility({ kind: "COLLABORATION_SENT" }).visibility,
    ).toBe("confirmation");
  });

  it("ledger / audit / proof → silent: not notified, not announced, audit-only", () => {
    const d = decideAmbientVisibility({ kind: "LEDGER_PROOF" });
    expect(d.visibility).toBe("silent");
    expect(d.shouldNotify).toBe(false);
    expect(d.shouldAnnounce).toBe(false);
    expect(d.shouldShowInAuditOnly).toBe(true);
    expect(d.shouldPersistToLedger).toBe(true);
  });

  it("approval needed → interrupt + badge", () => {
    const d = decideAmbientVisibility({ kind: "APPROVAL_NEEDED" });
    expect(d.visibility).toBe("interrupt");
    expect(d.shouldNotify).toBe(true);
  });

  it("blocked / denied → interrupt", () => {
    expect(decideAmbientVisibility({ kind: "BLOCKED_DENIED" }).visibility).toBe(
      "interrupt",
    );
  });

  it("ambiguous target → interrupt (one focused clarification)", () => {
    expect(
      decideAmbientVisibility({ kind: "AMBIGUOUS_TARGET" }).visibility,
    ).toBe("interrupt");
  });

  it("action failed → interrupt", () => {
    expect(decideAmbientVisibility({ kind: "ACTION_FAILED" }).visibility).toBe(
      "interrupt",
    );
  });

  it("digest → digest level, badged, not spoken aloud", () => {
    const d = decideAmbientVisibility({ kind: "DIGEST_READY" });
    expect(d.visibility).toBe("digest");
    expect(d.shouldBadge).toBe(true);
    expect(d.shouldAnnounce).toBe(false);
  });

  it("quiet mode suppresses a spoken low-risk success but keeps the panel", () => {
    const d = decideAmbientVisibility(
      { kind: "MESSAGE_SENT" },
      { quietMode: true },
    );
    expect(d.shouldNotify).toBe(true); // still shown
    expect(d.shouldAnnounce).toBe(false); // but not spoken
  });

  it("quiet mode NEVER silences an interrupt", () => {
    const d = decideAmbientVisibility(
      { kind: "APPROVAL_NEEDED" },
      { quietMode: true },
    );
    expect(d.shouldAnnounce).toBe(true);
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
    expect(findBackendTermLeak("posted to /work-os/collaboration-requests")).not.toBeNull();
    expect(findBackendTermLeak("set the entity_id field")).not.toBeNull();
    expect(findBackendTermLeak("request_type REVIEW_REQUEST")).not.toBeNull();
    expect(findBackendTermLeak("Open Collaboration to route it")).toBe(
      "Open Collaboration",
    );
    expect(findBackendTermLeak("go to the Collaboration page to finish")).not.toBeNull();
  });

  it("does NOT flag legitimate human copy", () => {
    const clean = [
      "I sent David a review request on your behalf and I'll track their response here.",
      "That needs approval first — I've queued it for David and I'll keep track of it.",
      "I can't reach David — they're outside your organization.",
      "I saved that as a note to yourself.",
      "I found more than one David — do you mean David Odie or David Ramirez?",
      "I added that as a task for you.",
    ];
    for (const c of clean) {
      expect(findBackendTermLeak(c)).toBeNull();
    }
  });
});
