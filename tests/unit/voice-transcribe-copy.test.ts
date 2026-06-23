// FILE: tests/unit/voice-transcribe-copy.test.ts (unit)
// PURPOSE: [OTZAR-V1-LIVE-4] Lock the honest copy for the server-side speech
//          path: the not-configured fallback preserves text input, the ElevenLabs
//          server-STT disclosure is honest about audio leaving the browser while
//          only transcript text is kept, and the browser path is disclosed too.
//          No fake "configured", no raw-audio-storage claim.
// CONNECTS TO: src/lib/voice/diagnostics.ts.

import { describe, expect, it } from "vitest";
import {
  transcribeErrorCopy,
  sttDisclosureCopy,
  SERVER_STT_DISCLOSURE,
  BROWSER_STT_DISCLOSURE,
} from "@/lib/voice/diagnostics";

describe("transcribeErrorCopy — honest server-STT failure copy (LIVE-4)", () => {
  it("VOICE_STT_PROVIDER_NOT_CONFIGURED keeps text input available, no fake 'configured'", () => {
    const copy = transcribeErrorCopy("VOICE_STT_PROVIDER_NOT_CONFIGURED");
    expect(copy.toLowerCase()).toContain("not configured");
    expect(copy.toLowerCase()).toContain("text input");
  });

  it("UNSUPPORTED_STT_PROVIDER is honest and keeps typing working", () => {
    expect(transcribeErrorCopy("UNSUPPORTED_STT_PROVIDER").toLowerCase()).toContain("typing");
  });

  it("never claims raw audio is stored, in any mapped failure", () => {
    for (const code of [
      "VOICE_STT_PROVIDER_NOT_CONFIGURED",
      "PROVIDER_ERROR",
      "AUDIO_TOO_LARGE",
      "EMPTY_AUDIO",
      "INVALID_AUDIO_TYPE",
    ]) {
      expect(transcribeErrorCopy(code).toLowerCase()).not.toContain("store");
    }
  });
});

describe("sttDisclosureCopy — honest engine disclosure (LIVE-4)", () => {
  it("server STT discloses ElevenLabs + transcript-only (not raw audio)", () => {
    const copy = sttDisclosureCopy("ELEVENLABS");
    expect(copy).toBe(SERVER_STT_DISCLOSURE);
    expect(copy).toContain("ElevenLabs");
    expect(copy.toLowerCase()).toContain("transcript text, not raw audio");
  });

  it("browser STT discloses the browser produces the transcript", () => {
    expect(sttDisclosureCopy("LOCAL_BROWSER")).toBe(BROWSER_STT_DISCLOSURE);
    expect(sttDisclosureCopy(null)).toBe(BROWSER_STT_DISCLOSURE);
  });
});
