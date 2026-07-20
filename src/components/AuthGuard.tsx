// FILE: AuthGuard.tsx
// PURPOSE: Wraps every protected route. Reads from the auth store
//          and either renders the children, redirects to /login, or
//          shows an Access Denied screen when the user is logged in
//          but lacks can_admin_org.
// CONNECTS TO: src/lib/stores/auth.ts (state source), every Layout
//              child route in App.tsx.
//
// CONTRACT (regression-protected by tests/unit/auth-guard.test.tsx):
// - !isAuthenticated → <Navigate to="/login" replace />
// - isAuthenticated && !capabilities?.can_admin_org → bounce to employee
//   Home (/app) — never leave non-admins sitting on CT URLs (matrix L)
// - Otherwise → children

import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, capabilities } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex h-screen items-center justify-center text-muted-foreground"
      >
        Authenticating…
      </div>
    );
  }

  if (!isAuthenticated) {
    // [SECTION-16] Preserve where the user was headed so login returns them
    // there (protected deep-link continuity). Path only — no secrets in the URL.
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  // Matrix L / C-02: non-admins never remain in the Control Tower URL space.
  // Employee product lives under /app — bounce them there rather than a CT
  // "Access Denied" shell that still shows a CT path in the address bar.
  if (capabilities === null || !capabilities.can_admin_org) {
    return (
      <Navigate
        to="/app"
        replace
        state={{ ctDenied: true, from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}
