// FILE: glass.ts
// PURPOSE: [OTZAR-LIVE-6 → UI-OVERHAUL] The ONE ambient glass material language
//          shared by shell, work surface, panels, and login. Doctrine sources:
//          Design Law §1–4, PRD-01 ambient presence, OTZAR_AMBIENT_UI_VISUAL_SYSTEM,
//          quality rubric axes 1/12/13 (presence, responsive, hierarchy).
//          Rule zero: no glow without a backing state. Calm depth > SaaS chrome.
// CONNECTS TO: presence.ts, ambient components, tests that lock surface tokens.

import type { PresenceIntensity } from "@/lib/stores/presence";

/** Primary frosted surface — translucent pearl, soft lift, premium depth. */
export const GLASS_SURFACE =
  "rounded-2xl border border-white/70 bg-white/75 supports-[backdrop-filter]:bg-white/55 backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-slate-900/[0.04] shadow-[0_12px_48px_-20px_rgba(15,23,42,0.28),0_1px_0_0_rgba(255,255,255,0.65)_inset]";

/** Quieter chip for inline state (lane / status / count). */
export const GLASS_CHIP =
  "rounded-full border border-white/70 bg-white/65 supports-[backdrop-filter]:bg-white/50 backdrop-blur-xl ring-1 ring-slate-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.5)_inset]";

/**
 * Luminous ambient field behind employee + admin shells.
 * Multi-stop radial: pearl cool top, soft indigo/teal atmosphere, never flat
 * dashboard gray. Readable for dark text; light-first (visual system honest bound).
 */
export const AMBIENT_FIELD =
  "bg-[radial-gradient(120%_80%_at_50%_-15%,#f0f4ff_0%,#eef6fb_28%,#f5f7fb_55%,#e8eef8_100%)]";

/** Secondary atmospheric bloom for login / hero stages (pointer-safe layer). */
export const AMBIENT_AURORA =
  "pointer-events-none absolute inset-0 overflow-hidden";

/** Hero primary CTA — same glass language, slightly denser for one action. */
export const GLASS_CTA =
  "rounded-2xl border border-white/70 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] shadow-[0_14px_40px_-18px_rgba(15,23,42,0.3),0_1px_0_0_rgba(255,255,255,0.7)_inset] transition-[box-shadow,transform,color] duration-200 hover:shadow-[0_18px_48px_-16px_rgba(15,23,42,0.34)] active:scale-[0.99]";

/** Slim chrome (header / nav rail) floating over the field. */
export const GLASS_CHROME =
  "border-white/60 bg-white/50 supports-[backdrop-filter]:bg-white/40 backdrop-blur-2xl backdrop-saturate-150";

/** Active nav pill — attention without neon. */
export const GLASS_NAV_ACTIVE =
  "bg-white/80 text-slate-900 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.05]";

// Per-intensity left accent for a glass panel (priority visible, not flat).
// Attention/critical come forward; working is a soft hint; ambient recedes.
export function panelAccent(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "border-l-2 border-l-amber-400/75";
    case "critical":
      return "border-l-2 border-l-rose-400/75";
    case "working":
      return "border-l-2 border-l-sky-400/60";
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
