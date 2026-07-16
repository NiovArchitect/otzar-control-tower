// FILE: OtzarMark.tsx
// PURPOSE: Brand presence mark — a calm living orb glyph, not a SaaS logo
//          wordmark alone. Speaks Design Law §2 (edge presence) and PRD-01
//          "living AI presence". Glow only when `active` (state-backed).
// CONNECTS TO: Login, EmployeeLayout header, optional admin chrome.

export function OtzarMark({
  size = "md",
  active = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  /** When false, static idle mark (no motion) — still present. */
  active?: boolean;
  className?: string;
}): JSX.Element {
  const dim =
    size === "lg" ? "h-10 w-10" : size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const core =
    size === "lg" ? "h-3 w-3" : size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <span
      aria-hidden
      data-testid="otzar-mark"
      className={`relative inline-flex shrink-0 items-center justify-center ${dim} ${className}`}
    >
      {/* Soft bloom — atmosphere, not neon. */}
      <span
        className={`absolute inset-0 rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(129,140,248,0.45),rgba(56,189,248,0.18)_55%,transparent_72%)] ${
          active ? "motion-safe:animate-[otzar-breathe_4.5s_ease-in-out_infinite]" : "opacity-80"
        }`}
      />
      <span className="absolute inset-[18%] rounded-full border border-white/70 bg-white/50 shadow-[0_4px_16px_-6px_rgba(15,23,42,0.25)] backdrop-blur-md" />
      <span
        className={`relative rounded-full bg-gradient-to-br from-sky-400 via-indigo-400 to-teal-400 ${core} ${
          active ? "motion-safe:animate-pulse" : ""
        }`}
      />
    </span>
  );
}
