// FILE: EmployeeNav.tsx
// PURPOSE: Left navigation rail for the employee Otzar shell. Renders
//          EMPLOYEE_NAV and highlights the active route. Intentionally
//          carries NO org-admin actions (no invite/suspend/grant/
//          revoke/settings) -- those live only in AdminSidebar.
//
//          Phase 1235 (ambient shell): the "More" section is
//          COLLAPSED by default — normal employees see the 7 primary
//          surfaces and one quiet "More" disclosure, not 22 links.
//          Admin/diagnostic entries (adminOnly) are hidden unless the
//          viewer has org-admin capability.
// CONNECTS TO: src/lib/nav-employee.ts, EmployeeLayout,
//              src/lib/auth/capabilities.ts.

import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  PRIMARY_EMPLOYEE_NAV,
  MORE_EMPLOYEE_NAV,
  type EmployeeNavItem,
} from "@/lib/nav-employee";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { cn } from "@/lib/utils";

function NavRow({
  item,
  onNavigate,
}: {
  item: EmployeeNavItem;
  onNavigate: (() => void) | undefined;
}): JSX.Element {
  const Icon = item.icon;
  return (
    <li>
      <NavLink
        to={item.to}
        end={item.to === "/app"}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-accent text-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )
        }
        data-testid="employee-nav-link"
        data-nav-group={item.group}
      >
        <Icon className="h-4 w-4" aria-hidden />
        <span className="flex-1">{item.label}</span>
      </NavLink>
    </li>
  );
}

export function EmployeeNav({ onNavigate }: { onNavigate?: () => void }) {
  const { capabilities } = useAuthStore();
  const admin = isOrgAdmin(capabilities);
  // Phase 1235: collapsed by default — the shell stays quiet until
  // the employee asks for more.
  const [moreOpen, setMoreOpen] = useState(false);

  // adminOnly entries (e.g. Team Work — can_admin_org) are gated in BOTH groups
  // so a manager-only primary item stays prominent for managers and hidden for
  // non-managers (matches the backend team-work authority gate).
  const primaryItems = PRIMARY_EMPLOYEE_NAV.filter(
    (i) => i.adminOnly !== true || admin,
  );
  const moreItems = MORE_EMPLOYEE_NAV.filter(
    (i) => i.adminOnly !== true || admin,
  );

  return (
    <nav
      aria-label="Otzar navigation"
      className="flex h-full flex-col border-r border-border bg-card"
      data-testid="employee-nav"
    >
      <div className="flex items-center gap-2 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          O
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight">Otzar</div>
          <div className="text-xs leading-tight text-muted-foreground">
            Employee workspace
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-2 pb-4">
        <ul className="space-y-1" data-testid="employee-nav-primary">
          {primaryItems.map((item) => (
            <NavRow key={item.to} item={item} onNavigate={onNavigate} />
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className="mt-4 flex w-full items-center gap-1 px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          data-testid="employee-nav-more-toggle"
        >
          {moreOpen ? (
            <ChevronDown className="h-3 w-3" aria-hidden />
          ) : (
            <ChevronRight className="h-3 w-3" aria-hidden />
          )}
          More
        </button>
        {moreOpen ? (
          <ul className="space-y-1" data-testid="employee-nav-more">
            {moreItems.map((item) => (
              <NavRow key={item.to} item={item} onNavigate={onNavigate} />
            ))}
          </ul>
        ) : null}
      </ScrollArea>
    </nav>
  );
}
