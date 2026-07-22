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
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { resolvePostLoginDestination } from "@/lib/auth/post-login-destination";
import { AMBIENT_FIELD, GLASS_SURFACE } from "@/lib/ambient/glass";
import { OtzarBrandLogo } from "@/components/ambient/OtzarBrandLogo";

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
    description: "Lands on Today Home (/app) — Control Tower via Open Control Tower",
  },
  {
    role: "Employee (demo seed)",
    email: "DEMO-2026-06-04-employee@niov.demo",
    password: "demo-password-123",
    description: "Lands on Today Home (/app) — Twin + current work",
  },
];

// Post-login destination (YC first-use gate):
// Authentication always lands on Home unless returnTo is a *validated*
// intentional deep link. Prior admin/sensitive routes never restore.
export function resolveDestination(
  returnTo: string | null,
  caps: Parameters<typeof landingPathFor>[0],
): string {
  return resolvePostLoginDestination(returnTo, caps);
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, loginError, isAuthenticated, capabilities } =
    useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Fresh authenticated session → Home (or validated deep link only).
  useEffect(() => {
    if (isAuthenticated) {
      navigate(resolveDestination(searchParams.get("returnTo"), capabilities), {
        replace: true,
      });
    }
  }, [isAuthenticated, capabilities, navigate, searchParams]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await login(email, password);
    if (result.ok) {
      // Login is audited server-side. Destination is Home unless the user
      // opened a validated deep link before authenticating.
      navigate(
        resolveDestination(
          searchParams.get("returnTo"),
          useAuthStore.getState().capabilities,
        ),
        { replace: true },
      );
    }
  }

  return (
    <main
      className={`relative flex min-h-screen flex-col items-center justify-center px-4 py-12 ${AMBIENT_FIELD}`}
      data-testid="login-page"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="otzar-brand-ribbons" />
        <div className="otzar-aurora-layer" />
      </div>

      <div className="relative z-10 mb-10 flex max-w-lg flex-col items-center text-center">
        <OtzarBrandLogo size="hero" tone="brand" polish />
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.2em] text-[#5c5a78]">
          Ambient Work OS
        </p>
        <h1 className="otzar-text-luminous mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
          Otzar
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#5c5a78]">
          Communication is the OS. Your AI Teammate executes.
          Governed enough to trust — calm enough to stay out of the way.
        </p>
      </div>

      <Card className={`relative z-10 w-full max-w-sm ${GLASS_SURFACE}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight text-[#1e1b4b]">
            Sign in
          </CardTitle>
          <CardDescription className="text-[#5c5a78]">
            Use your work account. Every action is recorded in your
            organization&apos;s audit trail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" aria-label="Login form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1e1b4b]">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-12 rounded-xl border-[#1e1b4b]/12 bg-white text-[#1e1b4b] placeholder:text-[#8b89a0] focus-visible:ring-[#B124E8]/35"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#1e1b4b]">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#B124E8] underline-offset-2 hover:underline"
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
                className="h-12 rounded-xl border-[#1e1b4b]/12 bg-white text-[#1e1b4b] placeholder:text-[#8b89a0] focus-visible:ring-[#B124E8]/35"
              />
            </div>
            {loginError && (
              <div
                role="alert"
                className="space-y-1 text-sm text-destructive"
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
            <Button
              type="submit"
              disabled={isLoading}
              size="lg"
              className="otzar-cta-fill h-12 w-full border-0 text-sm font-semibold"
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          {import.meta.env.DEV ? (
            <div className="mt-6 space-y-3 border-t border-[#1e1b4b]/08 pt-4">
              <p className="text-xs text-slate-500">
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
                    className="w-full rounded-xl border border-white/60 bg-white/40 px-3 py-2 text-left text-xs transition-colors hover:bg-white/70"
                  >
                    <div className="font-medium text-slate-800">{account.role}</div>
                    <div className="truncate text-slate-500">{account.email}</div>
                    <div className="text-[10px] text-slate-400">
                      {account.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="relative z-10 mt-8 max-w-sm text-center text-[11px] leading-relaxed text-slate-400">
        Otzar routes work, drafts with you, and only interrupts when something
        truly needs a human decision.
      </p>
    </main>
  );
}
