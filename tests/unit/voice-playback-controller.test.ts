// FILE: tests/unit/voice-playback-controller.test.ts
// PURPOSE: Phase 1264 locks — the single-active-utterance voice engine
//          that fixes the Founder's bugs: (1) premium-first with an
//          honest device fallback, (2) a NEW prompt cancels the prior
//          utterance (no double-speaking), and (3) when a newer prompt
//          supersedes an in-flight one, the older one's device
//          fallback NEVER fires (no "robot voice speaks second").

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  speakWithOtzarVoice,
  cancelVoicePlayback,
  getLastVoicePath,
} from "../../src/lib/voice/voice-playback-controller";
import { useAuthStore } from "../../src/lib/stores/auth";

let lastAudio: { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> } | null;

function stubAudio(): void {
  lastAudio = null;
  vi.stubGlobal(
    "Audio",
    class {
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      src: string;
      constructor(src: string) {
        this.src = src;
        // Record the handle WITHOUT aliasing `this` (no-this-alias).
        lastAudio = { play: this.play, pause: this.pause };
      }
    },
  );
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn().mockReturnValue("blob:fake"),
    revokeObjectURL: vi.fn(),
  });
}

beforeEach(() => {
  useAuthStore.setState({
    token: "tok",
    entity: { email: "e@example.com" },
    isAuthenticated: true,
    capabilities: {
      can_read_capsules: true,
      can_write_capsules: true,
      can_share_capsules: false,
      can_admin_org: false,
      can_admin_niov: false,
    },
  });
  stubAudio();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Phase 1264 — VoicePlaybackController", () => {
  it("plays premium and records premium_voice; device fallback never fires", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "X-Voice-Provider": "ELEVENLABS" }),
        blob: async () => new Blob([new Uint8Array([1, 2, 3])]),
      }),
    );
    const fallback = vi.fn();
    const outcome = await speakWithOtzarVoice("hello", fallback);
    expect(outcome).toEqual({ kind: "PREMIUM", provider: "ELEVENLABS" });
    expect(fallback).not.toHaveBeenCalled();
    expect(getLastVoicePath()).toBe("premium_voice");
  });

  it("falls back to the device voice ONLY on premium failure and labels it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const fallback = vi.fn();
    const outcome = await speakWithOtzarVoice("hello", fallback);
    expect(outcome.kind).toBe("FALLBACK_NEEDED");
    expect(fallback).toHaveBeenCalledWith("hello");
    expect(getLastVoicePath()).toBe("fallback_device_voice");
  });

  it("respects muted: no premium, no device, records muted", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const fallback = vi.fn();
    await speakWithOtzarVoice("hello", fallback, { muted: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
    expect(getLastVoicePath()).toBe("muted");
  });

  it("a superseding prompt cancels the prior utterance's device fallback (no robot voice second)", async () => {
    // Utterance 1's premium fetch is controllable + rejects later.
    let rejectOne: (e: unknown) => void = () => {};
    const slow = new Promise((_resolve, reject) => {
      rejectOne = reject;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValueOnce(slow));
    const fb1 = vi.fn();
    const p1 = speakWithOtzarVoice("first", fb1);
    // A newer prompt arrives before utterance 1 resolves.
    cancelVoicePlayback();
    // Now utterance 1's premium fetch fails.
    rejectOne(new Error("aborted"));
    await p1;
    // The stale utterance must NOT speak through the device voice.
    expect(fb1).not.toHaveBeenCalled();
  });

  it("cancelVoicePlayback stops the active premium audio", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "X-Voice-Provider": "ELEVENLABS" }),
        blob: async () => new Blob([new Uint8Array([1, 2, 3])]),
      }),
    );
    await speakWithOtzarVoice("hello", vi.fn());
    expect(lastAudio).not.toBeNull();
    cancelVoicePlayback();
    expect(lastAudio!.pause).toHaveBeenCalled();
  });
});
