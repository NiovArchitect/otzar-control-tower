// FILE: tests/unit/voice-diagnostics.test.ts
// PURPOSE: Pure-function coverage for the voice diagnostics
//          helpers. Locks the honest copy guarantees so the
//          desktop "unsupported in this shell" path can never
//          silently regress into a misleading "permission can be
//          requested" UI.

import { describe, expect, it } from "vitest";
import {
  llmErrorCopy,
  micCopyFor,
  speechRecognitionErrorCopy,
  ttsHealthCopy,
} from "@/lib/voice/diagnostics";

describe("voice diagnostics — micCopyFor", () => {
  it("tauri_webview: calm typed fallback — no jargon, no warnings (Phase 1253)", () => {
    const out = micCopyFor("tauri_webview", "unsupported", false);
    expect(out.headline).toMatch(/Type to Otzar/);
    expect(out.showRequestButton).toBe(false);
    expect(out.micButtonEnabled).toBe(false);
    expect(out.tone).toBe("muted");
    expect(out.detail).toMatch(/Typing works exactly the same/);
    expect(`${out.headline} ${out.detail}`).not.toMatch(
      /typed-transcript|browser microphone API|forward-substrate/,
    );
  });

  it("tauri_webview: even if SpeechRecognition is somehow present, typing stays the path", () => {
    const out = micCopyFor("tauri_webview", "granted", true);
    expect(out.headline).toMatch(/Type to Otzar/);
    expect(out.micButtonEnabled).toBe(false);
  });

  it("chromium browser + granted: mic enabled, no request button", () => {
    const out = micCopyFor("browser_chromium", "granted", true);
    expect(out.tone).toBe("ok");
    expect(out.micButtonEnabled).toBe(true);
    expect(out.showRequestButton).toBe(false);
  });

  it("chromium browser + prompt: shows Request permission button + mic still disabled", () => {
    const out = micCopyFor("browser_chromium", "prompt", true);
    expect(out.showRequestButton).toBe(true);
    expect(out.micButtonEnabled).toBe(false);
    expect(out.tone).toBe("warn");
    expect(out.detail).toMatch(/Request microphone permission/);
  });

  it("chromium browser + denied: actionable site-settings copy, NO request button", () => {
    const out = micCopyFor("browser_chromium", "denied", true);
    expect(out.tone).toBe("error");
    expect(out.headline).toMatch(/Microphone was blocked/);
    expect(out.detail).toMatch(/site settings/);
    expect(out.showRequestButton).toBe(false);
    expect(out.micButtonEnabled).toBe(false);
  });

  it("chromium browser + unsupported permissions API but STT present: lets the operator try mic anyway", () => {
    const out = micCopyFor("browser_chromium", "unsupported", true);
    expect(out.micButtonEnabled).toBe(true);
    expect(out.showRequestButton).toBe(false);
    expect(out.detail).toMatch(/browser will prompt directly/);
  });

  it("browser_other (no STT support): no request button + actionable Chrome suggestion", () => {
    const out = micCopyFor("browser_other", "prompt", false);
    expect(out.micButtonEnabled).toBe(false);
    expect(out.showRequestButton).toBe(false);
    expect(out.detail).toMatch(/Open Otzar in Chrome/);
  });
});

describe("voice diagnostics — speechRecognitionErrorCopy", () => {
  it("not-allowed → actionable browser-fallback copy without dev URLs", () => {
    const out = speechRecognitionErrorCopy("not-allowed");
    expect(out).toMatch(/Microphone was blocked/);
    expect(out).toMatch(/in your browser/);
    expect(out).toMatch(/type your message/);
    expect(out).not.toContain("not-allowed"); // raw code hidden
    expect(out).not.toContain("localhost"); // production-coherent copy
  });

  it("service-not-allowed maps to the same not-allowed copy", () => {
    expect(speechRecognitionErrorCopy("service-not-allowed")).toBe(
      speechRecognitionErrorCopy("not-allowed"),
    );
  });

  it("no-speech / audio-capture / network / aborted each map to distinct copy", () => {
    expect(speechRecognitionErrorCopy("no-speech")).toMatch(/No speech detected/);
    expect(speechRecognitionErrorCopy("audio-capture")).toMatch(/No microphone device detected/);
    expect(speechRecognitionErrorCopy("network")).toMatch(/network/);
    expect(speechRecognitionErrorCopy("aborted")).toMatch(/cancelled/);
  });

  it("unknown error code still produces actionable copy (no raw code leak alone)", () => {
    const out = speechRecognitionErrorCopy("weird-vendor-error");
    expect(out).toMatch(/Try again or type your message/);
  });
});

describe("voice diagnostics — llmErrorCopy", () => {
  it("LLM_UNAVAILABLE → calm setup-mode copy, no provider jargon (Phase 1253)", () => {
    const out = llmErrorCopy("LLM_UNAVAILABLE");
    expect(out).toMatch(/setup mode/);
    expect(out).toMatch(/admin can finish setup/);
    expect(out).not.toMatch(/LLM_PROVIDER|backend|brain/);
    expect(out).not.toMatch(/sk-/);
    expect(out).not.toMatch(/api[_-]?key=/i);
  });

  it("BUDGET_TOO_LARGE → actionable trim suggestion", () => {
    expect(llmErrorCopy("BUDGET_TOO_LARGE")).toMatch(/a little long/);
  });

  it("session codes → 'sign in again' copy", () => {
    for (const code of [
      "SESSION_INVALID",
      "SESSION_EXPIRED",
      "SESSION_REVOKED",
      "SESSION_INVALIDATED",
    ]) {
      expect(llmErrorCopy(code)).toMatch(/sign in again/i);
    }
  });

  it("unknown code → plain recovery copy with a small support ref, never raw backend prose", () => {
    const out = llmErrorCopy("MYSTERY_CODE");
    expect(out).toMatch(/try again in a moment/);
    expect(out).toMatch(/ref: MYSTERY_CODE/);
    expect(out).not.toMatch(/Foundation API logs|Otzar error/);
  });
});

describe("voice diagnostics — ttsHealthCopy", () => {
  it("not supported", () => {
    expect(ttsHealthCopy(false, false, "untested").copy).toMatch(/unavailable in this shell/);
  });
  it("muted", () => {
    expect(ttsHealthCopy(true, true, "untested").copy).toMatch(/muted/);
  });
  it("supported, not yet tested", () => {
    expect(ttsHealthCopy(true, false, "untested").copy).toMatch(/click 'Test Otzar voice'/i);
  });
  it("supported, last spoken", () => {
    expect(ttsHealthCopy(true, false, "spoken").copy).toMatch(/speak responses through your device/);
  });
  it("supported, no_audio reported", () => {
    expect(ttsHealthCopy(true, false, "no_audio").copy).toMatch(/Mac output volume/);
  });
});
