// FILE: AmbientNav.tsx
// PURPOSE: Minimal, device-aware employee nav. FIVE calm entries —
//          Today / Needs me / Comms / People / Memory + More.
//          Desktop: slim glass left rail. Mobile: glass bottom bar.
//          Design Law: compress by default; never a 26-destination maze.
// CONNECTS TO: EmployeeLayout, nav-employee.ts, glass tokens.

import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Home, Inbox, Headphones, Users, Brain, MoreHorizontal, X } from "lucide-react";
import { EMPLOYEE_NAV } from "@/lib/nav-employee";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { GLASS_SURFACE, GLASS_NAV_ACTIVE, GLASS_CHROME } from "@/lib/ambient/glass";

interface PrimaryItem {
  label: string;
  to: string;
  icon: typeof Home;
  end?: boolean;
}

const PRIMARY: PrimaryItem[] = [
  { label: "Today", to: "/app", icon: Home, end: true },
  { label: "Needs me", to: "/app/action-center", icon: Inbox },
  { label: "Comms", to: "/app/comms", icon: Headphones },
  { label: "People", to: "/app/collaboration", icon: Users },
  { label: "Memory", to: "/app/my-memory", icon: Brain },
];

export function AmbientNav(): JSX.Element {
  const [moreOpen, setMoreOpen] = useState(false);
  const capabilities = useAuthStore((s) => s.capabilities);
  const admin = isOrgAdmin(capabilities);
  const primaryTos = new Set(PRIMARY.map((p) => p.to));
  const more = EMPLOYEE_NAV.filter(
    (i) =>
      !primaryTos.has(i.to) &&
      i.hidden !== true &&
      (i.adminOnly !== true || admin),
  );

  const railLink = (active: boolean): string =>
    `flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[10px] font-medium transition-all duration-200 ${
      active
        ? `${GLASS_NAV_ACTIVE}`
        : "text-slate-400 hover:bg-white/40 hover:text-slate-700"
    }`;

  function MoreButton({ className }: { className: string }): JSX.Element {
    return (
      <button
        type="button"
        onClick={() => setMoreOpen(true)}
        data-testid="ambient-nav-more"
        className={className}
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden />
        <span>More</span>
      </button>
    );
  }

  return (
    <>
      {/* Desktop: slim glass left rail over the ambient field. */}
      <nav
        data-testid="ambient-nav"
        aria-label="Otzar"
        className={`relative z-10 hidden w-[72px] shrink-0 flex-col items-center gap-1.5 border-r px-1.5 py-4 sm:flex ${GLASS_CHROME}`}
      >
        {PRIMARY.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            end={p.end ?? false}
            className={({ isActive }) => railLink(isActive)}
          >
            <p.icon className="h-5 w-5" aria-hidden />
            <span className="leading-tight">{p.label}</span>
          </NavLink>
        ))}
        <MoreButton className={`${railLink(false)} mt-auto`} />
      </nav>

      {/* Mobile: glass bottom bar (thumb zone + safe area). */}
      <nav
        aria-label="Otzar"
        className={`fixed inset-x-0 bottom-0 z-[56] flex items-center justify-around border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:hidden ${GLASS_CHROME} bg-white/75`}
      >
        {PRIMARY.map((p) => (
          <NavLink
            key={p.to}
            to={p.to}
            end={p.end ?? false}
            className={({ isActive }) => railLink(isActive)}
          >
            <p.icon className="h-5 w-5" aria-hidden />
            <span className="leading-tight">{p.label}</span>
          </NavLink>
        ))}
        <MoreButton className={railLink(false)} />
      </nav>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/25 backdrop-blur-sm sm:items-center"
          data-testid="ambient-nav-more-sheet"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className={`${GLASS_SURFACE} m-3 max-h-[75vh] w-full max-w-md overflow-y-auto p-5`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="More destinations"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">More</h2>
                <p className="text-[11px] text-slate-500">
                  Secondary tools — the everyday loop stays on the rail.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/70 hover:text-slate-700"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {more.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="rounded-xl border border-white/50 bg-white/40 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-white/70"
                >
                  <span className="font-medium">{item.label}</span>
                  {item.description ? (
                    <span className="mt-0.5 block text-[10px] leading-snug text-slate-500 line-clamp-2">
                      {item.description}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
