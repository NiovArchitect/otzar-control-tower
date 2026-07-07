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
import { LogOut, PanelsTopLeft } from "lucide-react";
import { AmbientNav } from "@/components/ambient/AmbientNav";
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
    // Best-effort server-side invalidation; clear memory regardless.
    await api.auth.logout();
    logout();
  }

  return (
    // [OTZAR-LIVE-6] Ambient glass shell — a luminous silver field, a slim glass
    // nav, a frosted low-noise header, and a behavioral state border around the
    // whole surface. Otzar lives around the work, not as a dashboard in it.
    <div className={`relative flex h-screen w-full overflow-hidden ${AMBIENT_FIELD}`}>
      <AmbientNav />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* [OVERLAY-LAYERING] relative z-40: the header's backdrop-blur
            creates a stacking context, which CAPS the notification
            dropdown's z-50 inside it — while the frosted ambient cards in
            <main> (later in DOM order, own blur contexts) painted over it.
            z-40 lifts the whole header chrome above the z-auto content
            plane and keeps it under the ambient overlay ladder (edge glow
            z-[55] < notification stack z-[58] < Otzar bar z-[60]). */}
        <header className="relative z-40 flex h-14 items-center justify-between border-b border-white/50 bg-white/40 px-4 backdrop-blur-xl">
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            Otzar
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell />
            {isOrgAdmin(capabilities) ? (
              <Link
                to="/"
                aria-label="Open Control Tower"
                title="Control Tower"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700"
              >
                <PanelsTopLeft className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={entity ? `Log out (${entity.email})` : "Log out"}
              title="Log out"
              className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/60 hover:text-slate-700"
            >
              <LogOut className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>

      {/* The Otzar ambient layer: a behavioral state border around the whole
          surface, calm cards that surface only what matters, and the voice/text
          orb. All pointer-safe and non-blocking — work stays foreground. */}
      <AmbientEdgeGlow />
      <FlowTraceOverlay />
      <AmbientNotificationStack />
      <AmbientOtzarBar />
    </div>
  );
}
