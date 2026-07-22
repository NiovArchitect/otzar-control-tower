// FILE: AmbientNav.tsx
// PURPOSE: Phase-F ambient nav — five calm primary destinations + More.
//          Desktop: luminous glass left rail. Mobile: glass bottom bar.
//          Never a 26-destination SaaS maze.
// CONNECTS TO: EmployeeLayout, nav-employee.ts, glass tokens.

import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Home,
  Inbox,
  Mic,
  Users,
  Brain,
  MoreHorizontal,
  X,
} from "lucide-react";
import { EMPLOYEE_NAV } from "@/lib/nav-employee";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { GLASS_SURFACE, GLASS_NAV_ACTIVE, GLASS_CHROME } from "@/lib/ambient/glass";
import { OtzarBrandLogo } from "@/components/ambient/OtzarBrandLogo";

interface PrimaryItem {
  label: string;
  to: string;
  icon: typeof Home;
  end?: boolean;
}

/** C-03 / WAVE-1: same five as EMPLOYEE_NAV primary — no dead / fake destinations. */
const PRIMARY: PrimaryItem[] = [
  { label: "Today", to: "/app", icon: Home, end: true },
  { label: "Talk", to: "/app/voice", icon: Mic },
  { label: "Needs me", to: "/app/action-center", icon: Inbox },
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
    `flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[10px] font-semibold transition-all duration-150 ${
      active
        ? `${GLASS_NAV_ACTIVE}`
        : "text-[#5c5a78] hover:bg-[#B124E8]/08 hover:text-[#1e1b4b]"
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
      {/* Desktop: luminous glass left rail */}
      <nav
        data-testid="ambient-nav"
        aria-label="Otzar"
        className={`relative z-10 hidden w-[84px] shrink-0 flex-col items-center gap-1 border-r px-2 py-4 sm:flex ${GLASS_CHROME}`}
      >
        <Link
          to="/app"
          className="mb-3 flex flex-col items-center gap-1 rounded-2xl px-1 py-2 transition-opacity hover:opacity-90"
          aria-label="Otzar home"
        >
          <OtzarBrandLogo size="lg" tone="brand" polish />
        </Link>
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

      {/* Mobile: glass bottom bar (same primary loop; testid for live smokes). */}
      <nav
        data-testid="ambient-nav"
        aria-label="Otzar"
        className={`fixed inset-x-0 bottom-0 z-[56] flex items-center justify-around border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:hidden ${GLASS_CHROME} bg-white/80`}
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
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/30 backdrop-blur-md sm:items-center"
          data-testid="ambient-nav-more-sheet"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className={`${GLASS_SURFACE} m-3 max-h-[78vh] w-full max-w-md overflow-y-auto p-6`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="More destinations"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-[#1e1b4b]">
                  More
                </h2>
                <p className="mt-0.5 text-[11px] text-[#5c5a78]">
                  Secondary tools — everyday work stays on the rail.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-2 text-[#5c5a78] transition-colors hover:bg-[#B124E8]/08 hover:text-[#B124E8]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {more.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  data-testid={
                    item.to === "/app/connector-health"
                      ? "more-tools"
                      : item.to === "/app/work-projects"
                        ? "more-projects"
                        : undefined
                  }
                  className="rounded-xl border border-[#1e1b4b]/08 bg-white px-3.5 py-3 text-sm text-[#1e1b4b] shadow-[0_4px_14px_-6px_rgba(30,27,75,0.1)] transition-all hover:shadow-[0_8px_22px_-8px_rgba(177,36,232,0.18)]"
                >
                  <span className="font-semibold text-[#1e1b4b]">{item.label}</span>
                  {item.description ? (
                    <span className="mt-1 block text-[10px] leading-snug text-[#5c5a78] line-clamp-2">
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
