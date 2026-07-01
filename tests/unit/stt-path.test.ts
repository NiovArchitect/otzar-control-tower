// FILE: tests/unit/stt-path.test.ts
// PURPOSE: PROD-UX-P0G — full decision-matrix coverage for the browser
//          voice → server STT fallback. Locks the product guarantees:
//          the Tauri desktop flow is preserved EXACTLY (never Web
//          Speech), browsers keep Web Speech as primary while it works,
//          the server transcription path takes over when Web Speech is
//          unavailable or has failed this session, the auto-switch
//          fires at most once per session and only on the "network"
//          error, honest copy claims voice only when it can work, and
//          MediaRecorder MIME selection stays inside the Foundation
//          transcribe route's allowlist.

import { describe, expect, it } from "vitest";
import {
  decideSttPath,
  micCopyFor,
  SERVER_STT_DISCLOSURE,
  SERVER_STT_TRANSCRIBED_NOTE,
  shouldAutoFallbackToServerStt,
  speechRecognitionErrorCopy,
} from "@/lib/voice/diagnostics";
import {
  pickRecorderMimeType,
  RECORDER_MIME_CANDIDATES,
} from "@/hooks/useDesktopVoiceCapture";

describe("stt-path — decideSttPath (P0G decision matrix)", () => {
  it("tauri + recorder → desktop_capture (the existing desktop flow, unchanged)", () => {
    expect(
      decideSttPath({
        shell: "tauri_webview",
        webSpeechAvailable: false,
        recorderAvailable: true,
        serverSttPreferred: false,
      }),
    ).toBe("desktop_capture");
  });

  it("tauri NEVER routes to web speech, even if SpeechRecognition is somehow present", () => {
    expect(
      decideSttPath({
        shell: "tauri_webview",
        webSpeechAvailable: true,
        recorderAvailable: true,
        serverSttPreferred: false,
      }),
    ).toBe("desktop_capture");
  });

  it("tauri without a recorder → text_only (typing stays the honest fallback)", () => {
    expect(
      decideSttPath({
        shell: "tauri_webview",
        webSpeechAvailable: true,
        recorderAvailable: false,
        serverSttPreferred: false,
      }),
    ).toBe("text_only");
  });

  it("chromium with working Web Speech → web_speech (existing default preserved)", () => {
    expect(
      decideSttPath({
        shell: "browser_chromium",
        webSpeechAvailable: true,
        recorderAvailable: true,
        serverSttPreferred: false,
      }),
    ).toBe("web_speech");
  });

  it("browser where Web Speech already failed this session → server_stt (no flapping back)", () => {
    expect(
      decideSttPath({
        shell: "browser_chromium",
        webSpeechAvailable: true,
        recorderAvailable: true,
        serverSttPreferred: true,
      }),
    ).toBe("server_stt");
  });

  it("browser without Web Speech (Firefox/Safari) but with a recorder → server_stt as PRIMARY", () => {
    expect(
      decideSttPath({
        shell: "browser_other",
        webSpeechAvailable: false,
        recorderAvailable: true,
        serverSttPreferred: false,
      }),
    ).toBe("server_stt");
  });

  it("server preferred but recorder missing → retry web speech rather than losing voice", () => {
    expect(
      decideSttPath({
        shell: "browser_chromium",
        webSpeechAvailable: true,
        recorderAvailable: false,
        serverSttPreferred: true,
      }),
    ).toBe("web_speech");
  });

  it("nothing can capture audio → text_only", () => {
    expect(
      decideSttPath({
        shell: "browser_other",
        webSpeechAvailable: false,
        recorderAvailable: false,
        serverSttPreferred: false,
      }),
    ).toBe("text_only");
  });
});

