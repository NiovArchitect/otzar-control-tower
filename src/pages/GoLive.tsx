// FILE: GoLive.tsx
// PURPOSE: [GAP-U SLICE-4] The Go-Live Readiness Gate at /setup/go-live —
//          the launch confidence artifact. Read-only: the same seven GET
//          projections as /setup, one shared facts computation, one
//          deterministic verdict. Balances positive proof (ready signals)
//          with blockers/warnings, keeps founder/operator actions labeled
//          as such, and states on every render that founder-free self-serve
//          onboarding is NOT complete. Never "launch certified", never
//          "production ready", never a fake green light.
// CONNECTS TO: src/lib/setup/go-live-readiness.ts (derivation),
//          src/lib/setup/setup-journey.ts (shared facts), /setup.

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, CircleDashed, Flag, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { SetupInputs } from "@/lib/setup/setup-journey";
import { deriveGoLiveReadiness, type GoLiveItem } from "@/lib/setup/go-live-readiness";

function itemIcon(item: GoLiveItem) {
  if (item.severity === "ready") {
    return <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />;
  }
  if (item.severity === "founder_action") {
    return <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />;
  }
  return <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />;
}

export function GoLivePage() {
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

  const loading = people.isLoading || twins.isLoading || settings.isLoading;
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
  const gate = deriveGoLiveReadiness(inputs);

  return (
    <div className="space-y-6" data-testid="go-live-page">
      <PageHeader
        title="Go-live readiness"
        description="Otzar has checked your setup story from live truth — what's ready, what's blocked, what's worth tidying, and what still involves the Otzar team."
      />
      {loading ? (
        <div className="space-y-3" data-testid="go-live-loading">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <Card data-testid="go-live-verdict">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                {gate.verdictLabel}
              </CardTitle>
              <CardDescription data-testid="go-live-meaning">{gate.meaning}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                data-testid="go-live-next-step"
              >
                <p className="text-sm font-medium">Next: {gate.nextStep.title}</p>
                <Button asChild size="sm" data-testid="go-live-next-link">
                  <Link to={gate.nextStep.to}>
                    {gate.nextStep.linkLabel}
                    <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs" data-testid="go-live-tally">
                <Badge variant="secondary">{gate.readySignals.length} ready</Badge>
                <Badge variant={gate.blockers.length > 0 ? "default" : "outline"}>
                  {gate.blockers.length} blocking
                </Badge>
                <Badge variant="outline">{gate.warnings.length} to tidy</Badge>
                <Badge variant="outline">{gate.founderActions.length} founder actions</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {gate.sections
              .filter((s) => s.items.length > 0)
              .map((section) => (
                <Card key={section.key} data-testid={`go-live-section-${section.key}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{section.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          {itemIcon(item)}
                          <span className="min-w-0">
                            <span
                              className={
                                item.severity === "blocker"
                                  ? "font-medium text-destructive"
                                  : "font-medium text-foreground"
                              }
                            >
                              {item.label}
                            </span>{" "}
                            <span className="text-muted-foreground">{item.whyItMatters}</span>{" "}
                            <Link
                              to={item.repair.to}
                              className="whitespace-nowrap text-foreground underline underline-offset-2"
                            >
                              {item.repair.label}
                            </Link>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
          </div>

          <p className="text-xs text-muted-foreground" data-testid="go-live-limitation">
            {gate.limitation}
          </p>
          <Button asChild variant="outline" size="sm" data-testid="go-live-back-to-setup">
            <Link to="/setup">Back to Organization Setup</Link>
          </Button>
        </>
      )}
    </div>
  );
}
