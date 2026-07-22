// FILE: glass.ts
// PURPOSE: Year-3000 dark ambient material language — Black Mirror depth,
//          Siri-like luminous lines, Atari edge precision, incredible color
//          without RGB gaming. Shared by shells, cards, login, Control Tower.
// CONNECTS TO: EmployeeLayout, AmbientNav, Login, Layout, Card, index.css.

import type { PresenceIntensity } from "@/lib/stores/presence";

/** Primary frosted surface — dark glass over void. */
export const GLASS_SURFACE =
  "otzar-glass-card otzar-edge-trace rounded-2xl";

/** Quieter chip for inline state. */
export const GLASS_CHIP =
  "rounded-full border border-white/15 bg-white/[0.06] supports-[backdrop-filter]:bg-white/[0.05] backdrop-blur-xl ring-1 ring-white/[0.06] shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset]";

/**
 * Living ambient field — dark void with cyan/indigo/violet nebula.
 * Year-3000 enterprise; not flat SaaS white.
 */
export const AMBIENT_FIELD =
  "otzar-dark-field bg-[radial-gradient(120%_90%_at_50%_-10%,#1e1b4b_0%,#0c1222_38%,#070b14_72%,#05070f_100%)]";

export const AMBIENT_AURORA = "pointer-events-none absolute inset-0 overflow-hidden";

/** Hero primary CTA. */
export const GLASS_CTA =
  "rounded-2xl border border-white/20 bg-white/10 supports-[backdrop-filter]:bg-white/[0.08] backdrop-blur-2xl ring-1 ring-indigo-400/20 shadow-[0_16px_44px_-16px_rgba(56,189,248,0.25),0_1px_0_0_rgba(255,255,255,0.12)_inset] transition-[box-shadow,transform,filter] duration-200 hover:shadow-[0_20px_52px_-14px_rgba(129,140,248,0.35)] active:scale-[0.99]";

/** Slim chrome (header / nav rail). */
export const GLASS_CHROME =
  "border-white/10 bg-[#0b1020]/72 supports-[backdrop-filter]:bg-[#0b1020]/55 backdrop-blur-2xl backdrop-saturate-160 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset]";

/** Active nav pill. */
export const GLASS_NAV_ACTIVE =
  "bg-gradient-to-b from-indigo-500/25 to-sky-500/10 text-indigo-50 shadow-[0_6px_20px_-6px_rgba(56,189,248,0.4)] ring-1 ring-indigo-400/35";

/** Hero stage + Atari frame. */
export const GLASS_STAGE = "otzar-stage otzar-atari-frame relative overflow-hidden";

export function panelAccent(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "border-l-[3px] border-l-amber-400/80";
    case "critical":
      return "border-l-[3px] border-l-rose-400/85";
    case "working":
      return "border-l-[3px] border-l-sky-400/70";
    case "ambient":
    default:
      return "";
  }
}

export function intensityDot(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.55)]";
    case "critical":
      return "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.55)]";
    case "working":
      return "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.45)]";
    case "ambient":
    default:
      return "bg-indigo-300/80";
  }
}
