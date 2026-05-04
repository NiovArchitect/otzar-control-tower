// FILE: Login.tsx
// PURPOSE: Public credentials screen. On success: shows the
//          audit-aware toast "Audit event logged: LOGIN_SUCCESS" and
//          navigates to /. On failure: surfaces the message from the
//          auth store. The only unguarded screen in the app.
// CONNECTS TO: src/lib/stores/auth.ts, App.tsx /login route.

import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";

export function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isLoading, loginError, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await login(email, password);
    if (result.ok) {
      toast.success("Audit event logged: LOGIN_SUCCESS");
      navigate("/", { replace: true });
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>NIOV Control Tower</CardTitle>
          <CardDescription>
            Sign in with your org-admin credentials. Every action you take is
            audited under the COSMP Protocol.
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
              <Label htmlFor="password">Password</Label>
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
              <p
                role="alert"
                className="text-sm text-destructive"
                aria-live="polite"
              >
                {loginError}
              </p>
            )}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
