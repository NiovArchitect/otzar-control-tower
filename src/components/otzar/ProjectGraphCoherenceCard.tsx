// FILE: ProjectGraphCoherenceCard.tsx
// PURPOSE: J-04 — project graph coherence inventory + disconnect honesty.
// CONNECTS TO: WorkProjects ProjectContextPanel, project-graph.ts.

import { Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  J04_DOCTRINE,
  PROJECT_GRAPH_FACETS,
  type ProjectGraphInventory,
  projectGraphHealth,
} from "@/lib/work-os/project-graph";

export function ProjectGraphCoherenceCard({
  inventory,
}: {
  inventory: ProjectGraphInventory | null;
}): JSX.Element {
  const health = inventory ? projectGraphHealth(inventory) : null;

  return (
    <Card
      data-testid="project-graph-coherence-card"
      data-j04="true"
      data-score={health ? String(health.score) : ""}
      data-ok={health ? (health.ok ? "true" : "false") : ""}
      data-disconnects={health ? String(health.disconnects.length) : "0"}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Network className="h-4 w-4" aria-hidden />
          Mission coverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-muted-foreground">
        <p data-testid="j04-doctrine">{J04_DOCTRINE}</p>
        {!inventory ? (
          <p data-testid="j04-empty">Select a project to see coverage.</p>
        ) : (
          <>
            <p data-testid="j04-score" className="font-medium text-foreground">
              Coverage {Math.round((health?.score ?? 0) * 100)}% ·{" "}
              {health?.ok ? "enough to work from" : "gaps need attention"}
            </p>
            <ul className="grid gap-1 sm:grid-cols-2" data-testid="j04-facet-list">
              {PROJECT_GRAPH_FACETS.map((f) => {
                const fac = inventory.facets[f.id];
                return (
                  <li
                    key={f.id}
                    data-testid="j04-facet-row"
                    data-facet-id={f.id}
                    data-present={fac.present ? "true" : "false"}
                    data-count={String(fac.count)}
                    className="rounded border border-border/40 px-2 py-1"
                  >
                    <span className="font-medium text-foreground">{f.label}</span>
                    {fac.present ? ` · ${fac.count}` : " · empty"}
                  </li>
                );
              })}
            </ul>
            {health && health.disconnects.length > 0 ? (
              <ul data-testid="j04-disconnect-list" className="space-y-1">
                {health.disconnects.map((d) => (
                  <li
                    key={d.code}
                    data-testid="j04-disconnect-row"
                    data-code={d.code}
                    data-severity={d.severity}
                    className="text-amber-900"
                  >
                    {d.severity}: {d.plain}
                  </li>
                ))}
              </ul>
            ) : (
              <p data-testid="j04-no-disconnects">No critical gaps detected.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
