// FILE: OtzarBrandLogo.tsx
// PURPOSE: Official Otzar mark — clean enterprise presentation for YC light UI.
// CONNECTS TO: Login, AdminSidebar, EmployeeLayout, AmbientNav.

import type { OtzarPresenceState } from "@/lib/stores/presence";

const SIZE: Record<"sm" | "md" | "lg" | "xl" | "hero", string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
  xl: "h-14 w-14",
  hero: "h-16 w-16 sm:h-20 sm:w-20",
};

const RING: Partial<Record<OtzarPresenceState, string>> = {
  LISTENING: "otzar-logo-presence-listening",
  THINKING: "otzar-logo-presence-thinking",
  APPROVAL_REQUIRED: "otzar-logo-presence-approval",
  SUCCESS: "otzar-logo-presence-success",
  BLOCKED: "otzar-logo-presence-blocked",
  FAILURE: "otzar-logo-presence-failure",
};

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
  tone?: "ink" | "silver" | "brand";
  polish?: boolean;
}): JSX.Element {
  const ring = RING[presence] ?? "";
  const isHero = size === "hero" || size === "xl";
  const useRaster = tone === "brand";
  const mono =
    tone === "silver"
      ? "text-[#1e1b4b]"
      : tone === "ink"
        ? "text-[#1e1b4b]"
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
            isHero ? "inset-[-20%]" : "inset-[-16%]"
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
              isHero ? "h-[82%] w-[82%]" : "h-[84%] w-[84%]"
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
            className="otzar-logo-mark relative z-[1] h-[84%] w-[84%] object-contain"
            draggable={false}
          />
        )}
      </span>
    </span>
  );
}

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
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B124E8]">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
