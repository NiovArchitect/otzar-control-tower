// FILE: Layout.tsx
// PURPOSE: Authenticated admin chrome — frosted sidebar + header over the
//          ambient field (same visual language as the employee shell).
//          Design Law §5: admins get deeper tools, never terminal chrome.
// CONNECTS TO: AdminSidebar, AdminCommandLayer, AmbientOtzarBar, App.tsx.

import { Link, Outlet } from "react-router-dom";
import { LogOut, Menu, Mic } from "lucide-react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { AMBIENT_FIELD, GLASS_CHROME } from "@/lib/ambient/glass";
import { OtzarBrandLogo } from "@/components/ambient/OtzarBrandLogo";
import { AdminCommandLayer } from "@/components/AdminCommandLayer";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { NavigationGuard } from "@/components/navigation/NavigationGuard";
import { AmbientOtzarBar } from "@/components/otzar/AmbientOtzarBar";
import { AmbientEdgeGlow } from "@/components/otzar/AmbientEdgeGlow";
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

  async function handleLogout(): Promise<void> {
    await api.auth.logout();
    logout();
  }

  return (
    <div
      className={`relative flex h-screen w-full overflow-hidden ${AMBIENT_FIELD}`}
      data-testid="admin-shell"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="otzar-brand-ribbons" />
        <div className="otzar-aurora-layer" />
      </div>
      <AmbientEdgeGlow />

      {!isMobile && (
        <aside className="relative z-10 w-64 shrink-0">
          <AdminSidebar />
        </aside>
      )}

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <header
          className={`flex h-16 items-center justify-between border-b px-4 sm:px-6 ${GLASS_CHROME}`}
        >
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
            <AppBackButton fallback="/" />
            {isMobile ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[#1e1b4b]">
                <OtzarBrandLogo size="md" tone="brand" polish />
                Control Tower
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-sm sm:gap-3">
            <AdminCommandLayer />
            {isEmployee(capabilities) && (
              <Button asChild size="sm" className="otzar-cta-fill hidden gap-1 border-0 sm:inline-flex">
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
              <span
                className="hidden max-w-[160px] truncate text-[#5c5a78] md:inline"
                aria-label="Logged in as"
              >
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
              <LogOut className="mr-0 h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-7">
          <div className="otzar-page">
            <Outlet />
          </div>
        </main>

        <footer
          className={`flex flex-col items-center justify-between gap-2 border-t px-4 py-3 sm:flex-row ${GLASS_CHROME}`}
        >
          <DataSovereigntyBadge />
          <ConnectionStatusIndicator />
        </footer>
      </div>

      {isEmployee(capabilities) ? <AmbientOtzarBar /> : null}

      <NavigationGuard />
    </div>
  );
}
