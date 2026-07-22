// FILE: glass.ts
// PURPOSE: YC / enterprise product materials — premium light shell.
//          Pearl field, white cards, solid brand purple CTAs, brand-dark ink.
//          Palette: #B124E8 · #a855f7 · #405DE6 · #1e1b4b · #FFFFFF
// CONNECTS TO: EmployeeLayout, Layout, AmbientNav, Login, Card, index.css.

import type { PresenceIntensity } from "@/lib/stores/presence";

/** White enterprise card — soft elevation. */
export const GLASS_SURFACE =
  "otzar-glass-card otzar-edge-trace rounded-2xl";

/** Quiet chip on light field. */
export const GLASS_CHIP =
  "rounded-full border border-[#1e1b4b]/08 bg-white shadow-[0_2px_8px_-2px_rgba(30,27,75,0.08)]";

/**
 * Premium light enterprise field — pearl white + soft brand atmosphere.
 * Investor-readable. Not dark void. Not flat gray sludge.
 */
export const AMBIENT_FIELD =
  "otzar-dark-field otzar-brand-field otzar-enterprise-field";

export const AMBIENT_AURORA = "pointer-events-none absolute inset-0 overflow-hidden";

/** Primary CTA surface helper (pair with otzar-cta-fill). */
export const GLASS_CTA =
  "otzar-cta-fill inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white";

/** Header / nav chrome — frosted white. */
export const GLASS_CHROME =
  "border-[#1e1b4b]/08 bg-white/85 supports-[backdrop-filter]:bg-white/75 backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.9)_inset,0_4px_16px_-8px_rgba(30,27,75,0.08)]";

/** Active nav — quiet ink wash (not loud purple). */
export const GLASS_NAV_ACTIVE =
  "bg-[#1e1b4b]/06 text-[#1e1b4b] ring-1 ring-[#1e1b4b]/08";

/** Stage panel. */
export const GLASS_STAGE =
  "otzar-stage relative overflow-hidden rounded-2xl";

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
      return "bg-[#F77737]";
    case "critical":
      return "bg-rose-500";
    case "working":
      return "bg-[#405DE6]";
    case "ambient":
    default:
      return "bg-[#a855f7]";
  }
}
