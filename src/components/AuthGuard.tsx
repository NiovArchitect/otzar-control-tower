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
// - isAuthenticated && !capabilities?.can_admin_org → AccessDenied
// - Otherwise → children

import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, capabilities, logout } = useAuthStore();

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
    return <Navigate to="/login" replace />;
  }

  if (capabilities === null || !capabilities.can_admin_org) {
    return <AccessDeniedScreen onLogout={logout} />;
  }

  return <>{children}</>;
}

function AccessDeniedScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <main
      role="main"
      className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-2xl font-semibold">Access Denied</h1>
      <p className="max-w-md text-muted-foreground">
        You're signed in, but your account doesn't have admin access to the
        Control Tower yet. Ask your organization's owner to give you admin
        access.
      </p>
      <button
        type="button"
        onClick={onLogout}
        className="mt-4 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
      >
        Log out
      </button>
    </main>
  );
}
