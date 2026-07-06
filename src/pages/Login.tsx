// FILE: Login.tsx
// PURPOSE: Public credentials screen. On success: shows the
//          audit-aware toast "Audit event logged: LOGIN_SUCCESS" and
//          navigates to /. On failure: surfaces the message from the
//          auth store. The only unguarded screen in the app.
//
//          In Vite dev mode (DEV === true) the page also renders a
//          local-only "demo credentials" affordance — a one-click
//          fill of the seeded admin / employee accounts produced by
//          niov-foundation/scripts/demo-seed.ts. The block is
//          rendered ONLY when import.meta.env.DEV is true; production
//          builds never see it.
// CONNECTS TO: src/lib/stores/auth.ts, App.tsx /login route,
//              niov-foundation/scripts/demo-seed.ts.

import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth";
import { landingPathFor } from "@/lib/auth/capabilities";
import { AMBIENT_FIELD, GLASS_SURFACE } from "@/lib/ambient/glass";

// WHAT: Local-dev-only demo accounts produced by
//        niov-foundation/scripts/demo-seed.ts (PR #300 substrate).
//        Rendered in the Login page ONLY when import.meta.env.DEV
//        is true.
// INPUT: None.
// OUTPUT: None — type only.
// WHY: Real customer-experience test asks "what do I type here?" —
//      this gives the operator a one-click fill in dev mode so the
//      visual launch doesn't dead-end on "no credentials visible".
const DEMO_ACCOUNTS: ReadonlyArray<{
  role: string;
  email: string;
  password: string | null;
  description: string;
}> = [
  {
    role: "Founder (Sadeil)",
    email: "sadeil@niovlabs.com",
    // Password is NEVER hard-coded here — it's printed once by
    // scripts/founder-bootstrap.ts to the terminal that ran it.
    // The button only fills in the email; the operator pastes the
    // password they captured from that terminal.
    password: null,
    description:
      "Run `npx tsx scripts/founder-bootstrap.ts` once; password printed to stdout",
  },
  {
    role: "Org admin (demo seed)",
    email: "DEMO-2026-06-04-admin@niov.demo",
    password: "demo-password-123",
    description: "Lands in Control Tower (/) — can_admin_org granted",
  },
  {
    role: "Employee (demo seed)",
    email: "DEMO-2026-06-04-employee@niov.demo",
    password: "demo-password-123",
    description: "Lands in /app — Twin + Authority + Projects",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, loginError, isAuthenticated, capabilities } =
    useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Org admins land in the Control Tower ("/"); product-only employees
  // land in the Otzar shell ("/app"). landingPathFor encapsulates the
  // persona routing and never sends a non-admin into the admin area.
  useEffect(() => {
    if (isAuthenticated) {
      navigate(landingPathFor(capabilities), { replace: true });
    }
  }, [isAuthenticated, capabilities, navigate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await login(email, password);
    if (result.ok) {
      // Login is audited server-side; no user-facing success popup — users
      // know they signed in. Go straight to the app.
      navigate(landingPathFor(useAuthStore.getState().capabilities), {
        replace: true,
      });
    }
  }

  return (
    <main
      className={`relative flex min-h-screen items-center justify-center px-4 ${AMBIENT_FIELD}`}
    >
      {/* A calm presence bloom behind the card — Otzar is here before you sign in. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_38%,rgba(56,189,248,0.10),transparent_70%)]"
      />
      <Card className={`relative w-full max-w-sm border-0 bg-transparent shadow-none ${GLASS_SURFACE}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-sky-400 motion-safe:animate-pulse"
            />
            Otzar
          </CardTitle>
          <CardDescription className="text-slate-500">
            Your ambient AI Work OS. Every action is governed and kept in your
            organization's audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" aria-label="Login form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {/* [PASSWORD-LIFECYCLE] the logged-out recovery door. */}
                <Link
                  to="/forgot-password"
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  data-testid="login-forgot-password"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {loginError && (
              <div
                role="alert"
                className="text-sm text-destructive space-y-1"
                aria-live="polite"
              >
                <p>{loginError}</p>
                {/^(network|fetch|cannot|connection|timeout)/i.test(
                  loginError,
                ) && import.meta.env.DEV ? (
                  <p className="text-xs text-muted-foreground">
                    Foundation API expected at{" "}
                    <code>
                      {import.meta.env.VITE_FOUNDATION_API_URL ??
                        "http://localhost:3000/api/v1"}
                    </code>
                    . Make sure the local stack is running.
                  </p>
                ) : null}
              </div>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          {import.meta.env.DEV ? (
            <div className="mt-6 border-t pt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Local dev only — seeded demo accounts from
                <code className="ml-1">scripts/demo-seed.ts</code>:
              </p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      if (account.password !== null) {
                        setPassword(account.password);
                      }
                    }}
                    className="w-full text-left text-xs rounded border border-border bg-background px-3 py-2 hover:bg-muted/50"
                  >
                    <div className="font-medium">{account.role}</div>
                    <div className="text-muted-foreground truncate">
                      {account.email}
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      {account.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
