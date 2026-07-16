// FILE: EmployeeLayout.tsx
// PURPOSE: Authenticated chrome for the EMPLOYEE Otzar shell —
//          AmbientNav + presence header + <Outlet />. Visually distinct
//          from org-admin Control Tower. Design Law: Otzar lives around
//          the work (edge, glow, orb), not as a SaaS dashboard in it.
// CONNECTS TO: AmbientNav, AmbientOtzarBar, presence store, App.tsx /app.

import { Link, Outlet } from "react-router-dom";
import { LogOut, PanelsTopLeft } from "lucide-react";
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
import { AMBIENT_FIELD, GLASS_CHROME } from "@/lib/ambient/glass";

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
      {/* Atmospheric depth — never flat white; pointer-safe. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="otzar-aurora-layer opacity-80" />
      </div>

      <AmbientNav />

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Header stacks above content so notification dropdowns aren't
            painted over by frosted main panels (overlay ladder: header z-40
            < edge z-55 < stack z-58 < orb z-60). */}
        <header
          className={`relative z-40 flex h-14 items-center justify-between border-b px-4 ${GLASS_CHROME}`}
        >
          <div className="flex items-center gap-2.5">
            <AppBackButton fallback="/app" />
            <Link
              to="/app"
              className="group flex items-center gap-2 rounded-full py-1 pr-2 transition-opacity hover:opacity-90"
              aria-label="Otzar home"
            >
              <OtzarMark size="sm" active />
              <span className="text-sm font-semibold tracking-tight text-slate-900">
                Otzar
              </span>
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-1">
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

      {/* Ambient layer: state border, calm cards, voice/text orb.
          Work stays foreground; these never block primary CTAs. */}
      <AmbientEdgeGlow />
      <FlowTraceOverlay />
      <AmbientNotificationStack />
      <AmbientOtzarBar />

      <NavigationGuard />
    </div>
  );
}
