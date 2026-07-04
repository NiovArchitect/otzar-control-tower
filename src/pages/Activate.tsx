// FILE: Activate.tsx
// PURPOSE: [P0-ONBOARD] PUBLIC activation / password-reset page. The invitee
//          opens the one-time link their admin shared (/activate?token=…),
//          sets their own password, and signs in. Expired/used tokens get
//          honest human copy — never a raw error code. The token is read
//          from the URL and posted once; it is never stored client-side.
// CONNECTS TO: api.auth.activate (POST /auth/activate), route "/activate"
//              in App.tsx (outside every auth guard), Login page.

import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

const MIN_PASSWORD_LENGTH = 10;

type Phase =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "done"; purpose: "ACTIVATION" | "PASSWORD_RESET" }
  | { kind: "dead"; message: string }
  | { kind: "error"; message: string };

export function ActivatePage(): JSX.Element {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "form" });

  const mismatch = confirm.length > 0 && password !== confirm;
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit =
    phase.kind === "form" &&
    token.length > 0 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirm;

  async function submit(): Promise<void> {
    setPhase({ kind: "submitting" });
    const r = await api.auth.activate(token, password);
    if (r.ok) {
      setPhase({ kind: "done", purpose: r.data.purpose });
      return;
    }
    if (r.code === "TOKEN_EXPIRED" || r.code === "TOKEN_USED" || r.code === "TOKEN_INVALID") {
      setPhase({
        kind: "dead",
        message:
          "This link has expired or was already used. Ask your administrator for a new one.",
      });
      return;
    }
    setPhase({ kind: "error", message: r.message || "Something went wrong. Try again." });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" data-testid="activate-page">
        {phase.kind === "done" ? (
          <>
            <CardHeader>
              <CardTitle className="text-base" data-testid="activate-success">
                {phase.purpose === "ACTIVATION"
                  ? "Your account is ready"
                  : "Your password is updated"}
              </CardTitle>
              <CardDescription>
                Sign in with your email and the password you just set.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild data-testid="activate-go-login">
                <Link to="/login">Go to sign in</Link>
              </Button>
            </CardContent>
          </>
        ) : phase.kind === "dead" ? (
          <>
            <CardHeader>
              <CardTitle className="text-base">This link no longer works</CardTitle>
              <CardDescription data-testid="activate-dead">{phase.message}</CardDescription>
            </CardHeader>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-base">Set your password</CardTitle>
              <CardDescription>
                {token.length === 0
                  ? "This page needs the activation link your administrator shared with you."
                  : "Choose the password you'll use to sign in to Otzar."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="activate-password">New password</Label>
                <Input
                  id="activate-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="activate-password"
                />
                {tooShort ? (
                  <p className="text-xs text-muted-foreground">
                    At least {MIN_PASSWORD_LENGTH} characters.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor="activate-confirm">Confirm password</Label>
                <Input
                  id="activate-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  data-testid="activate-confirm"
                />
                {mismatch ? (
                  <p className="text-xs text-destructive">Passwords don&apos;t match.</p>
                ) : null}
              </div>
              {phase.kind === "error" ? (
                <p className="text-xs text-destructive" data-testid="activate-error">
                  {phase.message}
                </p>
              ) : null}
              <Button
                disabled={!canSubmit}
                onClick={() => void submit()}
                data-testid="activate-submit"
              >
                {phase.kind === "submitting" ? "Setting password…" : "Set password"}
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
