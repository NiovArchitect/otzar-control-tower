// FILE: EmployeeLayout.tsx
// PURPOSE: Authenticated chrome for the EMPLOYEE Otzar shell --
//          EmployeeNav + top bar + <Outlet />. Mounted under
//          EmployeeGuard. Visually distinct from the org-admin
//          Control Tower (Layout/AdminSidebar): brand reads "Otzar",
//          not "NIOV Control Tower", and it exposes NO admin actions.
// CONNECTS TO: EmployeeNav, src/lib/stores/auth.ts, src/lib/api.ts,
//              src/lib/auth/capabilities.ts, App.tsx /app branch.
//
// LOGOUT: attempts backend POST /auth/logout to invalidate the server
// session, then clears the in-memory store regardless of the result
// (fail-safe). Token stays memory-only -- no persistence added.

import { Link, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { EmployeeNav } from "@/components/employee/EmployeeNav";
import { AmbientOtzarBar } from "@/components/otzar/AmbientOtzarBar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { api } from "@/lib/api";

export function EmployeeLayout() {
  const { entity, capabilities, logout } = useAuthStore();

  async function handleLogout(): Promise<void> {
    // Best-effort server-side invalidation; clear memory regardless.
    await api.auth.logout();
    logout();
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="hidden w-60 shrink-0 sm:block">
        <EmployeeNav />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <span className="text-sm font-semibold sm:hidden">Otzar</span>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {isOrgAdmin(capabilities) && (
              <Button asChild variant="outline" size="sm">
                <Link to="/">Open Control Tower</Link>
              </Button>
            )}
            {entity && (
              <span className="text-muted-foreground" aria-label="Logged in as">
                {entity.email}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleLogout()}
              aria-label="Log out"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden />
              Log out
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>

      {/* Persistent ambient Otzar dock. Available on every
          authenticated employee page; nonblocking; semi-transparent. */}
      <AmbientOtzarBar />
    </div>
  );
}