describe("stt-path — shouldAutoFallbackToServerStt (one-time auto-switch)", () => {
  const base = {
    shell: "browser_chromium" as const,
    webSpeechError: "network" as string | null,
    recorderAvailable: true,
    alreadyFellBackThisSession: false,
  };

  it("fires on the 'network' Web Speech error when the recorder can take over", () => {
    expect(shouldAutoFallbackToServerStt(base)).toBe(true);
  });

  it("fires at most once per session", () => {
    expect(
      shouldAutoFallbackToServerStt({ ...base, alreadyFellBackThisSession: true }),
    ).toBe(false);
  });

  it("never fires on desktop (Tauri never ran Web Speech)", () => {
    expect(
      shouldAutoFallbackToServerStt({ ...base, shell: "tauri_webview" }),
    ).toBe(false);
  });

  it("only the 'network' error triggers it — permission/no-speech errors show copy instead", () => {
    for (const err of ["not-allowed", "no-speech", "aborted", "audio-capture", null]) {
      expect(
        shouldAutoFallbackToServerStt({ ...base, webSpeechError: err }),
      ).toBe(false);
    }
  });

  it("never fires when the recorder cannot take over", () => {
    expect(
      shouldAutoFallbackToServerStt({ ...base, recorderAvailable: false }),
    ).toBe(false);
  });
});

describe("stt-path — honest copy", () => {
  it("browser without Web Speech but WITH the server path: voice is claimed ready", () => {
    const out = micCopyFor("browser_other", "granted", false, true);
    expect(out.micButtonEnabled).toBe(true);
    expect(out.tone).toBe("ok");
    expect(out.headline).toMatch(/Voice is ready/);
    expect(out.detail).toMatch(/review before sending/);
  });

  it("browser without Web Speech and WITHOUT the server path: voice is NOT claimed", () => {
    const out = micCopyFor("browser_other", "granted", false, false);
    expect(out.micButtonEnabled).toBe(false);
    expect(out.headline).toMatch(/unavailable/i);
  });

  it("pre-P0G call sites (3-arg) keep their exact behavior — serverStt defaults off", () => {
    const out = micCopyFor("browser_other", "granted", false);
    expect(out.micButtonEnabled).toBe(false);
  });

  it("the 'network' error copy promises the server retry without jargon", () => {
    const copy = speechRecognitionErrorCopy("network");
    expect(copy).toMatch(/secure server transcription/);
    expect(copy).not.toMatch(/STT|API|Web Speech/);
  });

  it("disclosure + transcribed note stay honest: transcript text only, review before send", () => {
    expect(SERVER_STT_DISCLOSURE).toMatch(/transcript text, not raw audio/);
    expect(SERVER_STT_TRANSCRIBED_NOTE).toMatch(/review/);
  });
});

describe("stt-path — pickRecorderMimeType (Foundation allowlist)", () => {
  it("every candidate stays inside the transcribe route's allowlist", () => {
    for (const candidate of RECORDER_MIME_CANDIDATES) {
      expect(candidate).toMatch(/^audio\/(webm|ogg|wav|mp4|mpeg|m4a)/);
    }
  });

  it("Chromium-shaped support picks audio/webm with opus first", () => {
    const chromium = (t: string) => t.startsWith("audio/webm");
    expect(pickRecorderMimeType(chromium)).toBe("audio/webm;codecs=opus");
  });

  it("Safari/WKWebView-shaped support picks audio/mp4", () => {
    const safari = (t: string) => t === "audio/mp4";
    expect(pickRecorderMimeType(safari)).toBe("audio/mp4");
  });

  it("no supported candidate → null (constructor falls back to the shell default)", () => {
    expect(pickRecorderMimeType(() => false)).toBeNull();
  });

  it("a vendor probe that throws is treated as 'unsupported', not a crash", () => {
    const flaky = (t: string): boolean => {
      if (t.includes("webm")) throw new Error("vendor quirk");
      return t === "audio/mp4";
    };
    expect(pickRecorderMimeType(flaky)).toBe("audio/mp4");
  });
});
