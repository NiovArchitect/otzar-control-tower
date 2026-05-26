// FILE: EmployeeGuard.tsx
// PURPOSE: Route guard for the employee Otzar shell (/app/*). Admits
//          authenticated PRODUCT users (can_read_capsules); it does
//          NOT require can_admin_org, and it NEVER consults
//          can_admin_niov. Distinct from AuthGuard (which gates the
//          org-admin Control Tower on can_admin_org and is unchanged).
// CONNECTS TO: src/lib/stores/auth.ts, src/lib/auth/capabilities.ts,
//              App.tsx /app branch.
//
// CONTRACT:
//   - !isAuthenticated            -> <Navigate to="/login" replace />
//   - authenticated && !isEmployee -> "No Otzar access" screen
//   - otherwise                    -> children

import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/lib/stores/auth";
import { isEmployee } from "@/lib/auth/capabilities";

interface EmployeeGuardProps {
  children: React.ReactNode;
}

export function EmployeeGuard({ children }: EmployeeGuardProps) {
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

  if (!isEmployee(capabilities)) {
    return <NoOtzarAccessScreen onLogout={logout} />;
  }

  return <>{children}</>;
}

function NoOtzarAccessScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <main
      role="main"
      className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-2xl font-semibold">No Otzar access</h1>
      <p className="max-w-md text-muted-foreground">
        Your account is authenticated, but it does not have the
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5">read</code>
        capability required to use Otzar. Ask your organization
        administrator to grant Otzar access on your account.
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
