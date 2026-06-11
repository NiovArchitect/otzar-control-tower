// FILE: Layout.tsx
// PURPOSE: Authenticated chrome -- AdminSidebar + top bar + footer +
//          <Outlet /> for the active page. Mounted under AuthGuard so
//          unauthenticated visitors never see this surface.
// CONNECTS TO: AdminSidebar, ConnectionStatusIndicator,
//              DataSovereigntyBadge, App.tsx routes.

import { Link, Outlet } from "react-router-dom";
import { LogOut, Menu, Mic } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminCommandLayer } from "@/components/AdminCommandLayer";
import { AmbientOtzarBar } from "@/components/otzar/AmbientOtzarBar";
import { ConnectionStatusIndicator } from "@/components/ConnectionStatusIndicator";
import { DataSovereigntyBadge } from "@/components/DataSovereigntyBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/stores/auth";
import { isEmployee } from "@/lib/auth/capabilities";
import { api } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export function Layout() {
  const { entity, capabilities, logout } = useAuthStore();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Best-effort server-side session invalidation, then clear the
  // in-memory store regardless of the result (fail-safe). Token stays
  // memory-only -- no persistence added.
  async function handleLogout(): Promise<void> {
    await api.auth.logout();
    logout();
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {!isMobile && (
        <aside className="w-60 shrink-0">
          <AdminSidebar />
        </aside>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open navigation">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-60 p-0">
                  <AdminSidebar onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <AdminCommandLayer />
            {isEmployee(capabilities) && (
              <Button asChild variant="default" size="sm" className="gap-1">
                <Link to="/app/voice-ready">
                  <Mic className="h-4 w-4" />
                  Talk to Otzar
                </Link>
              </Button>
            )}
            {isEmployee(capabilities) && (
              <Button asChild variant="outline" size="sm">
                <Link to="/app">Open Otzar</Link>
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
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <Outlet />
        </main>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-border bg-card px-4 py-3 sm:flex-row">
          <DataSovereigntyBadge />
          <ConnectionStatusIndicator />
        </footer>
      </div>

      {/* Persistent ambient Otzar dock. Org admins (and dual-persona
          founders like Sadeil who land on / by default) can now Talk
          to Otzar from the Control Tower without first navigating to
          /app. Gated on isEmployee so true-pure-admin users (no
          can_read_capsules) do not see the chat dock. */}
      {isEmployee(capabilities) ? <AmbientOtzarBar /> : null}
    </div>
  );
}
