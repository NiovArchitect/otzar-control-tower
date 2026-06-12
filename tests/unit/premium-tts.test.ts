// FILE: tests/unit/premium-tts.test.ts
// PURPOSE: Phase 1259 locks — premium-first voice honesty:
//          speakPremium plays provider audio on success and reports
//          FALLBACK_NEEDED on failure (so device voice is only ever
//          a labeled fallback); browser TTS can never masquerade as
//          the premium path.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { speakPremium } from "../../src/lib/voice/premium-tts";
import { useAuthStore } from "../../src/lib/stores/auth";

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
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Phase 1259 — speakPremium honesty", () => {
  it("plays provider audio and reports PREMIUM on success", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      "Audio",
      class {
        onended: (() => void) | null = null;
        play = play;
        constructor(public src: string) {}
      },
    );
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:fake"),
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "X-Voice-Provider": "ELEVENLABS" }),
        blob: async () => new Blob([new Uint8Array([1, 2, 3])]),
      }),
    );
    const outcome = await speakPremium("Good morning. I'm Otzar.");
    expect(outcome).toEqual({ kind: "PREMIUM", provider: "ELEVENLABS" });
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("provider 503 → FALLBACK_NEEDED (caller labels the device voice honestly)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false, code: "TTS_PROVIDER_UNAVAILABLE" }),
      }),
    );
    expect(await speakPremium("hi")).toEqual({
      kind: "FALLBACK_NEEDED",
      reason: "UNAVAILABLE",
    });
  });

  it("missing key → NOT_CONFIGURED reason", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false, code: "TTS_NOT_CONFIGURED" }),
      }),
    );
    expect(await speakPremium("hi")).toEqual({
      kind: "FALLBACK_NEEDED",
      reason: "NOT_CONFIGURED",
    });
  });

  it("network failure never throws — honest fallback", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect((await speakPremium("hi")).kind).toBe("FALLBACK_NEEDED");
  });
});

describe("Phase 1259B — runtime voice-path locks", () => {
  it("Tauri CSP allows blob: media playback (the premium-audio blocker)", async () => {
    const { readFileSync } = await import("node:fs");
    const conf = readFileSync("src-tauri/tauri.conf.json", "utf8");
    expect(conf).toContain("media-src 'self' blob:");
  });

  it("no UI component calls device TTS directly — fallback closures only", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const offenders: string[] = [];
    function walk(dir: string): void {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx|ts)$/.test(name) && !p.includes("useSpeechSynthesis")) {
          const src = readFileSync(p, "utf8");
          for (const line of src.split("\n")) {
            const t = line.trim();
            if (
              t.includes("synthesis.speak(") &&
              !t.startsWith("//") &&
              !t.includes("synthesis.speak(t,")
            ) {
              offenders.push(`${p}: ${t.slice(0, 80)}`);
            }
          }
        }
      }
    }
    walk("src");
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("speakWithOtzarVoice fires the device fallback ONLY on premium failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const { speakWithOtzarVoice } = await import(
      "../../src/lib/voice/premium-tts"
    );
    const fallback = vi.fn();
    const outcome = await speakWithOtzarVoice("hello", fallback);
    expect(outcome.kind).toBe("FALLBACK_NEEDED");
    expect(fallback).toHaveBeenCalledWith("hello");
  });
});
