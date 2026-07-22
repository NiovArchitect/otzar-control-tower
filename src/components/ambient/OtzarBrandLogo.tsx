// FILE: OtzarBrandLogo.tsx
// PURPOSE: Official Otzar mark — quiet enterprise presentation.
//          No bloom, no heavy disc shadow; mark only.
// CONNECTS TO: Login, AdminSidebar, EmployeeLayout, AmbientNav.

import type { OtzarPresenceState } from "@/lib/stores/presence";

const SIZE: Record<"sm" | "md" | "lg" | "xl" | "hero", string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
  hero: "h-14 w-14 sm:h-16 sm:w-16",
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
  /** Kept for API compat; polish no longer adds heavy effects. */
  polish?: boolean;
}): JSX.Element {
  const useRaster = tone === "brand";
  const mono =
    tone === "silver" || tone === "ink" ? "text-[#1e1b4b]" : "";

  return (
    <span
      data-testid="otzar-brand-logo"
      data-presence={presence}
      data-brand-source="otzar.ai"
      data-polish={polish ? "3d" : "flat"}
      data-size={size}
      className={`otzar-logo-jewel relative inline-flex shrink-0 items-center justify-center ${SIZE[size]} ${mono} ${className}`}
      aria-hidden
    >
      <span className="otzar-logo-sphere otzar-logo-sphere-flat relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
        {useRaster ? (
          <img
            src="/brand/otzar-logo.png"
            alt=""
            width={1080}
            height={1080}
            decoding="async"
            className="otzar-logo-mark relative z-[1] h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <img
            src="/brand/otzar-logo.svg"
            alt=""
            width={128}
            height={128}
            decoding="async"
            className="otzar-logo-mark relative z-[1] h-full w-full object-contain"
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
      <OtzarBrandLogo size={size} presence={presence} tone="brand" polish={false} />
      <span className="min-w-0 leading-tight">
        <span className="otzar-text-luminous block text-sm font-semibold tracking-tight">
          Otzar
        </span>
        {subtitle !== undefined ? (
          <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-[#5c5a78]">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
