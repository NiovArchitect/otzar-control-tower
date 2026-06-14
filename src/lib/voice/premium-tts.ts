// FILE: premium-tts.ts
// PURPOSE: Phase 1259 → 1264. The client half of the premium voice
//          runtime. As of Phase 1264 the actual engine lives in
//          voice-playback-controller.ts (single active utterance,
//          cancel-previous, premium-first, no robot-voice race). This
//          module re-exports the stable surface so every existing
//          import path (`@/lib/voice/premium-tts`) keeps working and
//          the Phase 1259 honesty locks stay green.
// CONNECTS TO: voice-playback-controller.ts (the engine),
//          VoiceProviders (Hear it), AmbientOtzarBar (assistant
//          speech), tests/unit/premium-tts.test.ts.

export {
  speakPremium,
  speakWithOtzarVoice,
  cancelVoicePlayback,
  getLastVoicePath,
  type PremiumSpeakOutcome,
  type VoicePlaybackPath,
  type SpeakOptions,
} from "./voice-playback-controller";
