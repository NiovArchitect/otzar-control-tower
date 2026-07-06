// FILE: AccountSecurity.tsx
// PURPOSE: [PASSWORD-LIFECYCLE] "/app/account-security" — self-service
//          password change. Requires the CURRENT password (a session
//          alone can't rotate the credential); on success every OTHER
//          device is signed out while this one keeps working (stated
//          plainly). Honest failure copy; passwords never leave this
//          form except to the change endpoint.
// CONNECTS TO: api.auth.changePassword, nav-employee ("Account &
//          Security"), FND POST /auth/change-password.

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function AccountSecurityPage() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(): Promise<void> {
    if (busy) return;
    setResult(null);
    if (next.length < 10) {
      setResult({ ok: false, message: "Your new password must be at least 10 characters." });
      return;
    }
    if (next !== confirm) {
      setResult({ ok: false, message: "The new passwords don't match." });
      return;
    }
    setBusy(true);
    const r = await api.auth.changePassword(current, next);
    setBusy(false);
    if (r.ok && r.data.ok) {
      setCurrent("");
      setNext("");
      setConfirm("");
      setResult({
        ok: true,
        message:
          "Password changed. Any other signed-in devices were signed out; this one stays signed in.",
      });
    } else if (!r.ok && r.code === "CURRENT_PASSWORD_INCORRECT") {
      setResult({ ok: false, message: "Your current password didn't match. Nothing was changed." });
    } else if (!r.ok && r.code === "WEAK_PASSWORD") {
      setResult({ ok: false, message: "Your new password must be at least 10 characters." });
    } else {
      setResult({ ok: false, message: "The password couldn't be changed right now. Nothing was changed — try again." });
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6" data-testid="account-security-page">
      <div>
        <h1 className="text-lg font-semibold">Account &amp; Security</h1>
        <p className="text-sm text-muted-foreground" data-testid="account-security-copy">
          Change your password any time. Admins never see or set your
          password — if you're ever locked out, they can only send you a
          reset link.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4" aria-hidden /> Change password
          </CardTitle>
          <CardDescription className="text-xs">
            Enter your current password, then choose a new one (at least 10
            characters).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                data-testid="security-current-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                data-testid="security-new-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                data-testid="security-confirm-password"
              />
            </div>
            {result !== null ? (
              <p
                className={`text-sm ${result.ok ? "text-emerald-700" : "text-amber-600"}`}
                data-testid="security-result"
                role="status"
              >
                {result.message}
              </p>
            ) : null}
            <Button type="submit" disabled={busy} data-testid="security-submit">
              {busy ? "Changing…" : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
