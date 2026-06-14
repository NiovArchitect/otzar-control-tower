// FILE: conversation-isolation.test.ts
// PURPOSE: Phase 1284 Priority-0 — prove the personal chat transcript is
//          scoped per authenticated user and never bleeds across users /
//          accounts / sessions on the same device. This is the regression
//          guard for the shared-localStorage leak (every account showed the
//          same transcript).
// CONNECTS TO: src/lib/work-os/conversation-store.ts

import { describe, expect, it, beforeEach } from "vitest";
import {
  useConversationStore,
  bindConversationScope,
  clearConversationScope,
  appendConversationEntry,
} from "@/lib/work-os/conversation-store";

function entries() {
  return useConversationStore.getState().entries;
}

beforeEach(() => {
  window.localStorage.clear();
  clearConversationScope();
});

describe("conversation transcript per-user isolation (P0)", () => {
  it("starts empty before any user scope is bound (safety guard)", () => {
    expect(entries()).toEqual([]);
  });

  it("does not persist anything while unscoped", () => {
    appendConversationEntry({ role: "user", text: "unscoped message", at: "t0" });
    // In-memory only; nothing written to a shared key.
    const keys = Object.keys(window.localStorage);
    expect(keys.length).toBe(0);
  });

  it("scopes a user's transcript to their own key; another user sees none of it", () => {
    bindConversationScope("sadeil-session");
    appendConversationEntry({ role: "user", text: "Sadeil private test message", at: "t1" });
    expect(entries().some((e) => e.text === "Sadeil private test message")).toBe(true);

    // Switch to David — must NOT see Sadeil's transcript.
    bindConversationScope("david-session");
    expect(entries()).toEqual([]);
    expect(entries().some((e) => e.text === "Sadeil private test message")).toBe(false);
    appendConversationEntry({ role: "user", text: "David private test message", at: "t2" });

    // A third demo account sees neither.
    bindConversationScope("demo-session");
    expect(entries()).toEqual([]);

    // Back to Sadeil — his own transcript reloads, without David's.
    bindConversationScope("sadeil-session");
    const texts = entries().map((e) => e.text);
    expect(texts).toContain("Sadeil private test message");
    expect(texts).not.toContain("David private test message");
  });

  it("clearScope (logout) hides the transcript and stops persistence", () => {
    bindConversationScope("user-x");
    appendConversationEntry({ role: "user", text: "x message", at: "t1" });
    expect(entries().length).toBe(1);
    clearConversationScope();
    expect(entries()).toEqual([]);
    // Re-binding the SAME user still has their durable local data.
    bindConversationScope("user-x");
    expect(entries().some((e) => e.text === "x message")).toBe(true);
  });

  it("never reads the legacy shared v1 key", () => {
    // Simulate a pre-fix leaked shared transcript.
    window.localStorage.setItem(
      "otzar.conversation.v1",
      JSON.stringify([{ id: "leak", role: "user", text: "LEAKED shared message", at: "t0" }]),
    );
    bindConversationScope("any-user");
    expect(entries().some((e) => e.text === "LEAKED shared message")).toBe(false);
  });
});
