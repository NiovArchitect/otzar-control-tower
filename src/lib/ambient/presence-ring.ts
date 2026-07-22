// FILE: presence-ring.ts
// PURPOSE: [OTZAR-LIVE-6 → PROD-UX-AMBIENT] The orb's ambient state palette.
//          Behance brand spectrum through frosted glass — purple / blue /
//          silver / orange. Never hard neon borders. Same nine-state language
//          as AmbientEdgeGlow. Calm, low-opacity, blurred, sleek pop.
// CONNECTS TO: AmbientOtzarBar, presence store, presence-ring tests.

import type { OtzarPresenceState } from "@/lib/stores/presence";

export function presenceRing(state: OtzarPresenceState): {
  bloom: string;
  glow: string;
  dot: string;
} {
  switch (state) {
    case "LISTENING":
      return {
        bloom:
          "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(64,93,230,0.32),transparent_70%)]",
        glow: "shadow-[0_8px_48px_-12px_rgba(64,93,230,0.48)]",
        dot: "bg-[#405DE6]",
      };
    case "THINKING":
      return {
        bloom:
          "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(177,36,232,0.32),transparent_70%)]",
        glow: "shadow-[0_8px_48px_-12px_rgba(177,36,232,0.48)]",
        dot: "bg-[#B124E8]",
      };
    case "RECOMMENDATION":
      return {
        bloom:
          "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(168,85,247,0.28),transparent_70%)]",
        glow: "shadow-[0_8px_44px_-14px_rgba(168,85,247,0.42)]",
        dot: "bg-[#a855f7]",
      };
    case "APPROVAL_REQUIRED":
      return {
        bloom:
          "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(247,119,55,0.32),transparent_70%)]",
        glow: "shadow-[0_8px_50px_-12px_rgba(247,119,55,0.48)]",
        dot: "bg-[#F77737]",
      };
    case "SUCCESS":
      return {
        bloom:
          "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(52,211,153,0.26),transparent_70%)]",
        glow: "shadow-[0_8px_48px_-12px_rgba(52,211,153,0.42)]",
        dot: "bg-emerald-400",
      };
    case "BLOCKED":
      return {
        bloom:
          "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(247,119,55,0.22),transparent_70%)]",
        glow: "shadow-[0_8px_40px_-14px_rgba(247,119,55,0.36)]",
        dot: "bg-[#F77737]",
      };
    case "FAILURE":
      return {
        bloom:
          "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(251,113,133,0.24),transparent_70%)]",
        glow: "shadow-[0_8px_44px_-14px_rgba(251,113,133,0.4)]",
        dot: "bg-rose-400",
      };
    case "QUIET":
      return {
        bloom:
          "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(229,231,236,0.1),transparent_70%)]",
        glow: "shadow-[0_8px_36px_-16px_rgba(10,6,18,0.35)]",
        dot: "bg-slate-400",
      };
    case "IDLE":
    default:
      return {
        bloom:
          "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(177,36,232,0.14),transparent_70%)]",
        glow: "shadow-[0_8px_40px_-14px_rgba(30,27,75,0.35)]",
        dot: "bg-[#a855f7]/70",
      };
  }
}
