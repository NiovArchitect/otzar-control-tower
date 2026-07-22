// FILE: glass.ts
// PURPOSE: Behance brand material language — complete product UI overhaul.
//          Bright semi-gradient field, floating white cards, soft 3D purple CTAs.
//          Palette: #B124E8 · #a855f7 · #405DE6 · #1e1b4b · #E5E7EC · #FFFFFF
// CONNECTS TO: EmployeeLayout, Layout, AmbientNav, Login, Card, index.css.

import type { PresenceIntensity } from "@/lib/stores/presence";

/** Floating white surface — designer radius + soft light shadow. */
export const GLASS_SURFACE =
  "otzar-glass-card otzar-edge-trace rounded-[1.5rem]";

/** Quiet chip / pill on bright field. */
export const GLASS_CHIP =
  "rounded-full border border-[#1e1b4b]/08 bg-white/90 backdrop-blur-xl shadow-[0_4px_14px_-6px_rgba(30,27,75,0.12)] ring-1 ring-[#B124E8]/10";

/**
 * Living ambient field — Behance semi-gradient (YC-visible brand experience).
 * Silver → soft lavender → pearl with brand purple washes. NOT black void.
 */
export const AMBIENT_FIELD =
  "otzar-brand-field otzar-dark-field otzar-semi-gradient-field";

export const AMBIENT_AURORA = "pointer-events-none absolute inset-0 overflow-hidden";

/** Atmospheric layers for shells (ribbons + soft aurora). */
export const AMBIENT_ATMOSPHERE =
  "pointer-events-none absolute inset-0 overflow-hidden";

/** Hero / primary CTA — floating 3D brand purple (use with otzar-cta-fill). */
export const GLASS_CTA =
  "otzar-cta-fill inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-[transform,box-shadow,filter] duration-200";

/** Slim chrome (header / nav rail) — frosted white over semi-gradient. */
export const GLASS_CHROME =
  "border-[#1e1b4b]/08 bg-white/75 supports-[backdrop-filter]:bg-white/65 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_8px_24px_-16px_rgba(30,27,75,0.1)]";

/** Active nav pill — soft purple lift on bright rail. */
export const GLASS_NAV_ACTIVE =
  "bg-gradient-to-b from-[#B124E8]/14 to-[#a855f7]/08 text-[#1e1b4b] shadow-[0_8px_20px_-8px_rgba(177,36,232,0.35)] ring-1 ring-[#B124E8]/25";

/** Hero stage — white floating panel, generous curve. */
export const GLASS_STAGE =
  "otzar-stage otzar-atari-frame relative overflow-hidden rounded-[1.75rem]";

export function panelAccent(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "border-l-[3px] border-l-[#F77737]";
    case "critical":
      return "border-l-[3px] border-l-rose-500";
    case "working":
      return "border-l-[3px] border-l-[#405DE6]";
    case "ambient":
    default:
      return "";
  }
}

export function intensityDot(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "bg-[#F77737] shadow-[0_0_8px_rgba(247,119,55,0.45)]";
    case "critical":
      return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]";
    case "working":
      return "bg-[#405DE6] shadow-[0_0_8px_rgba(64,93,230,0.4)]";
    case "ambient":
    default:
      return "bg-[#a855f7]";
  }
}
