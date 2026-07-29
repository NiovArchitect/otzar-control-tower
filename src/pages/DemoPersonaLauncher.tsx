// FILE: DemoPersonaLauncher.tsx
// PURPOSE: Public Y Combinator Labs demo persona launcher. Server issues
//          short-lived sessions — no passwords in this page, HTML, or JS.
// CONNECTS TO: Foundation GET/POST /api/v1/demo/yc-labs/*, auth store.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deriveCapabilities, useAuthStore } from "@/lib/stores/auth";
import { conversationScopeId } from "@/lib/auth/org-switch";
import { bindConversationScope } from "@/lib/work-os/conversation-store";

const API_BASE =
  (import.meta.env.VITE_FOUNDATION_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) || "https://api.otzar.ai";

interface PersonaCard {
  key: string;
  display_name: string;
  role_title: string;
  card_blurb: string;
  relationship: string;
}

interface PersonaListResponse {
  ok: boolean;
  welcome_title?: string;
  welcome_subtitle?: string;
  fictional_notice?: string;
  personas?: PersonaCard[];
  code?: string;
  message?: string;
}

/**
 * WHAT: Public demo entry — list personas and launch passwordless sessions.
 * INPUT: none (uses Foundation demo routes when enabled).
 * OUTPUT: navigates to /app after session mint.
 */
export function DemoPersonaLauncherPage(): JSX.Element {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PersonaListResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/demo/yc-labs/personas`);
        const json = (await res.json()) as PersonaListResponse;
        if (!cancelled) {
          setData(json);
          if (!json.ok) {
            setError(
              json.message ||
                "Demo persona launcher is not enabled on this environment.",
            );
          }
        }
      } catch {
        if (!cancelled) {
          setError("Could not reach the demo launcher. Try again shortly.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function launch(personaKey: string): Promise<void> {
    setLaunching(personaKey);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/demo/yc-labs/persona-session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona_key: personaKey }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        token?: string;
        session_id?: string;
        allowed_operations?: string[];
        persona?: { display_name: string; role_title: string; key: string };
        banner?: string;
        message?: string;
      };
      if (!json.ok || !json.token) {
        setError(json.message || "Could not start this demo session.");
        setLaunching(null);
        return;
      }
      const persona = json.persona;
      sessionStorage.setItem(
        "otzar_demo_banner",
        json.banner ||
          `Fictional Y Combinator Labs demo · Viewing as ${persona?.role_title ?? "demo"}`,
      );
      sessionStorage.setItem("otzar_demo_persona_key", personaKey);
      useAuthStore.setState({
        token: json.token,
        entity: {
          email: persona?.display_name
            ? `${persona.key}@demo.local`
            : "demo@local",
          org_entity_id: null,
          org_name: "Y Combinator Labs",
        },
        capabilities: deriveCapabilities(json.allowed_operations ?? ["read", "write"]),
        isAuthenticated: true,
        isLoading: false,
        loginError: null,
      });
      bindConversationScope(
        conversationScopeId(json.session_id ?? personaKey, null),
      );
      navigate("/app", { replace: true });
    } catch {
      setError("Network error starting demo session.");
      setLaunching(null);
    }
  }

  return (
    <div
      className="min-h-screen bg-background px-4 py-10"
      data-testid="demo-persona-launcher"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Otzar · Y Combinator Labs
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {data?.welcome_title ?? "Welcome, Y Combinator"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {data?.welcome_subtitle ??
              "Explore how Otzar changes with responsibility and authority."}
          </p>
          <p
            className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
            data-testid="demo-fictional-notice"
          >
            {data?.fictional_notice ??
              "Fictional Y Combinator Labs demo · HelioGrid is a fictional startup used to demonstrate Otzar’s application-review workflow."}
          </p>
        </header>

        {loading && (
          <p className="text-center text-sm text-muted-foreground">Loading roles…</p>
        )}
        {error && (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            data-testid="demo-launcher-error"
          >
            {error}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {(data?.personas ?? []).map((p) => (
            <Card key={p.key} data-testid={`demo-persona-card-${p.key}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.role_title}</CardTitle>
                <p className="text-xs text-muted-foreground">{p.display_name}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{p.card_blurb}</p>
                <Button
                  className="w-full"
                  disabled={launching !== null}
                  onClick={() => void launch(p.key)}
                  data-testid={`demo-launch-${p.key}`}
                >
                  {launching === p.key ? "Starting…" : "View as this role"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Sessions are short-lived and server-issued. Passwords are never shown
          in this interface.
        </p>
      </div>
    </div>
  );
}
