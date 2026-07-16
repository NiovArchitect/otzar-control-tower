// FILE: OtzarMark.tsx
// PURPOSE: Ambient presence orb — living intelligence signal, not a brand
//          logo reconstruction. Soft core + calm bloom. Glow only when active.
// CONNECTS TO: Login, EmployeeLayout, AmbientWorkSurface.

export function OtzarMark({
  size = "md",
  active = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  /** When false: quiet idle orb (no pulse). */
  active?: boolean;
  className?: string;
}): JSX.Element {
  const dim =
    size === "lg" ? "h-11 w-11" : size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const core =
    size === "lg" ? "h-3.5 w-3.5" : size === "sm" ? "h-1.5 w-1.5" : "h-2.5 w-2.5";

  return (
    <span
      aria-hidden
      data-testid="otzar-mark"
      className={`relative inline-flex shrink-0 items-center justify-center ${dim} ${className}`}
    >
      {/* Outer atmosphere */}
      <span
        className={`absolute inset-[-20%] rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(165,180,252,0.35),rgba(125,211,252,0.12)_50%,transparent_72%)] ${
          active
            ? "motion-safe:animate-[otzar-breathe_5s_ease-in-out_infinite]"
            : "opacity-60"
        }`}
      />
      {/* Glass rim */}
      <span className="absolute inset-[14%] rounded-full border border-white/70 bg-white/45 shadow-[0_6px_20px_-8px_rgba(15,23,42,0.28)] backdrop-blur-md" />
      {/* Living core */}
      <span
        className={`relative rounded-full bg-gradient-to-br from-sky-300 via-indigo-400 to-violet-400 shadow-[0_0_12px_rgba(129,140,248,0.45)] ${core} ${
          active ? "motion-safe:animate-pulse" : ""
        }`}
      />
    </span>
  );
}
