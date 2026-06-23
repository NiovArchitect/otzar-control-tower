// Phase 2.6 — Work Context Resolution Seed: pure reference detection + labels.
// (resolveWorkContext's live wiring is covered in ambient-otzar-bar.test.tsx.)
import { describe, it, expect } from "vitest";
import {
  detectWorkReference,
  contextLabel,
  type WorkContextRef,
} from "@/lib/work-os/work-context";

describe("detectWorkReference — deictic references that need a work object", () => {
  it("detects received-message references → notification type", () => {
    for (const t of [
      "validate what I received",
      "confirm what he received",
      "summarize the latest message",
      "open the latest notification",
    ]) {
      const ref = detectWorkReference(t);
      expect(ref).not.toBeNull();
      expect(ref!.expectedType).toBe("notification");
    }
  });

  it("detects transcript / meeting / client-note / document references", () => {
    expect(detectWorkReference("review the transcript")!.expectedType).toBe(
      "transcript",
    );
    expect(detectWorkReference("send notes from this meeting")!.expectedType).toBe(
      "meeting",
    );
    expect(detectWorkReference("review this client note")!.expectedType).toBe(
      "client_note",
    );
    expect(detectWorkReference("review the document")!.expectedType).toBe(
      "document",
    );
  });

  it("each detected reference carries ONE focused clarification question", () => {
    expect(detectWorkReference("review this client note")!.clarificationQuestion).toMatch(
      /Which client note should I attach\?/i,
    );
    expect(detectWorkReference("review the transcript")!.clarificationQuestion).toMatch(
      /Which transcript/i,
    );
  });

  it("returns null for NAMED objects (no deictic placeholder) → send proceeds", () => {
    expect(detectWorkReference("review the budget plan")).toBeNull();
    expect(detectWorkReference("approve the Q3 hiring proposal")).toBeNull();
    expect(detectWorkReference("prepare the GTM deck")).toBeNull(); // named, not "the deck"
    expect(detectWorkReference("validate the figures")).toBeNull();
  });

  it("matches a bare 'the deck' deictic → document", () => {
    expect(detectWorkReference("review the deck")!.expectedType).toBe("document");
  });

  it("returns null for plain conversation with no work reference", () => {
    expect(detectWorkReference("thanks so much")).toBeNull();
    expect(detectWorkReference("good morning team")).toBeNull();
  });
});

describe("contextLabel — human labels only", () => {
  it("labels a resolved notification with its sender", () => {
    const ctx: WorkContextRef = {
      referenceText: "what I received",
      resolved: true,
      confidence: 0.7,
      contextType: "notification",
      owner: "Sadeil",
      allowedByPolicy: true,
      needsClarification: false,
    };
    expect(contextLabel(ctx)).toBe("the message you received from Sadeil");
  });

  it("labels transcript / client note without backend terms", () => {
    expect(
      contextLabel({
        referenceText: "the transcript",
        resolved: true,
        confidence: 0.6,
        contextType: "transcript",
        allowedByPolicy: true,
        needsClarification: false,
      }),
    ).toBe("the transcript");
    expect(
      contextLabel({
        referenceText: "this client note",
        resolved: false,
        confidence: 0,
        contextType: "client_note",
        allowedByPolicy: true,
        needsClarification: true,
      }),
    ).toBe("the client note");
  });
});
