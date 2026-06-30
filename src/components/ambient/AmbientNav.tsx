// FILE: AmbientNav.tsx
// PURPOSE: [OTZAR-LIVE-6] The minimal, device-aware employee nav. Collapses ~26
//          SaaS destinations into FIVE calm entries — Today / Needs me / People /
//          Memory / More — so a non-technical employee isn't managing a system.
//          Desktop: a slim glass left rail. Mobile: a glass bottom bar (thumb
//          zone). "More" opens a glass sheet with everything else (admin/debug/
//          secondary), so no route is lost — just not exposed equally. The full
//          route table (EMPLOYEE_NAV) is reused, never duplicated.
// CONNECTS TO: EmployeeLayout, src/lib/nav-employee.ts, GLASS_SURFACE,
//          tests/unit/ambient-nav.test.tsx.

import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Home, Inbox, Headphones, Users, Brain, MoreHorizontal, X } from "lucide-react";
import { EMPLOYEE_NAV } from "@/lib/nav-employee";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { GLASS_SURFACE } from "@/lib/ambient/glass";

interface PrimaryItem {
  label: string;
  to: string;
  icon: typeof Home;
  end?: boolean;
}

// The approved minimal employee primary: the everyday loop only. The ambient
// orb is the main "Ask Otzar" assistant entry, so it isn't duplicated here.
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
  // "More" = everything else, but NOT route-only (hidden) surfaces — those stay
  // reachable by URL without crowding the sheet — and adminOnly gated.
  const more = EMPLOYEE_NAV.filter(
    (i) =>
      !primaryTos.has(i.to) &&
      i.hidden !== true &&
      (i.adminOnly !== true || admin),
  );

  const railLink = (active: boolean): string =>
    `flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors ${
      active ? "text-slate-900" : "text-slate-400 hover:text-slate-700"
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
      {/* Desktop: slim glass left rail. */}
      <nav
        data-testid="ambient-nav"
        aria-label="Otzar"
        className="hidden w-[68px] shrink-0 flex-col items-center gap-1 border-r border-white/50 bg-white/40 px-1.5 py-4 backdrop-blur-xl sm:flex"
      >
        {PRIMARY.map((p) => (
          <NavLink key={p.to} to={p.to} end={p.end ?? false} className={({ isActive }) => railLink(isActive)}>
            <p.icon className="h-5 w-5" aria-hidden />
            <span className="leading-tight">{p.label}</span>
          </NavLink>
        ))}
        <MoreButton className={`${railLink(false)} mt-auto`} />
      </nav>

      {/* Mobile: glass bottom bar (thumb zone). */}
      <nav
        aria-label="Otzar"
        className="fixed inset-x-0 bottom-0 z-[56] flex items-center justify-around border-t border-white/50 bg-white/70 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl sm:hidden"
      >
        {PRIMARY.map((p) => (
          <NavLink key={p.to} to={p.to} end={p.end ?? false} className={({ isActive }) => railLink(isActive)}>
            <p.icon className="h-5 w-5" aria-hidden />
            <span className="leading-tight">{p.label}</span>
          </NavLink>
        ))}
        <MoreButton className={railLink(false)} />
      </nav>

      {/* "More" — a glass sheet with everything else. Collapsed by default. */}
      {moreOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/20 backdrop-blur-sm sm:items-center"
          data-testid="ambient-nav-more-sheet"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className={`${GLASS_SURFACE} m-3 max-h-[75vh] w-full max-w-md overflow-y-auto p-4`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Everything else</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {more.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-white/60"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
