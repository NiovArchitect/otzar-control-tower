// FILE: OtzarMark.tsx
// PURPOSE: Canonical Otzar mark — the exact flat purple symbol (circle +
//          three-blade wing). Keep the geometry faithful to brand art;
//          "stand out" via restrained soft bloom + depth, not redesign.
// CONNECTS TO: Login, EmployeeLayout, AmbientWorkSurface, ambient presence.

export function OtzarMark({
  size = "md",
  active = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  /** Soft luminous bloom when true (state-backed presence). */
  active?: boolean;
  className?: string;
}): JSX.Element {
  const dim =
    size === "lg" ? "h-11 w-11" : size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <span
      aria-hidden
      data-testid="otzar-mark"
      className={`relative inline-flex shrink-0 items-center justify-center ${dim} ${className}`}
    >
      {/* Restrained violet bloom — standout without neon flood. */}
      <span
        className={`pointer-events-none absolute inset-[-18%] rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.28)_0%,rgba(168,85,247,0.08)_45%,transparent_70%)] ${
          active
            ? "motion-safe:animate-[otzar-breathe_5s_ease-in-out_infinite]"
            : "opacity-70"
        }`}
      />
      {/* Exact brand geometry (flat violet mark). */}
      <svg
        viewBox="0 0 100 100"
        className="relative h-full w-full drop-shadow-[0_2px_10px_rgba(124,58,237,0.35)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Otzar"
      >
        {/* Open ring — thick circular stroke, open at upper-right. */}
        <path
          d="M78 22
             C90 34 94 52 88 68
             C80 88 58 98 38 94
             C18 90 4 70 8 48
             C12 26 32 10 54 12
             C62 13 70 16 76 20"
          stroke="#A855F7"
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
        />
        {/* Three flowing blades (wing) — solid brand purple. */}
        <path
          d="M28 68
             C38 58 48 42 52 28
             C58 42 68 56 82 66
             C68 72 48 74 28 68 Z"
          fill="#A855F7"
        />
        <path
          d="M30 58
             C40 48 48 36 52 24
             C56 36 66 48 78 56
             C64 62 46 64 30 58 Z"
          fill="#A855F7"
        />
        <path
          d="M34 48
             C42 40 48 30 52 20
             C56 30 64 40 74 48
             C60 52 46 52 34 48 Z"
          fill="#A855F7"
        />
      </svg>
    </span>
  );
}
