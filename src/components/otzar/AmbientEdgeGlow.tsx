// FILE: AmbientEdgeGlow.tsx
// PURPOSE: Otzar ambient edge — year-3000 enterprise presence with subtle
//          retro-future perimeter geometry (Atari DNA as edge precision,
//          not arcade). Spectral rim travels calmly (Siri-like spirit,
//          original to Otzar). Not RGB gaming, not cyberpunk neon.
//
//            IDLE            barely-there neutral edge
//            LISTENING       spectral edge awakens (voice is live)
//            THINKING        slow circulation (working, not demanding)
//            RECOMMENDATION  gentle teal presence
//            APPROVAL_REQUIRED warmer amber pulse (needs a decision)
//            SUCCESS         brief cool resolution
//            BLOCKED         soft amber, static
//            QUIET           muted, nearly off
//            FAILURE         calm rose, static (truthful, not scary)
//
//          pointer-events-none · no layout shift · reduced-motion safe.
// CONNECTS TO: presence store, EmployeeLayout, Layout, index.css.

import {
  humanPresenceState,
  usePresenceState,
} from "@/lib/stores/presence";
import type { OtzarPresenceState } from "@/lib/stores/presence";

interface EdgeVisual {
  /** Top strip gradient + animation classes. */
  strip: string;
  /** Corner aura (radial glow above the orb). */
  aura: string;
  /** [OTZAR-LIVE-6] Full-perimeter behavioral border — a soft inset ring + glow
   *  around the WHOLE work surface whose color IS the current state (idle silver
   *  → listening sky → thinking indigo → replied teal → approval amber → blocked
   *  orange/red). Calibrated by the noise budget: idle/quiet are barely there. */
  frame: string;
}

const EDGE_VISUALS: Record<OtzarPresenceState, EdgeVisual> = {
  IDLE: {
    strip: "opacity-25 bg-gradient-to-r from-transparent via-primary/40 to-transparent",
    aura: "opacity-0",
    frame: "shadow-[inset_0_0_0_1px_rgba(148,163,184,0.10)]",
  },
  LISTENING: {
    strip:
      "opacity-90 bg-gradient-to-r from-sky-400/0 via-sky-400/80 to-sky-400/0 motion-safe:animate-edge-pulse",
    aura: "opacity-60 bg-sky-400/30 motion-safe:animate-edge-breathe",
    frame:
      "shadow-[inset_0_0_0_1.5px_rgba(56,189,248,0.40),inset_0_0_48px_-12px_rgba(56,189,248,0.30)] motion-safe:animate-edge-breathe",
  },
  THINKING: {
    strip:
      "opacity-70 bg-gradient-to-r from-indigo-400/0 via-indigo-400/70 to-indigo-400/0 motion-safe:animate-edge-breathe",
    aura: "opacity-40 bg-indigo-400/25 motion-safe:animate-edge-breathe",
    frame:
      "shadow-[inset_0_0_0_1.5px_rgba(129,140,248,0.36),inset_0_0_48px_-14px_rgba(129,140,248,0.26)] motion-safe:animate-edge-breathe",
  },
  RECOMMENDATION: {
    strip:
      "opacity-60 bg-gradient-to-r from-teal-400/0 via-teal-400/60 to-teal-400/0",
    aura: "opacity-30 bg-teal-400/20",
    frame: "shadow-[inset_0_0_0_1.5px_rgba(45,212,191,0.32),inset_0_0_44px_-14px_rgba(45,212,191,0.24)]",
  },
  APPROVAL_REQUIRED: {
    strip:
      "opacity-90 bg-gradient-to-r from-amber-400/0 via-amber-400/80 to-amber-400/0 motion-safe:animate-edge-pulse",
    aura: "opacity-50 bg-amber-400/25 motion-safe:animate-edge-pulse",
    frame:
      "shadow-[inset_0_0_0_2px_rgba(251,191,36,0.45),inset_0_0_52px_-12px_rgba(251,191,36,0.32)] motion-safe:animate-edge-pulse",
  },
  SUCCESS: {
    strip:
      "opacity-80 bg-gradient-to-r from-emerald-400/0 via-emerald-400/70 to-emerald-400/0 motion-safe:animate-edge-shimmer",
    aura: "opacity-40 bg-emerald-400/25",
    frame: "shadow-[inset_0_0_0_1.5px_rgba(52,211,153,0.36),inset_0_0_48px_-12px_rgba(52,211,153,0.28)]",
  },
  BLOCKED: {
    strip:
      "opacity-50 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0",
    aura: "opacity-25 bg-amber-500/20",
    frame: "shadow-[inset_0_0_0_1.5px_rgba(249,115,22,0.36),inset_0_0_44px_-14px_rgba(249,115,22,0.24)]",
  },
  QUIET: {
    strip: "opacity-15 bg-gradient-to-r from-transparent via-muted-foreground/40 to-transparent",
    aura: "opacity-0",
    frame: "shadow-[inset_0_0_0_1px_rgba(148,163,184,0.08)]",
  },
  FAILURE: {
    strip:
      "opacity-70 bg-gradient-to-r from-rose-400/0 via-rose-400/60 to-rose-400/0",
    aura: "opacity-35 bg-rose-400/25",
    frame: "shadow-[inset_0_0_0_2px_rgba(244,63,94,0.40),inset_0_0_48px_-12px_rgba(244,63,94,0.28)]",
  },
};

/** Spectral travel is only for active presence — never rainbow idle. */
const SPECTRAL_ACTIVE = new Set<OtzarPresenceState>([
  "LISTENING",
  "THINKING",
  "APPROVAL_REQUIRED",
  "SUCCESS",
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
      {/* Full-perimeter behavioral border — thin luminous edge geometry. */}
      <div
        className={`absolute inset-0 transition-[box-shadow] duration-1000 ${visual.frame}`}
      />
      {/* Year-3000 spectral perimeter (restrained cyan→violet→indigo travel). */}
      {spectral ? (
        <div
          className="otzar-ambient-rim absolute inset-0 opacity-80 motion-reduce:opacity-40"
          data-testid="otzar-ambient-rim"
          data-rim-state={state.toLowerCase()}
        />
      ) : null}
      {/* Top edge halo strip — Atari-derived fine luminous outline. */}
      <div
        className={`absolute inset-x-0 top-0 h-[2px] transition-opacity duration-700 ${visual.strip}`}
      />
      {/* Corner aura near Talk presence (bottom-right), heavily blurred. */}
      <div
        className={`absolute -bottom-16 -right-16 h-56 w-56 rounded-full blur-3xl transition-opacity duration-700 ${visual.aura}`}
      />
    </div>
  );
}
