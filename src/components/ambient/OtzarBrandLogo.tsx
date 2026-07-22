// FILE: OtzarBrandLogo.tsx
// PURPOSE: Official Otzar brand mark — not a generic AI orb. Sourced from
//          otzar.ai (https://www.otzar.ai/) and brand identity on Behance
//          (https://www.behance.net/gallery/252799665/OTZAR). Uses the
//          approved SVG mark with optional presence ring for living state.
// CONNECTS TO: Login, AdminSidebar, EmployeeLayout, AmbientNav, OtzarMark.

import type { OtzarPresenceState } from "@/lib/stores/presence";

const SIZE: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const RING: Partial<Record<OtzarPresenceState, string>> = {
  LISTENING:
    "ring-2 ring-sky-400/50 shadow-[0_0_20px_-2px_rgba(56,189,248,0.45)]",
  THINKING:
    "ring-2 ring-indigo-400/45 shadow-[0_0_18px_-2px_rgba(129,140,248,0.4)]",
  APPROVAL_REQUIRED:
    "ring-2 ring-amber-400/50 shadow-[0_0_18px_-2px_rgba(251,191,36,0.35)]",
  SUCCESS:
    "ring-2 ring-emerald-400/40 shadow-[0_0_16px_-2px_rgba(52,211,153,0.35)]",
  BLOCKED:
    "ring-2 ring-amber-500/40 shadow-[0_0_14px_-2px_rgba(245,158,11,0.3)]",
  FAILURE: "ring-2 ring-rose-400/35",
};

export function OtzarBrandLogo({
  size = "md",
  presence = "IDLE",
  className = "",
  tone = "ink",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  /** When set, subtle presence ring (listening/thinking/etc.). */
  presence?: OtzarPresenceState;
  className?: string;
  /** ink on light surfaces; silver on dark/void. */
  tone?: "ink" | "silver" | "brand";
}): JSX.Element {
  const ring = RING[presence] ?? "";
  const color =
    tone === "silver"
      ? "text-[#E5E7EC]"
      : tone === "brand"
        ? "text-indigo-500"
        : "text-slate-900";

  return (
    <span
      data-testid="otzar-brand-logo"
      data-presence={presence}
      data-brand-source="otzar.ai"
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${SIZE[size]} ${color} ${ring} ${className}`}
      aria-hidden
    >
      {/* Fine luminous edge — Atari DNA as micro-geometry, not nostalgia */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full border border-white/50 shadow-[0_0_0_1px_rgba(15,23,42,0.06)_inset]"
        aria-hidden
      />
      <img
        src="/brand/otzar-logo.svg"
        alt=""
        width={46}
        height={46}
        className="relative h-[82%] w-[82%] object-contain"
        draggable={false}
      />
    </span>
  );
}

/** Wordmark + logo for chrome headers. */
export function OtzarBrandLockup({
  size = "md",
  subtitle,
  presence = "IDLE",
}: {
  size?: "sm" | "md" | "lg";
  subtitle?: string;
  presence?: OtzarPresenceState;
}): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2.5" data-testid="otzar-brand-lockup">
      <OtzarBrandLogo size={size} presence={presence} tone="brand" />
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-semibold tracking-tight text-slate-900">
          Otzar
        </span>
        {subtitle !== undefined ? (
          <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-indigo-500/75">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
