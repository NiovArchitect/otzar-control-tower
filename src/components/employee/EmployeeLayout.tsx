// FILE: EmployeeLayout.tsx
// PURPOSE: Phase-F employee Otzar shell — ambient field, luminous nav,
//          presence header, outlet. Work stays foreground; Otzar surrounds.
// CONNECTS TO: AmbientNav, AmbientOtzarBar, presence, App.tsx /app.

import { Link, Outlet } from "react-router-dom";
import { LogOut, PanelsTopLeft, Sparkles } from "lucide-react";
import { AmbientNav } from "@/components/ambient/AmbientNav";
import { OtzarBrandLogo } from "@/components/ambient/OtzarBrandLogo";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { NavigationGuard } from "@/components/navigation/NavigationGuard";
import { FlowTraceOverlay } from "@/components/ambient/FlowTraceOverlay";
import { AmbientOtzarBar } from "@/components/otzar/AmbientOtzarBar";
import { AmbientEdgeGlow } from "@/components/otzar/AmbientEdgeGlow";
import { AmbientNotificationStack } from "@/components/otzar/AmbientNotificationStack";
import { NotificationBell } from "@/components/otzar/NotificationBell";
import { OrgContextBadge } from "@/components/otzar/OrgContextBadge";
import { FirstUseReveal } from "@/components/first-use/FirstUseReveal";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import { api } from "@/lib/api";
import { AMBIENT_FIELD } from "@/lib/ambient/glass";

export function EmployeeLayout() {
  const { entity, capabilities, logout } = useAuthStore();

  async function handleLogout(): Promise<void> {
    await api.auth.logout();
    logout();
  }

  return (
    <div
      // Viewport pin — not a scroll-under paint bug. When the shell is only
      // relative + 100vh, document/browser layout can leave "Otzar / Work OS /
      // Talk / 20" outside the visual viewport. fixed + 100dvh + safe-area
      // keeps that chrome inside the view at all times; only <main> scrolls.
      className={`fixed inset-0 flex h-[100dvh] max-h-[100dvh] w-full overflow-hidden pt-[env(safe-area-inset-top,0px)] ${AMBIENT_FIELD}`}
      data-testid="employee-shell"
    >
      {/* Soft brand atmosphere on pearl field */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="otzar-brand-ribbons" />
        <div className="otzar-aurora-layer" />
      </div>

      <AmbientNav />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="relative z-40 flex h-14 shrink-0 items-center justify-between border-b border-[#1e1b4b]/08 bg-white/90 px-4 shadow-[0_4px_16px_-10px_rgba(30,27,75,0.08)] backdrop-blur-xl sm:h-16 sm:px-6"
          data-testid="employee-shell-header"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <AppBackButton fallback="/app" />
            <Link
              to="/app"
              className="group flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-2 transition-opacity hover:opacity-90"
              aria-label="Otzar home"
            >
              <OtzarBrandLogo size="md" tone="brand" polish />
              <div className="min-w-0 leading-tight">
                <span className="otzar-text-luminous block text-sm font-semibold tracking-tight">
                  Otzar
                </span>
                <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-[#5c5a78] sm:block">
                  Work OS
                </span>
              </div>
            </Link>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <OrgContextBadge />
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("otzar:open"));
                }
              }}
              className="otzar-cta-fill hidden items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold sm:inline-flex"
              data-testid="header-talk-otzar"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Talk
            </button>
            <NotificationBell />
            {isOrgAdmin(capabilities) ? (
              <Link
                to="/setup"
                aria-label="Open Control Tower · Organization"
                title="Control Tower · Organization"
                data-testid="header-open-control-tower"
                className="otzar-cta-ghost inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold"
              >
                <PanelsTopLeft className="h-3.5 w-3.5 text-[#B124E8]" aria-hidden />
                <span className="hidden sm:inline">Organization</span>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={entity ? `Log out (${entity.email})` : "Log out"}
              title="Log out"
              className="rounded-full p-2.5 text-[#5c5a78] transition-colors hover:bg-[#B124E8]/08 hover:text-[#B124E8]"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        <main
          className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 pb-24 sm:px-8 sm:py-7 sm:pb-8"
          data-testid="employee-shell-main"
        >
          <div className="otzar-page">
            <Outlet />
          </div>
        </main>
      </div>

      <AmbientEdgeGlow />
      <FlowTraceOverlay />
      <AmbientNotificationStack />
      <AmbientOtzarBar />
      {/* Persistent first-use guide: survives route changes (not Home-only). */}
      <FirstUseReveal />

      <NavigationGuard />
    </div>
  );
}
