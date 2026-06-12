// FILE: premium-tts.ts
// PURPOSE: Phase 1259 — the client half of the premium voice
//          runtime. Asks Foundation's TTS preview endpoint for real
//          provider audio (ElevenLabs) and plays it; reports
//          honestly when the premium path is unavailable so callers
//          fall back to the device voice WITH correct labeling —
//          never silently, never as a fake success.
// CONNECTS TO: Foundation POST /otzar/voice/tts-preview,
//          VoiceProviders (Hear it), AmbientOtzarBar (assistant
//          speech), tests/unit/premium-tts.test.ts.

import { useAuthStore } from "@/lib/stores/auth";

const BASE =
  import.meta.env.VITE_FOUNDATION_API_URL ?? "http://localhost:3000/api/v1";

export type PremiumSpeakOutcome =
  | { kind: "PREMIUM"; provider: string }
  | { kind: "FALLBACK_NEEDED"; reason: "NOT_CONFIGURED" | "UNAVAILABLE" };

// WHAT: Fetch premium audio for `text` and play it.
// OUTPUT: PREMIUM when provider audio actually played;
//         FALLBACK_NEEDED otherwise (caller decides the device-voice
//         fallback and labels it honestly).
// WHY: the sound the user hears must match the status the UI shows.
export async function speakPremium(
  text: string,
): Promise<PremiumSpeakOutcome> {
  const token = useAuthStore.getState().token;
  if (token === null) return { kind: "FALLBACK_NEEDED", reason: "UNAVAILABLE" };
  try {
    const res = await fetch(`${BASE}/otzar/voice/tts-preview`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      let code = "UNAVAILABLE";
      try {
        const body = (await res.json()) as { code?: string };
        if (body.code === "TTS_NOT_CONFIGURED") code = "NOT_CONFIGURED";
      } catch {
        /* non-JSON error body */
      }
      return {
        kind: "FALLBACK_NEEDED",
        reason: code as "NOT_CONFIGURED" | "UNAVAILABLE",
      };
    }
    const provider = res.headers.get("X-Voice-Provider") ?? "PROVIDER";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
    return { kind: "PREMIUM", provider };
  } catch {
    return { kind: "FALLBACK_NEEDED", reason: "UNAVAILABLE" };
  }
}
