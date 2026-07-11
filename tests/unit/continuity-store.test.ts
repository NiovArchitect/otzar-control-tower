// FILE: src/lib/stores/continuity.test.ts
// PURPOSE: [OTZAR-CONTINUITY C6-CT CHUNK 1] Prove the server-authoritative restoration store:
//          an active thread is adopted + its turns hydrated; no active thread leaves NO
//          active conversation (never invented); a restore failure surfaces "unavailable"
//          without inventing a thread.

import { beforeEach, describe, expect, it, vi } from "vitest";

const restore = vi.fn();
const detail = vi.fn();
const requestByClient = vi.fn();
vi.mock("@/lib/api", () => ({
  api: {
    otzar: {
      threads: {
        restore: (): unknown => restore(),
        detail: (id: string): unknown => detail(id),
        requestByClient: (c: string, r: string): unknown => requestByClient(c, r),
      },
    },
  },
}));

import { useContinuityStore, nextRecoveryAction } from "@/lib/stores/continuity";
import type { OtzarSafeRequestStatus } from "@/lib/types/foundation";

function thread(over: Partial<Record<string, unknown>> = {}) {
  return {
    conversation_id: "conv-1", twin_entity_id: "twin-1", status: "ACTIVE", timezone: null,
    source_type: "CHAT", started_at: "t", last_active_at: "t", message_count: 2, archived: false,
    unresolved_count: 0, ...over,
  };
}

describe("continuity store — server-authoritative restoration", () => {
  beforeEach(() => {
    restore.mockReset();
    detail.mockReset();
    useContinuityStore.getState().reset();
  });

  it("adopts the server active thread + hydrates its turns", async () => {
    restore.mockResolvedValue({ ok: true, data: { active: thread(), recent: [thread()] } });
    detail.mockResolvedValue({
      ok: true,
      data: {
        thread: thread(),
        turns: [
          { turn_id: "u1", role: "USER", content: "hi", sequence: 1, source_channel: "CHAT", created_at: "t" },
          { turn_id: "a1", role: "ASSISTANT", content: "hello", sequence: 2, source_channel: "CHAT", created_at: "t" },
        ],
      },
    });
    await useContinuityStore.getState().bootstrapRestore();
    const s = useContinuityStore.getState();
    expect(s.hydration).toBe("restored");
    expect(s.activeConversationId).toBe("conv-1");
    expect(s.activeTwinId).toBe("twin-1");
    expect(s.restoredTurns.map((t) => t.role)).toEqual(["USER", "ASSISTANT"]);
    expect(detail).toHaveBeenCalledWith("conv-1");
  });

  it("no active thread → keeps NO active conversation (never invents one)", async () => {
    restore.mockResolvedValue({ ok: true, data: { active: null, recent: [] } });
    await useContinuityStore.getState().bootstrapRestore();
    const s = useContinuityStore.getState();
    expect(s.hydration).toBe("restored");
    expect(s.activeConversationId).toBeNull();
    expect(s.restoredTurns).toEqual([]);
    expect(detail).not.toHaveBeenCalled(); // no thread → no detail fetch, no invented thread
  });

  it("a restore failure surfaces 'unavailable' and never invents a thread", async () => {
    restore.mockResolvedValue({ ok: false, code: "SESSION_INVALID", message: "nope", status: 401 });
    await useContinuityStore.getState().bootstrapRestore();
    const s = useContinuityStore.getState();
    expect(s.hydration).toBe("unavailable");
    expect(s.activeConversationId).toBeNull();
    expect(s.restoreError).toBe("nope");
  });

  it("adoptActiveConversation sets the authoritative id; clearActive resets it", () => {
    useContinuityStore.getState().adoptActiveConversation("conv-9", "twin-9");
    expect(useContinuityStore.getState().activeConversationId).toBe("conv-9");
    expect(useContinuityStore.getState().activeTwinId).toBe("twin-9");
    useContinuityStore.getState().clearActive();
    expect(useContinuityStore.getState().activeConversationId).toBeNull();
  });
});

function status(over: Partial<OtzarSafeRequestStatus> = {}): OtzarSafeRequestStatus {
  return {
    request_record_id: "r", conversation_id: "c", client_request_id: "cli", state: "PROCESSING",
    response_class: null, has_canonical_result: false, has_action: false, in_progress: true,
    retryable: false, failure_code: null, canonical_assistant_turn_id: null, canonical_text: null,
    created_at: "t", completed_at: null, ...over,
  };
}

describe("nextRecoveryAction — server-authoritative recovery mapping (pure)", () => {
  it("COMPLETED + valid canonical → render_canonical", () => {
    expect(nextRecoveryAction(status({ state: "COMPLETED", has_canonical_result: true, canonical_text: "hi", in_progress: false }))).toBe("render_canonical");
  });
  it("COMPLETED but NO valid canonical → keep_polling (never fabricate)", () => {
    expect(nextRecoveryAction(status({ state: "COMPLETED", has_canonical_result: false, canonical_text: null, in_progress: false }))).toBe("keep_polling");
  });
  it("RECEIVED / PROCESSING → keep_polling", () => {
    expect(nextRecoveryAction(status({ state: "RECEIVED" }))).toBe("keep_polling");
    expect(nextRecoveryAction(status({ state: "PROCESSING" }))).toBe("keep_polling");
  });
  it("FAILED_RETRYABLE → offer_retry; FAILED_FINAL → final_failure", () => {
    expect(nextRecoveryAction(status({ state: "FAILED_RETRYABLE", retryable: true, in_progress: false }))).toBe("offer_retry");
    expect(nextRecoveryAction(status({ state: "FAILED_FINAL", in_progress: false }))).toBe("final_failure");
  });
  it("null (foreign/missing) → gone; never auto-resubmit", () => {
    expect(nextRecoveryAction(null)).toBe("gone");
  });
});

describe("continuity store — pending persistence + reconcile", () => {
  beforeEach(() => useContinuityStore.getState().reset());

  it("markPending persists + loadPending restores it; clearPending removes it", () => {
    useContinuityStore.getState().markPending({ conversation_id: "c1", client_request_id: "rq1", message: "hi" });
    expect(useContinuityStore.getState().pending?.client_request_id).toBe("rq1");
    expect(useContinuityStore.getState().loadPending()?.conversation_id).toBe("c1");
    useContinuityStore.getState().clearPending();
    expect(useContinuityStore.getState().pending).toBeNull();
    expect(useContinuityStore.getState().loadPending()).toBeNull();
  });

  it("reconcileByClient returns the server status, or null when foreign", async () => {
    requestByClient.mockResolvedValueOnce({ ok: true, data: { status: status({ state: "COMPLETED", has_canonical_result: true, canonical_text: "done", in_progress: false }) } });
    const s1 = await useContinuityStore.getState().reconcileByClient("c1", "rq1");
    expect(s1?.canonical_text).toBe("done");
    requestByClient.mockResolvedValueOnce({ ok: false, code: "OTZAR_THREAD_FORBIDDEN", message: "no", status: 403 });
    const s2 = await useContinuityStore.getState().reconcileByClient("c1", "rq1");
    expect(s2).toBeNull();
  });
});
