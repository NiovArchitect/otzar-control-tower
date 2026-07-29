// FILE: DemoPersonaLauncher.tsx
// PURPOSE: Public Y Combinator Labs demo persona launcher.
//          Calm ordered review journey - not a spider map.
//          Server issues short-lived sessions; no passwords in the page.
// CONNECTS TO: Foundation GET/POST /api/v1/demo/yc-labs/*, auth store,
//              demo-persona-value (story order + role benefits).

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deriveCapabilities, useAuthStore } from "@/lib/stores/auth";
import { conversationScopeId } from "@/lib/auth/org-switch";
import { bindConversationScope } from "@/lib/work-os/conversation-store";
import { resetWalkthroughForDemoLaunch } from "@/lib/first-use/state";
import {
  DEMO_PERSONA_GROUPS,
  demoPersonaValueFor,
  demoRoleBanner,
  orderPersonasForStory,
  sanitizeDemoFacingCopy,
} from "@/lib/demo/demo-persona-value";

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
  /** Preferred immersive orientation (no banned words). */
  orientation_notice?: string;
  /** Legacy field - sanitized client-side if present. */
  fictional_notice?: string;
  personas?: PersonaCard[];
  code?: string;
  message?: string;
}

const PROCESS_RAIL = [
  "Leadership",
  "Review",
  "Diligence",
  "Coordination",
  "Contributors",
] as const;

/**
 * WHAT: Public demo entry - ordered persona groups + passwordless launch.
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

  const ordered = useMemo(
    () => orderPersonasForStory(data?.personas ?? []),
    [data?.personas],
  );

  const byKey = useMemo(() => {
    const m = new Map<string, PersonaCard>();
    for (const p of ordered) m.set(p.key, p);
    return m;
  }, [ordered]);

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
      const demoEmail = persona?.key
        ? `${persona.key}@demo.local`
        : "demo@local";
      const banner =
        demoRoleBanner(persona?.role_title) ||
        sanitizeDemoFacingCopy(json.banner ?? "");
      sessionStorage.setItem("otzar_demo_banner", banner);
      sessionStorage.setItem("otzar_demo_persona_key", personaKey);
      // Always start walkthrough at step 1 for a clean persona launch.
      resetWalkthroughForDemoLaunch(demoEmail);
      useAuthStore.setState({
        token: json.token,
        entity: {
          email: demoEmail,
          org_entity_id: null,
          org_name: "Y Combinator Labs",
        },
        capabilities: deriveCapabilities(
          json.allowed_operations ?? ["read", "write"],
        ),
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

  // Prefer Foundation orientation_notice. Never surface legacy fictional_notice
  // (even sanitized) — it leaves awkward residual demo-framing copy.
  const DEFAULT_ORIENTATION =
    "See how Otzar turns an application-review conversation into coordinated work, AI-Teammate collaboration, human judgment, and a management result.";
  const orientationRaw = data?.orientation_notice?.trim() || "";
  const orientation =
    orientationRaw.length > 0 && !/\bfictional\b/i.test(orientationRaw)
      ? sanitizeDemoFacingCopy(orientationRaw)
      : DEFAULT_ORIENTATION;

  return (
    <div
      className="min-h-screen bg-background px-4 py-10"
      data-testid="demo-persona-launcher"
    >
      <div className="mx-auto max-w-3xl space-y-7">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Y Combinator Labs
          </p>
          <h1
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
            data-testid="demo-welcome-title"
          >
            {data?.welcome_title ?? "Otzar application review"}
          </h1>
          <p
            className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground"
            data-testid="demo-orientation"
          >
            {orientation}
          </p>
          {/* Calm process rail - not a spider diagram */}
          <nav
            aria-label="Review journey"
            className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-1.5 pt-1"
            data-testid="demo-process-rail"
          >
            {PROCESS_RAIL.map((label, i) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                {i > 0 ? (
                  <span
                    className="text-[10px] text-indigo-300"
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
                <span className="rounded-full border border-indigo-100 bg-indigo-50/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-800">
                  {label}
                </span>
              </span>
            ))}
          </nav>
          <p className="text-[11px] text-muted-foreground">
            Follow one application review across leadership, specialists,
            coordination, and external support. Switch roles anytime.
          </p>
        </header>

        {loading && (
          <p className="text-center text-sm text-muted-foreground">
            Loading roles…
          </p>
        )}
        {error && (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
            data-testid="demo-launcher-error"
          >
            {error}
          </p>
        )}

        <div className="space-y-6" data-testid="demo-persona-groups">
          {DEMO_PERSONA_GROUPS.map((group) => {
            const cards = group.keys
              .map((k) => byKey.get(k))
              .filter((p): p is PersonaCard => p !== undefined);
            if (cards.length === 0) return null;
            return (
              <section
                key={group.id}
                className="space-y-2"
                data-testid={`demo-persona-group-${group.id}`}
              >
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {group.label}
                </h2>
                <div
                  className={
                    cards.length > 1
                      ? "grid gap-3 sm:grid-cols-2"
                      : "grid gap-3"
                  }
                >
                  {cards.map((p) => {
                    const value = demoPersonaValueFor(p.key);
                    return (
                      <Card
                        key={p.key}
                        className="border-slate-200/80 shadow-sm"
                        data-testid={`demo-persona-card-${p.key}`}
                      >
                        <CardContent className="space-y-3 p-4">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">
                              {p.role_title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {p.display_name}
                            </p>
                          </div>
                          <p
                            className="text-sm leading-snug text-slate-700"
                            data-testid={`demo-persona-value-preview-${p.key}`}
                          >
                            {value.launcherBenefit}
                          </p>
                          <Button
                            className="w-full"
                            disabled={launching !== null}
                            onClick={() => void launch(p.key)}
                            data-testid={`demo-launch-${p.key}`}
                          >
                            {launching === p.key
                              ? "Starting…"
                              : `View as ${p.role_title}`}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Any API personas not in the story groups (defensive). */}
        {ordered.some(
          (p) => !DEMO_PERSONA_GROUPS.some((g) => g.keys.includes(p.key)),
        ) ? (
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Other roles
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {ordered
                .filter(
                  (p) =>
                    !DEMO_PERSONA_GROUPS.some((g) => g.keys.includes(p.key)),
                )
                .map((p) => (
                  <Card key={p.key} data-testid={`demo-persona-card-${p.key}`}>
                    <CardContent className="space-y-3 p-4">
                      <p className="text-sm font-medium">{p.role_title}</p>
                      <Button
                        className="w-full"
                        disabled={launching !== null}
                        onClick={() => void launch(p.key)}
                        data-testid={`demo-launch-${p.key}`}
                      >
                        View as {p.role_title}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
