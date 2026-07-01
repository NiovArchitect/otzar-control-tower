// FILE: presence-ring.ts
// PURPOSE: [OTZAR-LIVE-6 → PROD-UX-AMBIENT] The orb's ambient state palette.
//          The orb is a translucent frosted-glass intelligence layer, and its
//          presence state is expressed as Siri-like AMBIENT COLOR diffused
//          THROUGH the glass, never a hard neon border. Speaks the SAME
//          nine-state language as AmbientEdgeGlow so a glow always means a
//          real state. Returns: `bloom` — a soft radial color field painted
//          under the glass (the Siri aura); `glow` — a low-opacity outer
//          luminance (depth + state hint); `dot` — the small status-dot
//          accent. Calm, low-opacity, blurred.
//
//          Lives in lib (not the component file) so shared visual state
//          logic stays fast-refresh-safe and unit-testable on its own.
// CONNECTS TO: src/components/otzar/AmbientOtzarBar.tsx (orb + dock glass),
//          src/lib/stores/presence.ts (OtzarPresenceState),
//          tests/unit/presence-ring.test.ts.

import type { OtzarPresenceState } from "@/lib/stores/presence";

export function presenceRing(state: OtzarPresenceState): {
  bloom: string;
  glow: string;
  dot: string;
} {
  switch (state) {
    case "LISTENING":
      return { bloom: "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(56,189,248,0.30),transparent_70%)]", glow: "shadow-[0_8px_48px_-12px_rgba(56,189,248,0.45)]", dot: "bg-sky-400" };
    case "THINKING":
      return { bloom: "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(129,140,248,0.28),transparent_70%)]", glow: "shadow-[0_8px_48px_-12px_rgba(129,140,248,0.42)]", dot: "bg-indigo-400" };
    case "RECOMMENDATION":
      return { bloom: "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(45,212,191,0.24),transparent_70%)]", glow: "shadow-[0_8px_44px_-14px_rgba(45,212,191,0.4)]", dot: "bg-teal-400" };
    case "APPROVAL_REQUIRED":
      return { bloom: "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(251,191,36,0.30),transparent_70%)]", glow: "shadow-[0_8px_50px_-12px_rgba(251,191,36,0.45)]", dot: "bg-amber-400" };
    case "SUCCESS":
      return { bloom: "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(52,211,153,0.26),transparent_70%)]", glow: "shadow-[0_8px_48px_-12px_rgba(52,211,153,0.42)]", dot: "bg-emerald-400" };
    case "BLOCKED":
      return { bloom: "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(245,158,11,0.22),transparent_70%)]", glow: "shadow-[0_8px_40px_-14px_rgba(245,158,11,0.36)]", dot: "bg-amber-500" };
    case "FAILURE":
      return { bloom: "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(251,113,133,0.24),transparent_70%)]", glow: "shadow-[0_8px_44px_-14px_rgba(251,113,133,0.4)]", dot: "bg-rose-400" };
    case "QUIET":
      return { bloom: "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(148,163,184,0.12),transparent_70%)]", glow: "shadow-[0_8px_36px_-16px_rgba(15,23,42,0.3)]", dot: "bg-slate-400" };
    case "IDLE":
    default:
      return { bloom: "bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(186,200,224,0.18),transparent_70%)]", glow: "shadow-[0_8px_40px_-14px_rgba(15,23,42,0.22)]", dot: "bg-slate-400" };
  }
}
