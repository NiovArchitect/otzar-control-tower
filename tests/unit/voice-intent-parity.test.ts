// FILE: tests/unit/voice-intent-parity.test.ts
// PURPOSE: [OTZAR-CONTINUITY C7] Prove the voice submission path reaches PARITY with text:
//          every voice send carries a stable request_id + client IANA timezone, reuses a
//          supplied request_id (a conduct retry keeps the SAME logical identity), and passes
//          the active conversation_id through (no shadow thread). Ambient (no conversation_id)
//          stays compatible with org-wide obligation resolution.

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn();
vi.mock("@/lib/api", () => ({ api: { otzar: { voiceIntents: { create: (b: unknown): unknown => create(b) } } } }));
vi.mock("@/lib/otzar/conduct-request", () => ({
  clientTimezone: (): string => "America/New_York",
  newRequestId: (): string => "ct-fresh-id",
}));

import { useOtzarVoiceIntent } from "@/hooks/useOtzarVoiceIntent";

describe("C7 voice-intent parity", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ ok: true, data: { response: "ok" } });
  });

  it("carries a fresh request_id + client_timezone when none supplied", async () => {
    const { result } = renderHook(() => useOtzarVoiceIntent());
    await act(async () => { await result.current.send("book a review"); });
    const body = create.mock.calls[0]![0] as Record<string, unknown>;
    expect(body.transcript_text).toBe("book a review");
    expect(body.request_id).toBe("ct-fresh-id");
    expect(body.client_timezone).toBe("America/New_York");
  });

  it("REUSES a supplied request_id (conduct retry keeps the same logical identity) + passes conversation_id", async () => {
    const { result } = renderHook(() => useOtzarVoiceIntent());
    await act(async () => { await result.current.send("same submission", { conversation_id: "conv-7", request_id: "ct-stable-7" }); });
    const body = create.mock.calls[0]![0] as Record<string, unknown>;
    expect(body.request_id).toBe("ct-stable-7"); // not a fresh id
    expect(body.conversation_id).toBe("conv-7"); // no shadow thread
    expect(body.client_timezone).toBe("America/New_York");
  });

  it("ambient (no conversation_id) omits it → server does org-wide obligation resolution", async () => {
    const { result } = renderHook(() => useOtzarVoiceIntent());
    await act(async () => { await result.current.send("what's pending?", { request_id: "ct-amb-1" }); });
    const body = create.mock.calls[0]![0] as Record<string, unknown>;
    expect("conversation_id" in body).toBe(false);
    expect(body.request_id).toBe("ct-amb-1");
  });
});
