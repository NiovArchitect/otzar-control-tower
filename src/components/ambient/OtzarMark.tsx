// FILE: OtzarMark.tsx
// PURPOSE: Phase-F living presence orb — dimensional intelligence signal,
//          not a flat brand logo. Soft core + bloom; glow only when active.
// CONNECTS TO: Login, EmployeeLayout, AmbientWorkSurface, AdminSidebar.

export function OtzarMark({
  size = "md",
  active = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  /** When false: quiet idle orb (no pulse). */
  active?: boolean;
  className?: string;
}): JSX.Element {
  const dim =
    size === "xl"
      ? "h-16 w-16"
      : size === "lg"
        ? "h-12 w-12"
        : size === "sm"
          ? "h-5 w-5"
          : "h-8 w-8";
  const core =
    size === "xl"
      ? "h-5 w-5"
      : size === "lg"
        ? "h-4 w-4"
        : size === "sm"
          ? "h-1.5 w-1.5"
          : "h-2.5 w-2.5";

  return (
    <span
      aria-hidden
      data-testid="otzar-mark"
      className={`relative inline-flex shrink-0 items-center justify-center ${dim} ${className}`}
    >
      {/* Outer atmosphere bloom */}
      <span
        className={`absolute inset-[-28%] rounded-full bg-[radial-gradient(circle_at_38%_32%,rgba(167,139,250,0.45),rgba(56,189,248,0.18)_48%,transparent_72%)] ${
          active
            ? "motion-safe:animate-[otzar-breathe_4.5s_ease-in-out_infinite]"
            : "opacity-55"
        }`}
      />
      {/* Glass sphere rim */}
      <span className="absolute inset-[12%] rounded-full border border-white/80 bg-gradient-to-br from-white/70 via-white/35 to-indigo-100/40 shadow-[0_8px_28px_-10px_rgba(67,56,202,0.45),0_1px_0_0_rgba(255,255,255,0.8)_inset] backdrop-blur-md" />
      {/* Specular highlight */}
      <span className="absolute left-[22%] top-[18%] h-[28%] w-[34%] rounded-full bg-white/55 blur-[1px]" />
      {/* Living core */}
      <span
        className={`relative rounded-full bg-gradient-to-br from-sky-300 via-indigo-400 to-violet-500 ${core} ${
          active
            ? "motion-safe:animate-[otzar-orb-pulse_3.2s_ease-in-out_infinite]"
            : "shadow-[0_0_10px_rgba(129,140,248,0.35)]"
        }`}
      />
    </span>
  );
}
