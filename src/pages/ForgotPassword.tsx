// FILE: ForgotPassword.tsx
// PURPOSE: [PASSWORD-LIFECYCLE] "/forgot-password" — the public
//          logged-out reset request. ENUMERATION-SAFE by design: the
//          page shows the same calm confirmation no matter what email
//          was entered ("If an account exists…"), never reveals whether
//          an account exists, and never sees a token or reset URL. The
//          emailed link opens the existing /activate form (which already
//          handles the PASSWORD_RESET purpose).
// CONNECTS TO: api.auth.forgotPassword, src/pages/Login.tsx (the
//          "Forgot password?" door), src/pages/Activate.tsx (redeem),
//          FND POST /auth/forgot-password.

import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"input" | "sending" | "done">("input");

  async function submit(): Promise<void> {
    if (email.trim().length === 0 || phase === "sending") return;
    setPhase("sending");
    // Enumeration safety is server-side; the UI shows the same calm
    // confirmation regardless of the response (even network failure —
    // revealing an error here would leak nothing useful and confuse).
    await api.auth.forgotPassword(email.trim()).catch(() => undefined);
    setPhase("done");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" data-testid="forgot-password-page">
        <CardHeader>
          <CardTitle className="text-lg">Reset your password</CardTitle>
          <CardDescription data-testid="forgot-password-copy">
            Enter your work email and we'll send reset instructions. Reset
            links expire and can be used once. Admins never see or set your
            password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {phase === "done" ? (
            <p className="text-sm text-muted-foreground" data-testid="forgot-password-done">
              If an account exists for that email, we sent reset
              instructions. Check your inbox — the link expires in about an
              hour.
            </p>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div className="space-y-1">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  data-testid="forgot-password-email"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={phase === "sending"}
                data-testid="forgot-password-submit"
              >
                {phase === "sending" ? "Sending…" : "Send reset instructions"}
              </Button>
            </form>
          )}
          <p className="text-center text-xs text-muted-foreground">
            <Link to="/login" className="underline underline-offset-2" data-testid="forgot-password-back">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
