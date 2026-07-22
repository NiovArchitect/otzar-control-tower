// FILE: glass.ts
// PURPOSE: Phase-F ambient glass material language — ONE shared surface
//          system for shell, work surfaces, panels, login, Control Tower.
//          Year-3000 enterprise depth · Atari edge precision · never flat SaaS.
// CONNECTS TO: EmployeeLayout, AmbientNav, GlassPanel, Login, Layout, Card.

import type { PresenceIntensity } from "@/lib/stores/presence";

/** Primary frosted surface — translucent pearl with dimensional lift. */
export const GLASS_SURFACE =
  "otzar-glass-card otzar-edge-trace rounded-2xl";

/** Quieter chip for inline state (lane / status / count). */
export const GLASS_CHIP =
  "rounded-full border border-white/75 bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-xl ring-1 ring-slate-900/[0.03] shadow-[0_1px_0_0_rgba(255,255,255,0.55)_inset]";

/**
 * Living ambient field — cool multi-stop atmosphere behind every shell.
 * Light-first enterprise readability; cinematic depth without darkness.
 */
export const AMBIENT_FIELD =
  "bg-[radial-gradient(140%_90%_at_50%_-18%,#ede9fe_0%,#e0f2fe_22%,#f0f4ff_48%,#e8eef8_72%,#f8fafc_100%)]";

/** Secondary atmospheric bloom wrapper. */
export const AMBIENT_AURORA = "pointer-events-none absolute inset-0 overflow-hidden";

/** Hero primary CTA. */
export const GLASS_CTA =
  "rounded-2xl border border-white/70 bg-white/85 supports-[backdrop-filter]:bg-white/65 backdrop-blur-2xl ring-1 ring-slate-900/[0.05] shadow-[0_16px_44px_-16px_rgba(15,23,42,0.32),0_1px_0_0_rgba(255,255,255,0.75)_inset] transition-[box-shadow,transform,filter] duration-200 hover:shadow-[0_20px_52px_-14px_rgba(79,70,229,0.28)] active:scale-[0.99]";

/** Slim chrome (header / nav rail) — glass + fine edge. */
export const GLASS_CHROME =
  "border-white/60 bg-white/50 supports-[backdrop-filter]:bg-white/40 backdrop-blur-2xl backdrop-saturate-160 shadow-[0_1px_0_0_rgba(255,255,255,0.55)_inset]";

/** Active nav pill — indigo presence, not harsh solid. */
export const GLASS_NAV_ACTIVE =
  "bg-gradient-to-b from-white/95 to-indigo-50/90 text-indigo-950 shadow-[0_6px_20px_-6px_rgba(79,70,229,0.35)] ring-1 ring-indigo-500/20";

/** Hero stage (Today, Login) — elevated presence plane + Atari frame hooks. */
export const GLASS_STAGE = "otzar-stage otzar-atari-frame relative overflow-hidden";

// Per-intensity left accent for a glass panel (priority visible, not flat).
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
