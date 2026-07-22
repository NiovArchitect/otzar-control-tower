// FILE: OtzarBrandLogo.tsx
// PURPOSE: Official Otzar brand mark with year-3000 3D/4K polish.
//          Sourced from otzar.ai + Behance — never invent a replacement.
//          Dimensional glass orb, spectral bloom, Atari-precise edge —
//          the logo is the WOAH moment of the product.
// CONNECTS TO: Login, AdminSidebar, EmployeeLayout, AmbientNav, OtzarMark.

import type { OtzarPresenceState } from "@/lib/stores/presence";

const SIZE: Record<"sm" | "md" | "lg" | "xl" | "hero", string> = {
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-[4.5rem] w-[4.5rem]",
  hero: "h-28 w-28 sm:h-32 sm:w-32",
};

const RING: Partial<Record<OtzarPresenceState, string>> = {
  LISTENING: "otzar-logo-presence-listening",
  THINKING: "otzar-logo-presence-thinking",
  APPROVAL_REQUIRED: "otzar-logo-presence-approval",
  SUCCESS: "otzar-logo-presence-success",
  BLOCKED: "otzar-logo-presence-blocked",
  FAILURE: "otzar-logo-presence-failure",
};

/**
 * Official Otzar mark as a dimensional, high-polish presence jewel.
 * Uses 1080² PNG for brand/hero (4K-class sharpness); SVG for monochrome chrome.
 */
export function OtzarBrandLogo({
  size = "md",
  presence = "IDLE",
  className = "",
  tone = "brand",
  polish = true,
}: {
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  presence?: OtzarPresenceState;
  className?: string;
  /** ink/silver = monochrome SVG; brand = full-color 3D polished mark. */
  tone?: "ink" | "silver" | "brand";
  /** When false: compact mark without bloom (dense tables only). */
  polish?: boolean;
}): JSX.Element {
  const ring = RING[presence] ?? "";
  const isHero = size === "hero" || size === "xl";
  const useRaster = tone === "brand";
  const mono =
    tone === "silver"
      ? "text-[#E8EAF0]"
      : tone === "ink"
        ? "text-slate-900"
        : "";

  return (
    <span
      data-testid="otzar-brand-logo"
      data-presence={presence}
      data-brand-source="otzar.ai"
      data-polish={polish ? "3d" : "flat"}
      data-size={size}
      className={`otzar-logo-jewel relative inline-flex shrink-0 items-center justify-center ${SIZE[size]} ${mono} ${ring} ${className}`}
      aria-hidden
    >
      {polish ? (
        <>
          {/* Outer spectral bloom — year-3000 atmosphere */}
          <span
            className={`otzar-logo-bloom pointer-events-none absolute rounded-full ${
              isHero ? "inset-[-42%]" : "inset-[-34%]"
            }`}
            aria-hidden
          />
          {/* Soft ground contact shadow for float depth */}
          <span
            className={`otzar-logo-ground pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] bg-indigo-950/25 blur-md ${
              isHero
                ? "bottom-[-14%] h-[18%] w-[72%]"
                : "bottom-[-10%] h-[16%] w-[68%]"
            }`}
            aria-hidden
          />
        </>
      ) : null}

      {/* Glass sphere body */}
      <span
        className={`otzar-logo-sphere relative flex h-full w-full items-center justify-center overflow-hidden rounded-full ${
          polish ? "otzar-logo-sphere-polish" : "otzar-logo-sphere-flat"
        }`}
      >
        {/* Atari DNA — fine geometric corner ticks on the disc */}
        {polish ? (
          <span className="otzar-logo-atari-ticks pointer-events-none absolute inset-0" aria-hidden />
        ) : null}

        {/* Specular dome highlight */}
        {polish ? (
          <span
            className="otzar-logo-specular pointer-events-none absolute inset-0 rounded-full"
            aria-hidden
          />
        ) : null}

        {useRaster ? (
          <img
            src="/brand/otzar-logo.png"
            alt=""
            width={1080}
            height={1080}
            decoding="async"
            className={`otzar-logo-mark relative z-[1] object-contain ${
              isHero ? "h-[78%] w-[78%]" : "h-[80%] w-[80%]"
            }`}
            draggable={false}
          />
        ) : (
          <img
            src="/brand/otzar-logo.svg"
            alt=""
            width={46}
            height={46}
            className="otzar-logo-mark relative z-[1] h-[78%] w-[78%] object-contain"
            draggable={false}
          />
        )}

        {/* Inner luminous rim */}
        {polish ? (
          <span
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/55"
            aria-hidden
          />
        ) : null}
      </span>

      {/* Spectral travel ring on active presence */}
      {polish && presence !== "IDLE" && presence !== "QUIET" ? (
        <span
          className="otzar-ambient-rim pointer-events-none absolute inset-[-3px] rounded-full opacity-90"
          data-rim-state={presence.toLowerCase()}
          aria-hidden
        />
      ) : null}
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
      <OtzarBrandLogo size={size} presence={presence} tone="brand" polish />
      <span className="min-w-0 leading-tight">
        <span className="otzar-text-luminous block text-sm font-semibold tracking-tight">
          Otzar
        </span>
        {subtitle !== undefined ? (
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-indigo-500/80">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
