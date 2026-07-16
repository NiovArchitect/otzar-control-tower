// FILE: OtzarMark.tsx
// PURPOSE: Brand presence mark — Otzar symbol energy (violet luminous core,
//          restrained glow, dark-depth contrast on light ambient shell).
//          Speaks Design Law §2 (edge presence) + enterprise logo character:
//          confident, premium, non-gaming. Glow only when `active`.
// CONNECTS TO: Login, EmployeeLayout header, AmbientWorkSurface hero.

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

  return (
    <span
      aria-hidden
      data-testid="otzar-mark"
      className={`relative inline-flex shrink-0 items-center justify-center ${dim} ${className}`}
    >
      {/* Soft violet bloom — logo energy, never neon flood. */}
      <span
        className={`absolute inset-[-12%] rounded-full bg-[radial-gradient(circle_at_40%_35%,rgba(139,92,246,0.38),rgba(91,33,182,0.12)_52%,transparent_72%)] ${
          active
            ? "motion-safe:animate-[otzar-breathe_4.5s_ease-in-out_infinite]"
            : "opacity-70"
        }`}
      />
      {/* Circular mark — dark depth core with luminous rim. */}
      <svg
        viewBox="0 0 48 48"
        className="relative h-full w-full drop-shadow-[0_4px_14px_-4px_rgba(91,33,182,0.45)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="24"
          cy="24"
          r="22"
          fill="url(#otzarMarkFill)"
          stroke="url(#otzarMarkStroke)"
          strokeWidth="1.5"
        />
        {/* Three-blade wing (logo-inspired, simplified). */}
        <path
          d="M16.5 30.5c3.2-1.4 6.4-5.2 7.8-9.4 1.5 3.8 4.2 7.2 7.6 9.1-3.6 1.2-7.6 1.4-11.2.4-1.5-.4-2.9-1-4.2-1.9z"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M17.2 24.8c2.8-2.2 5.6-5.8 6.6-9.6 1.2 3.5 3.5 6.6 6.5 8.6-3.2.8-6.8.7-10-.3-1.1-.4-2.1-.9-3.1-1.5z"
          fill="white"
          fillOpacity="0.88"
        />
        <path
          d="M18.4 19.2c2.2-2.6 4.4-5.4 5.1-8.2.9 2.8 2.7 5.3 5.1 7.1-2.6.5-5.4.3-8-.4-.8-.2-1.5-.5-2.2-.8z"
          fill="white"
          fillOpacity="0.8"
        />
        <defs>
          <radialGradient
            id="otzarMarkFill"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(18 16) rotate(55) scale(34)"
          >
            <stop stopColor="#A78BFA" />
            <stop offset="0.45" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#4C1D95" />
          </radialGradient>
          <linearGradient
            id="otzarMarkStroke"
            x1="8"
            y1="6"
            x2="40"
            y2="42"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E9D5FF" stopOpacity="0.9" />
            <stop offset="1" stopColor="#6D28D9" stopOpacity="0.5" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}
