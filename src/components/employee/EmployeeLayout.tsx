// FILE: EmployeeLayout.tsx
// PURPOSE: Phase-F employee Otzar shell — ambient field, luminous nav,
//          presence header, outlet. Work stays foreground; Otzar surrounds.
// CONNECTS TO: AmbientNav, AmbientOtzarBar, presence, App.tsx /app.

import { Link, Outlet } from "react-router-dom";
import { LogOut, PanelsTopLeft, Sparkles } from "lucide-react";
import { AmbientNav } from "@/components/ambient/AmbientNav";
import { OtzarMark } from "@/components/ambient/OtzarMark";
import { AppBackButton } from "@/components/navigation/AppBackButton";
import { NavigationGuard } from "@/components/navigation/NavigationGuard";
import { FlowTraceOverlay } from "@/components/ambient/FlowTraceOverlay";
import { AmbientOtzarBar } from "@/components/otzar/AmbientOtzarBar";
import { AmbientEdgeGlow } from "@/components/otzar/AmbientEdgeGlow";
import { AmbientNotificationStack } from "@/components/otzar/AmbientNotificationStack";
import { NotificationBell } from "@/components/otzar/NotificationBell";
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
      className={`relative flex h-screen w-full overflow-hidden ${AMBIENT_FIELD}`}
      data-testid="employee-shell"
    >
      {/* Atmospheric depth + grain */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="otzar-aurora-layer opacity-90" />
        <div className="otzar-grain" />
      </div>

      <AmbientNav />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Overlay-layering contract: relative z-40 + backdrop-blur on a
            double-quoted className (locked by overlay-layering.test.ts). */}
        <header className="relative z-40 flex h-16 items-center justify-between border-b border-white/50 bg-white/45 px-4 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/35 sm:px-6">
          <div className="flex items-center gap-2.5">
            <AppBackButton fallback="/app" />
            <Link
              to="/app"
              className="group flex items-center gap-2.5 rounded-full py-1 pr-2 transition-opacity hover:opacity-90"
              aria-label="Otzar home"
            >
              <OtzarMark size="sm" active />
              <div className="leading-tight">
                <span className="block text-sm font-semibold tracking-tight text-slate-900">
                  Otzar
                </span>
                <span className="hidden text-[10px] font-medium uppercase tracking-[0.12em] text-indigo-500/70 sm:block">
                  Work OS
                </span>
              </div>
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("otzar:open"));
                }
              }}
              className="otzar-cta-fill hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium sm:inline-flex"
              data-testid="header-talk-otzar"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Talk
            </button>
            <NotificationBell />
            {isOrgAdmin(capabilities) ? (
              <Link
                to="/"
                aria-label="Open Control Tower"
                title="Control Tower"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700"
              >
                <PanelsTopLeft className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={entity ? `Log out (${entity.email})` : "Log out"}
              title="Log out"
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>

      <AmbientEdgeGlow />
      <FlowTraceOverlay />
      <AmbientNotificationStack />
      <AmbientOtzarBar />

      <NavigationGuard />
    </div>
  );
}
