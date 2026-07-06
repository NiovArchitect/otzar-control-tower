// FILE: OrgSetup.tsx
// PURPOSE: [GAP-U SLICE-1] Organization Setup — the read-only setup command
//          center. One calm, guided page that composes EXISTING truth
//          (people, hierarchy, twins, connectors, seeds, analytics,
//          settings) into a repair-oriented journey: what is ready, what is
//          missing, why it matters, and the ONE next best step. Every
//          section links to the existing real fix surface — this page owns
//          no truth, adds no write paths, and never overclaims (bulk
//          import, retention controls, ambient ingestion, and the setup
//          coach are honestly labeled as not available yet).
// CONNECTS TO: src/lib/setup/setup-journey.ts (pure derivation), the seven
//          GET projections via src/lib/api.ts, route /setup + nav
//          "Organization Setup" (Overview group).

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, CircleDashed, Compass } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import {
  deriveSetupJourney,
  type SetupInputs,
  type SetupSection,
} from "@/lib/setup/setup-journey";
import { deriveSetupCoach } from "@/lib/setup/setup-coach";

function stateBadge(section: SetupSection) {
  const variant =
    section.state === "ready"
      ? ("secondary" as const)
      : section.state === "unknown"
        ? ("outline" as const)
        : ("default" as const);
  return (
    <Badge variant={variant} data-testid={`setup-state-${section.key}`}>
      {section.stateLabel}
    </Badge>
  );
}

export function OrgSetupPage() {
  // Seven existing GET projections — nothing else. A failure in any one
  // renders that section's honest "couldn't check" state, never a guess.
  const people = useQuery({
    queryKey: ["org", "entities", "setup"],
    queryFn: async () => {
      const r = await api.org.entities.list({ type: "PERSON", take: 250 });
      return r.ok ? r.data.items : null;
    },
  });
  const hierarchy = useQuery({
    queryKey: ["org", "hierarchy"],
    queryFn: async () => {
      const r = await api.org.hierarchy.get();
      return r.ok ? r.data : null;
    },
  });
  const twins = useQuery({
    queryKey: ["org", "ai-teammates", "setup"],
    queryFn: async () => {
      const r = await api.org.aiTeammates.list({ take: 100 });
      return r.ok ? r.data : null;
    },
  });
  const connectors = useQuery({
    queryKey: ["connectors", "oauth-status"],
    queryFn: async () => {
      const r = await api.otzar.oauthStatus();
      return r.ok ? r.data.providers : null;
    },
  });
  const seeds = useQuery({
    queryKey: ["org", "dandelion", "seeds", "setup"],
    queryFn: async () => {
      const r = await api.otzar.dandelionSeeds.list();
      return r.ok ? r.data.seeds : null;
    },
  });
  const analytics = useQuery({
    queryKey: ["org", "analytics"],
    queryFn: async () => {
      const r = await api.org.analytics();
      return r.ok ? r.data : null;
    },
  });
  const settings = useQuery({
    queryKey: ["org", "settings"],
    queryFn: async () => {
      const r = await api.org.settings.get();
      return r.ok ? r.data.settings : null;
    },
  });

  const loading =
    people.isLoading || twins.isLoading || connectors.isLoading || settings.isLoading;

  const inputs: SetupInputs = {
    people: people.data ?? null,
    memberships: hierarchy.data?.memberships ?? null,
    orgEntityId: hierarchy.data?.org_entity_id ?? null,
    twins: twins.data?.items ?? null,
    twinAutonomyCeiling: twins.data?.twin_autonomy_ceiling ?? null,
    connectors: connectors.data ?? null,
    seeds: seeds.data ?? null,
    analytics: analytics.data ?? null,
    settings: settings.data ?? null,
  };
  const journey = deriveSetupJourney(inputs);
  const coaching = deriveSetupCoach(inputs).slice(0, 3);

  return (
    <div className="space-y-6" data-testid="org-setup-page">
      <PageHeader
        title="Organization Setup"
        description="Let Otzar help you set up your organization safely — what's ready, what's missing, and the one next step that matters."
      />

      {loading ? (
        <div className="space-y-3" data-testid="org-setup-loading">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          {/* Top summary + the ONE next best step. */}
          <Card data-testid="setup-summary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Compass className="h-4 w-4" aria-hidden />
                {journey.summary}
              </CardTitle>
              <CardDescription>
                Otzar starts safely: minimum access first, then capability by
                role, scope by data, authority by policy, and action by
                approval.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                data-testid="setup-next-step"
              >
                <div>
                  <p className="text-sm font-medium">
                    Next: {journey.nextStep.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {journey.nextStep.detail}
                  </p>
                </div>
                <Button asChild size="sm" data-testid="setup-next-step-link">
                  <Link to={journey.nextStep.to}>
                    {journey.nextStep.linkLabel}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* [SLICE-5] the setup coach — Otzar noticing stalls, guiding
              repair. Derived from the same facts (one grouped
              recommendation per issue; disappears when fixed). These are
              setup recommendations, not operational work. */}
          {coaching.length > 0 ? (
            <Card data-testid="setup-coach">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Otzar noticed</CardTitle>
                <CardDescription className="text-xs">
                  Setup recommendations — separate from your team's
                  operational work. Each one disappears once it's fixed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {coaching.map((rec) => (
                    <li key={rec.key} className="flex items-start gap-2 text-xs" data-testid={`setup-coach-${rec.key}`}>
                      <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0">
                        <span className="font-medium text-foreground">{rec.label}</span>{" "}
                        <span className="text-muted-foreground">{rec.whyItMatters}</span>{" "}
                        <Link
                          to={rec.repair.to}
                          className="whitespace-nowrap text-foreground underline underline-offset-2"
                        >
                          {rec.repair.label}
                        </Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {/* The journey — seven calm sections, each with one action. */}
          <div className="grid gap-4 lg:grid-cols-2">
            {journey.sections.map((section) => (
              <Card key={section.key} data-testid={`setup-section-${section.key}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm">{section.title}</CardTitle>
                    {stateBadge(section)}
                  </div>
                  <CardDescription className="text-xs">
                    {section.whyItMatters}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="space-y-1.5">
                    {section.lines.map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        {line.kind === "ok" ? (
                          <Check
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                            aria-hidden
                          />
                        ) : (
                          <CircleDashed
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        )}
                        <span
                          className={
                            line.kind === "action"
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }
                        >
                          {line.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      data-testid={`setup-action-${section.key}`}
                    >
                      <Link to={section.action.to}>
                        {section.action.label}
                        <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                      </Link>
                    </Button>
                    {section.secondaryAction !== undefined ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        data-testid={`setup-secondary-${section.key}`}
                      >
                        <Link to={section.secondaryAction.to}>
                          {section.secondaryAction.label}
                          <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-xs text-muted-foreground" data-testid="setup-golive-pointer">
            Wondering if you can start?{" "}
            <Link to="/setup/go-live" className="font-medium text-foreground underline underline-offset-2">
              Check go-live readiness
            </Link>
            .
          </p>
          <p className="text-xs text-muted-foreground" data-testid="setup-boundaries-pointer">
            Wondering what context Otzar has and how it's governed?{" "}
            <Link to="/setup/context-boundaries" className="font-medium text-foreground underline underline-offset-2">
              See Context Boundaries
            </Link>
            .
          </p>
          <p className="text-xs text-muted-foreground" data-testid="setup-honesty-note">
            This page reads your organization's real state — it never changes
            anything by itself. Some capabilities (bulk import, retention
            controls, automatic email invites) aren't built yet and are
            labeled that way.
          </p>
        </>
      )}
    </div>
  );
}
