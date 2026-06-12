// FILE: tests/unit/native-mic.test.ts
// PURPOSE: Phase 1256A locks — the native desktop mic bridge:
//          status detection across every shell condition, the
//          one-prompt-no-capture request path (every track stopped),
//          and calm copy with no "browser microphone API" / no
//          typed-transcript warnings anywhere.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  detectNativeMicCapability,
  nativeMicCopy,
  requestNativeMicAccess,
  type NativeMicStatus,
} from "../../src/lib/voice/native-mic";

const ALL_STATUSES: NativeMicStatus[] = [
  "AVAILABLE",
  "PERMISSION_NEEDED",
  "DENIED",
  "UNSUPPORTED",
  "SETUP_REQUIRED",
  "ERROR",
];

function stubNavigator(overrides: Record<string, unknown>): void {
  vi.stubGlobal("navigator", { ...overrides });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Phase 1256A — native mic detection", () => {
  it("UNSUPPORTED when the shell exposes no media devices", async () => {
    stubNavigator({});
    const cap = await detectNativeMicCapability();
    expect(cap.status).toBe("UNSUPPORTED");
    expect(cap.media_devices_present).toBe(false);
  });

  it("PERMISSION_NEEDED when getUserMedia exists but permission state is prompt", async () => {
    stubNavigator({
      mediaDevices: {
        getUserMedia: vi.fn(),
        enumerateDevices: vi
          .fn()
          .mockResolvedValue([{ kind: "audioinput" }]),
      },
      permissions: {
        query: vi.fn().mockResolvedValue({ state: "prompt" }),
      },
    });
    const cap = await detectNativeMicCapability();
    expect(cap.status).toBe("PERMISSION_NEEDED");
    expect(cap.input_device_seen).toBe(true);
  });

  it("DENIED when the OS permission is denied", async () => {
    stubNavigator({
      mediaDevices: { getUserMedia: vi.fn(), enumerateDevices: vi.fn().mockResolvedValue([]) },
      permissions: { query: vi.fn().mockResolvedValue({ state: "denied" }) },
    });
    expect((await detectNativeMicCapability()).status).toBe("DENIED");
  });

  it("granted maps to SETUP_REQUIRED without an STT engine, AVAILABLE with one", async () => {
    stubNavigator({
      mediaDevices: { getUserMedia: vi.fn(), enumerateDevices: vi.fn().mockResolvedValue([]) },
      permissions: { query: vi.fn().mockResolvedValue({ state: "granted" }) },
    });
    expect((await detectNativeMicCapability(false)).status).toBe(
      "SETUP_REQUIRED",
    );
    expect((await detectNativeMicCapability(true)).status).toBe("AVAILABLE");
  });

  it("requestNativeMicAccess prompts once and stops EVERY track — never records", async () => {
    const stop = vi.fn();
    stubNavigator({
      mediaDevices: {
        getUserMedia: vi
          .fn()
          .mockResolvedValue({ getTracks: () => [{ stop }, { stop }] }),
      },
    });
    const status = await requestNativeMicAccess(false);
    expect(status).toBe("SETUP_REQUIRED");
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it("requestNativeMicAccess refusal maps to DENIED", async () => {
    stubNavigator({
      mediaDevices: {
        getUserMedia: vi.fn().mockRejectedValue(new Error("NotAllowed")),
      },
    });
    expect(await requestNativeMicAccess()).toBe("DENIED");
  });
});

describe("Phase 1256A — calm copy", () => {
  it("every status has jargon-free copy with a path forward", () => {
    for (const status of ALL_STATUSES) {
      const copy = nativeMicCopy(status);
      expect(copy.length).toBeGreaterThan(15);
      expect(copy).not.toMatch(
        /browser microphone API|typed-transcript|forward-substrate|WKWebView|getUserMedia/i,
      );
    }
    expect(nativeMicCopy("PERMISSION_NEEDED")).toContain(
      "Allow microphone access",
    );
    expect(nativeMicCopy("SETUP_REQUIRED")).toContain("voice provider keys");
    expect(nativeMicCopy("UNSUPPORTED")).toContain("routes it the same way");
  });
});
