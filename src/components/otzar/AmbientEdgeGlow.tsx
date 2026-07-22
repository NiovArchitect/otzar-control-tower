// FILE: AmbientEdgeGlow.tsx
// PURPOSE: Otzar ambient edge — year-3000 enterprise presence with Atari
//          edge DNA (precise corner geometry + thin spectral rim).
//          Black Mirror calm · Siri-like activation · not RGB gaming.
// CONNECTS TO: presence store, EmployeeLayout, Layout, index.css.

import {
  humanPresenceState,
  usePresenceState,
} from "@/lib/stores/presence";
import type { OtzarPresenceState } from "@/lib/stores/presence";

interface EdgeVisual {
  strip: string;
  aura: string;
  frame: string;
}

const EDGE_VISUALS: Record<OtzarPresenceState, EdgeVisual> = {
  IDLE: {
    strip: "opacity-40 bg-gradient-to-r from-transparent via-[#a855f7]/40 to-transparent",
    aura: "opacity-22 bg-[#B124E8]/15",
    frame: "shadow-[inset_0_0_0_1px_rgba(229,231,236,0.16)]",
  },
  LISTENING: {
    strip:
      "opacity-95 bg-gradient-to-r from-[#405DE6]/0 via-[#405DE6]/85 to-[#405DE6]/0 motion-safe:animate-edge-pulse",
    aura: "opacity-65 bg-[#405DE6]/30 motion-safe:animate-edge-breathe",
    frame:
      "shadow-[inset_0_0_0_1.5px_rgba(64,93,230,0.5),inset_0_0_48px_-12px_rgba(64,93,230,0.32)] motion-safe:animate-edge-breathe",
  },
  THINKING: {
    strip:
      "opacity-85 bg-gradient-to-r from-[#B124E8]/0 via-[#B124E8]/80 to-[#B124E8]/0 motion-safe:animate-edge-breathe",
    aura: "opacity-50 bg-[#B124E8]/28 motion-safe:animate-edge-breathe",
    frame:
      "shadow-[inset_0_0_0_1.5px_rgba(177,36,232,0.45),inset_0_0_48px_-14px_rgba(177,36,232,0.3)] motion-safe:animate-edge-breathe",
  },
  RECOMMENDATION: {
    strip:
      "opacity-70 bg-gradient-to-r from-[#a855f7]/0 via-[#a855f7]/70 to-[#a855f7]/0",
    aura: "opacity-38 bg-[#a855f7]/24",
    frame:
      "shadow-[inset_0_0_0_1.5px_rgba(168,85,247,0.4),inset_0_0_44px_-14px_rgba(168,85,247,0.28)]",
  },
  APPROVAL_REQUIRED: {
    strip:
      "opacity-95 bg-gradient-to-r from-[#F77737]/0 via-[#F77737]/85 to-[#F77737]/0 motion-safe:animate-edge-pulse",
    aura: "opacity-55 bg-[#F77737]/28 motion-safe:animate-edge-pulse",
    frame:
      "shadow-[inset_0_0_0_2px_rgba(247,119,55,0.5),inset_0_0_52px_-12px_rgba(247,119,55,0.34)] motion-safe:animate-edge-pulse",
  },
  SUCCESS: {
    strip:
      "opacity-85 bg-gradient-to-r from-emerald-400/0 via-emerald-400/75 to-emerald-400/0 motion-safe:animate-edge-shimmer",
    aura: "opacity-45 bg-emerald-400/28",
    frame:
      "shadow-[inset_0_0_0_1.5px_rgba(52,211,153,0.4),inset_0_0_48px_-12px_rgba(52,211,153,0.3)]",
  },
  BLOCKED: {
    strip:
      "opacity-55 bg-gradient-to-r from-amber-500/0 via-amber-500/55 to-amber-500/0",
    aura: "opacity-30 bg-amber-500/22",
    frame:
      "shadow-[inset_0_0_0_1.5px_rgba(249,115,22,0.4),inset_0_0_44px_-14px_rgba(249,115,22,0.26)]",
  },
  QUIET: {
    strip: "opacity-20 bg-gradient-to-r from-transparent via-muted-foreground/35 to-transparent",
    aura: "opacity-0",
    frame: "shadow-[inset_0_0_0_1px_rgba(148,163,184,0.1)]",
  },
  FAILURE: {
    strip:
      "opacity-75 bg-gradient-to-r from-rose-400/0 via-rose-400/65 to-rose-400/0",
    aura: "opacity-40 bg-rose-400/28",
    frame:
      "shadow-[inset_0_0_0_2px_rgba(244,63,94,0.42),inset_0_0_48px_-12px_rgba(244,63,94,0.3)]",
  },
};

const SPECTRAL_ACTIVE = new Set<OtzarPresenceState>([
  "LISTENING",
  "THINKING",
  "APPROVAL_REQUIRED",
  "SUCCESS",
  "RECOMMENDATION",
]);

export function AmbientEdgeGlow(): JSX.Element {
  const state = usePresenceState();
  const human = humanPresenceState(state);
  const visual = EDGE_VISUALS[state];
  const spectral = SPECTRAL_ACTIVE.has(state);

  return (
    <div
      aria-hidden
      data-testid="ambient-edge-glow"
      data-presence={state}
      data-presence-human={human}
      data-spectral={spectral ? "true" : "false"}
      className="pointer-events-none fixed inset-0 z-[55]"
    >
      {/* Full-perimeter behavioral border */}
      <div
        className={`absolute inset-0 transition-[box-shadow] duration-1000 ${visual.frame}`}
      />

      {/* Always-on idle spectral rim (restrained); stronger when active */}
      <div
        className={`otzar-ambient-rim absolute inset-0 ${
          spectral
            ? "opacity-85"
            : "otzar-ambient-rim-idle"
        }`}
        data-testid="otzar-ambient-rim"
        data-rim-state={spectral ? state.toLowerCase() : "idle"}
      />

      {/* Top edge halo — fine luminous scan line */}
      <div
        className={`absolute inset-x-0 top-0 h-[2px] transition-opacity duration-700 ${visual.strip}`}
      />
      {/* Bottom micro-line — Atari dual-edge precision */}
      <div
        className={`absolute inset-x-[12%] bottom-0 h-px transition-opacity duration-700 ${visual.strip} opacity-40`}
      />

      {/* Atari shell corners — geometric DNA */}
      <div className="otzar-atari-shell-corners" data-testid="otzar-atari-corners">
        <span className="c-tl" />
        <span className="c-tr" />
        <span className="c-bl" />
        <span className="c-br" />
      </div>

      {/* Corner aura near Talk (bottom-right) */}
      <div
        className={`absolute -bottom-16 -right-16 h-56 w-56 rounded-full blur-3xl transition-opacity duration-700 ${visual.aura}`}
      />
    </div>
  );
}
