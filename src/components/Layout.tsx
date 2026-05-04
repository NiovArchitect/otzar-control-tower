// FILE: Layout.tsx
// PURPOSE: Authenticated chrome -- AdminSidebar + top bar + footer +
//          <Outlet /> for the active page. Mounted under AuthGuard so
//          unauthenticated visitors never see this surface.
// CONNECTS TO: AdminSidebar, ConnectionStatusIndicator,
//              DataSovereigntyBadge, App.tsx routes.

import { Outlet } from "react-router-dom";
import { LogOut, Menu } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ConnectionStatusIndicator } from "@/components/ConnectionStatusIndicator";
import { DataSovereigntyBadge } from "@/components/DataSovereigntyBadge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/lib/stores/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

export function Layout() {
  const { entity, logout } = useAuthStore();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            {entity && (
              <span className="text-muted-foreground" aria-label="Logged in as">
                {entity.email}
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={logout}
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
    </div>
  );
}
