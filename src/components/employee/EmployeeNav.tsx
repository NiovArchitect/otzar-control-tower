// FILE: EmployeeNav.tsx
// PURPOSE: Left navigation rail for the employee Otzar shell. Renders
//          EMPLOYEE_NAV and highlights the active route. Intentionally
//          carries NO org-admin actions (no invite/suspend/grant/
//          revoke/settings) -- those live only in AdminSidebar.
// CONNECTS TO: src/lib/nav-employee.ts, EmployeeLayout.

import { NavLink } from "react-router-dom";
import { EMPLOYEE_NAV } from "@/lib/nav-employee";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function EmployeeNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav
      aria-label="Otzar navigation"
      className="flex h-full flex-col border-r border-border bg-card"
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
        <ul className="space-y-1">
          {EMPLOYEE_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
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
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </nav>
  );
}
