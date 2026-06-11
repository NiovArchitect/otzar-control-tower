// FILE: AmbientEdgeGlow.tsx
// PURPOSE: Phase 1251 — Otzar's edge presence made visible. A
//          pointer-events-none halo along the top edge of the
//          viewport plus a soft corner aura above the orb. The tint
//          and motion speak the presence state:
//
//            IDLE            barely-there neutral shimmer
//            LISTENING       cool breathing pulse (voice is live)
//            THINKING        slow breathe (working, not demanding)
//            RECOMMENDATION  gentle teal presence (something useful)
//            APPROVAL_REQUIRED warmer amber pulse (needs a decision)
//            SUCCESS         brief emerald shimmer, then collapses
//            BLOCKED         soft amber, static (needs setup)
//            QUIET           muted, nearly off (meeting/focus)
//            FAILURE         calm rose, static (truthful, not scary)
//
//          It never covers content, never captures clicks, respects
//          prefers-reduced-motion, and disappears entirely when idle
//          enough — Otzar is felt, not watched.
// CONNECTS TO: src/lib/stores/presence.ts, EmployeeLayout,
//          src/index.css (edge-* keyframes),
//          tests/unit/ambient-edge-presence.test.tsx.

import { usePresenceState } from "@/lib/stores/presence";
import type { OtzarPresenceState } from "@/lib/stores/presence";

interface EdgeVisual {
  /** Top strip gradient + animation classes. */
  strip: string;
  /** Corner aura (radial glow above the orb). */
  aura: string;
}

const EDGE_VISUALS: Record<OtzarPresenceState, EdgeVisual> = {
  IDLE: {
    strip: "opacity-25 bg-gradient-to-r from-transparent via-primary/40 to-transparent",
    aura: "opacity-0",
  },
  LISTENING: {
    strip:
      "opacity-90 bg-gradient-to-r from-sky-400/0 via-sky-400/80 to-sky-400/0 motion-safe:animate-edge-pulse",
    aura: "opacity-60 bg-sky-400/30 motion-safe:animate-edge-breathe",
  },
  THINKING: {
    strip:
      "opacity-70 bg-gradient-to-r from-indigo-400/0 via-indigo-400/70 to-indigo-400/0 motion-safe:animate-edge-breathe",
    aura: "opacity-40 bg-indigo-400/25 motion-safe:animate-edge-breathe",
  },
  RECOMMENDATION: {
    strip:
      "opacity-60 bg-gradient-to-r from-teal-400/0 via-teal-400/60 to-teal-400/0",
    aura: "opacity-30 bg-teal-400/20",
  },
  APPROVAL_REQUIRED: {
    strip:
      "opacity-90 bg-gradient-to-r from-amber-400/0 via-amber-400/80 to-amber-400/0 motion-safe:animate-edge-pulse",
    aura: "opacity-50 bg-amber-400/25 motion-safe:animate-edge-pulse",
  },
  SUCCESS: {
    strip:
      "opacity-80 bg-gradient-to-r from-emerald-400/0 via-emerald-400/70 to-emerald-400/0 motion-safe:animate-edge-shimmer",
    aura: "opacity-40 bg-emerald-400/25",
  },
  BLOCKED: {
    strip:
      "opacity-50 bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0",
    aura: "opacity-25 bg-amber-500/20",
  },
  QUIET: {
    strip: "opacity-15 bg-gradient-to-r from-transparent via-muted-foreground/40 to-transparent",
    aura: "opacity-0",
  },
  FAILURE: {
    strip:
      "opacity-70 bg-gradient-to-r from-rose-400/0 via-rose-400/60 to-rose-400/0",
    aura: "opacity-35 bg-rose-400/25",
  },
};

export function AmbientEdgeGlow(): JSX.Element {
  const state = usePresenceState();
  const visual = EDGE_VISUALS[state];
  return (
    <div
      aria-hidden
      data-testid="ambient-edge-glow"
      data-presence={state}
      className="pointer-events-none fixed inset-0 z-[55]"
    >
      {/* Top edge halo strip. */}
      <div
        className={`absolute inset-x-0 top-0 h-[3px] transition-opacity duration-700 ${visual.strip}`}
      />
      {/* Corner aura above the orb (bottom-right), heavily blurred. */}
      <div
        className={`absolute -bottom-16 -right-16 h-56 w-56 rounded-full blur-3xl transition-opacity duration-700 ${visual.aura}`}
      />
    </div>
  );
}
