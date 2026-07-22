// FILE: OtzarBrandLogo.tsx
// PURPOSE: Official Otzar brand mark — clean enterprise presentation.
//          Sourced from otzar.ai + Behance — never invent a replacement.
//          Restrained: solid mark, soft purple halo, no disco gradients.
// CONNECTS TO: Login, AdminSidebar, EmployeeLayout, AmbientNav, OtzarMark.

import type { OtzarPresenceState } from "@/lib/stores/presence";

const SIZE: Record<"sm" | "md" | "lg" | "xl" | "hero", string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
  xl: "h-16 w-16",
  hero: "h-20 w-20 sm:h-24 sm:w-24",
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
 * Official Otzar mark — crisp brand asset on a quiet dark disc.
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
  /** ink/silver = monochrome SVG; brand = full-color official mark. */
  tone?: "ink" | "silver" | "brand";
  /** When false: mark only, no halo disc (dense tables). */
  polish?: boolean;
}): JSX.Element {
  const ring = RING[presence] ?? "";
  const isHero = size === "hero" || size === "xl";
  const useRaster = tone === "brand";
  const mono =
    tone === "silver"
      ? "text-[#E5E7EC]"
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
        <span
          className={`otzar-logo-bloom pointer-events-none absolute rounded-full ${
            isHero ? "inset-[-28%]" : "inset-[-22%]"
          }`}
          aria-hidden
        />
      ) : null}

      <span
        className={`otzar-logo-sphere relative flex h-full w-full items-center justify-center overflow-hidden rounded-full ${
          polish ? "otzar-logo-sphere-polish" : "otzar-logo-sphere-flat"
        }`}
      >
        {useRaster ? (
          <img
            src="/brand/otzar-logo.png"
            alt=""
            width={1080}
            height={1080}
            decoding="async"
            className={`otzar-logo-mark relative z-[1] object-contain ${
              isHero ? "h-[86%] w-[86%]" : "h-[88%] w-[88%]"
            }`}
            draggable={false}
          />
        ) : (
          <img
            src="/brand/otzar-logo.svg"
            alt=""
            width={128}
            height={128}
            decoding="async"
            className="otzar-logo-mark relative z-[1] h-[88%] w-[88%] object-contain"
            draggable={false}
          />
        )}
      </span>
    </span>
  );
}

/** Wordmark + logo for chrome headers — solid silver type, not gradient. */
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
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#a855f7]/85">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
