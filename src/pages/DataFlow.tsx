// FILE: DataFlow.tsx
// PURPOSE: [GAP-U SLICE-3] "How your data flows" — the per-source trust
//          panel at /setup/data-flow. Read-only: ONE live GET (connector
//          OAuth status) merged with the static capability truth in
//          data-flow.ts. Answers, per source, the questions a company asks
//          before trusting Otzar: what gets pulled, what gets pushed,
//          where it lands, who owns it, who sees it, what's retained, and
//          what isn't built yet — in calm enterprise language, never
//          lineage jargon, never overclaimed.
// CONNECTS TO: src/lib/setup/data-flow.ts (derivation), /setup (Tools &
//          data + Governance cards link here), /retention (lifecycle).

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { deriveDataFlows, type DataFlowRow } from "@/lib/setup/data-flow";

function statusBadge(row: DataFlowRow) {
  const variant =
    row.statusKind === "active"
      ? ("secondary" as const)
      : row.statusKind === "attention"
        ? ("default" as const)
        : ("outline" as const);
  return (
    <Badge variant={variant} data-testid={`dataflow-status-${row.key}`}>
      {row.status}
    </Badge>
  );
}

const FIELDS: Array<{ label: string; get: (r: DataFlowRow) => string }> = [
  { label: "What Otzar pulls", get: (r) => r.pulls },
  { label: "What Otzar pushes back", get: (r) => r.pushes },
  { label: "Where it lands", get: (r) => r.lands },
  { label: "Who owns it", get: (r) => r.ownership },
  { label: "Who can see it", get: (r) => r.visibility },
  { label: "Retention", get: (r) => r.retention },
];

export function DataFlowPage() {
  const connectors = useQuery({
    queryKey: ["connectors", "oauth-status"],
    queryFn: async () => {
      const r = await api.otzar.oauthStatus();
      return r.ok ? r.data.providers : null;
    },
  });

  const rows = deriveDataFlows(connectors.data ?? null);

  return (
    <div className="space-y-6" data-testid="data-flow-page">
      <PageHeader
        title="How your data flows"
        description="Per source: what Otzar pulls, what it pushes back, where the data lands, who owns it, and who can see it — stated plainly, including what isn't built yet."
      />
      <p className="text-xs text-muted-foreground" data-testid="dataflow-doctrine">
        The standing rule: company work data stays company-owned and is never
        portable with an employee. An employee can take the shape of how they
        work — they cannot take the company's work.
      </p>

      {connectors.isLoading ? (
        <div className="space-y-3" data-testid="dataflow-loading">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.key} data-testid={`dataflow-row-${row.key}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm">{row.name}</CardTitle>
                  {statusBadge(row)}
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {FIELDS.map((f) => (
                  <p key={f.label} className="text-xs">
                    <span className="font-medium text-foreground">{f.label}: </span>
                    <span className="text-muted-foreground">{f.get(row)}</span>
                  </p>
                ))}
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 px-2 text-xs"
                  data-testid={`dataflow-repair-${row.key}`}
                >
                  <Link to={row.repair.to}>
                    {row.repair.label}
                    <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm" data-testid="dataflow-retention-link">
          <Link to="/retention">Retention & lifecycle details</Link>
        </Button>
        <Button asChild variant="outline" size="sm" data-testid="dataflow-back-to-setup">
          <Link to="/setup">Back to Organization Setup</Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground" data-testid="dataflow-honesty-note">
        This page reads live connection status and states only what the
        product does today. Nothing here changes your data or your
        connections.
      </p>
    </div>
  );
}
