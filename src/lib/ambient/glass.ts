// FILE: glass.ts
// PURPOSE: Behance brand material language — purple void, silver bevels,
//          soft designer curves, enterprise glass depth that pops sleek.
//          Palette: #B124E8 · #a855f7 · #405DE6 · #1e1b4b · #E5E7EC · #F77737
// CONNECTS TO: EmployeeLayout, AmbientNav, Login, Layout, Card, index.css.

import type { PresenceIntensity } from "@/lib/stores/presence";

/** Primary frosted surface — brand-tinted dark glass, designer radius. */
export const GLASS_SURFACE =
  "otzar-glass-card otzar-edge-trace rounded-[1.35rem]";

/** Quieter chip for inline state — soft pill curve. */
export const GLASS_CHIP =
  "rounded-full border border-white/12 bg-white/[0.06] supports-[backdrop-filter]:bg-white/[0.05] backdrop-blur-xl ring-1 ring-[#B124E8]/15 shadow-[0_1px_0_0_rgba(229,231,236,0.12)_inset]";

/**
 * Living ambient field — Behance void indigo → near-black.
 * Brand purple depth; not flat SaaS white or generic cyan.
 */
export const AMBIENT_FIELD =
  "otzar-dark-field bg-[radial-gradient(125%_95%_at_50%_-12%,#1e1b4b_0%,#140f28_36%,#0a0612_70%,#06040c_100%)]";

export const AMBIENT_AURORA = "pointer-events-none absolute inset-0 overflow-hidden";

/** Hero primary CTA — brand purple glass, soft curve. */
export const GLASS_CTA =
  "rounded-[1.25rem] border border-white/18 bg-white/10 supports-[backdrop-filter]:bg-white/[0.08] backdrop-blur-2xl ring-1 ring-[#B124E8]/25 shadow-[0_16px_44px_-16px_rgba(177,36,232,0.35),0_1px_0_0_rgba(229,231,236,0.14)_inset] transition-[box-shadow,transform,filter] duration-200 hover:shadow-[0_20px_52px_-14px_rgba(168,85,247,0.4)] active:scale-[0.99]";

/** Slim chrome (header / nav rail) — void glass + purple whisper. */
export const GLASS_CHROME =
  "border-white/10 bg-[#0a0612]/75 supports-[backdrop-filter]:bg-[#0a0612]/58 backdrop-blur-2xl backdrop-saturate-160 shadow-[0_1px_0_0_rgba(229,231,236,0.08)_inset]";

/** Active nav pill — brand purple gradient, soft curve. */
export const GLASS_NAV_ACTIVE =
  "bg-gradient-to-b from-[#B124E8]/30 to-[#405DE6]/12 text-[#E5E7EC] shadow-[0_6px_22px_-6px_rgba(177,36,232,0.45)] ring-1 ring-[#B124E8]/40";

/** Hero stage + brand corner frame, generous curve. */
export const GLASS_STAGE = "otzar-stage otzar-atari-frame relative overflow-hidden rounded-[1.75rem]";

export function panelAccent(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "border-l-[3px] border-l-[#F77737]/85";
    case "critical":
      return "border-l-[3px] border-l-rose-400/85";
    case "working":
      return "border-l-[3px] border-l-[#405DE6]/75";
    case "ambient":
    default:
      return "";
  }
}

export function intensityDot(intensity: PresenceIntensity): string {
  switch (intensity) {
    case "attention":
      return "bg-[#F77737] shadow-[0_0_8px_rgba(247,119,55,0.55)]";
    case "critical":
      return "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.55)]";
    case "working":
      return "bg-[#405DE6] shadow-[0_0_8px_rgba(64,93,230,0.5)]";
    case "ambient":
    default:
      return "bg-[#a855f7]/85";
  }
}
