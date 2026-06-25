// FILE: glass.ts
// PURPOSE: [OTZAR-LIVE-6] The ONE ambient glass material language — shared by the
//          shell, the ambient work surface, panels, and login so the look is
//          coherent, not scattered per-component. Apple-style translucent frosted
//          glass (soft white/silver, backdrop blur, gentle depth), a luminous
//          field behind the whole employee shell, and per-intensity accents that
//          obey the presence-intensity noise budget (idle barely there, attention
//          forward). Pure class strings — no component, no state.
// CONNECTS TO: src/lib/stores/presence.ts (PresenceIntensity), the ambient
//          components, tests/unit/glass.test.ts.

import type { PresenceIntensity } from "@/lib/stores/presence";

// The frosted-glass surface — translucent white/silver, blurred, soft lift.
export const GLASS_SURFACE =
  "rounded-2xl border border-white/60 bg-white/70 supports-[backdrop-filter]:bg-white/50 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-black/[0.04] shadow-[0_10px_44px_-18px_rgba(15,23,42,0.22)]";

// A quieter glass chip (smaller radius, lighter) for inline state.
export const GLASS_CHIP =
  "rounded-full border border-white/60 bg-white/60 supports-[backdrop-filter]:bg-white/45 backdrop-blur-xl ring-1 ring-black/[0.03]";

// The luminous silver field behind the whole employee shell — calm and alive,
// NOT flat white; readable for dark text; reads over light or dark workspaces.
export const AMBIENT_FIELD =
  "bg-[radial-gradient(130%_90%_at_50%_-20%,#eef2fb_0%,#f6f8fc_42%,#eef1f7_100%)]";

// Per-intensity left accent for a glass panel (priority visible, not flat).
// Attention/critical come forward; working is a soft hint; ambient recedes.
export function panelAccent(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "border-l-2 border-l-amber-400/70";
    case "critical":
      return "border-l-2 border-l-rose-400/70";
    case "working":
      return "border-l-2 border-l-sky-400/55";
    case "ambient":
    default:
      return "";
  }
}

// Small state dot color per intensity.
export function intensityDot(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "bg-amber-400";
    case "critical":
      return "bg-rose-400";
    case "working":
      return "bg-sky-400";
    case "ambient":
    default:
      return "bg-slate-300";
  }
}
