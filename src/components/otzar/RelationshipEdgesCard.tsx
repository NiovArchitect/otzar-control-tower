// FILE: RelationshipEdgesCard.tsx
// PURPOSE: F-03 — product surface for relationship edge kinds: solid
//          reporting, contractor sponsor, executive without manager,
//          matrix/dotted-line hints.
// CONNECTS TO: Users HierarchyEditor, relationship-edges.ts.

import { GitBranch, UserCheck, Crown, AlertCircle, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  F03_DOCTRINE,
  F03_DOTTED_LINE_HONESTY,
  RELATIONSHIP_EDGE_KINDS,
  type RelationshipInventory,
} from "@/lib/org/relationship-edges";

const ICONS: Record<string, JSX.Element> = {
  solid_reporting: <GitBranch className="h-3.5 w-3.5" aria-hidden />,
  contractor_sponsor: <UserCheck className="h-3.5 w-3.5" aria-hidden />,
  executive_no_manager: <Crown className="h-3.5 w-3.5" aria-hidden />,
  needs_manager: <AlertCircle className="h-3.5 w-3.5" aria-hidden />,
  dotted_line_hint: <Share2 className="h-3.5 w-3.5" aria-hidden />,
};

export function RelationshipEdgesCard({
  inventory,
}: {
  inventory: RelationshipInventory | null;
}): JSX.Element {
  return (
    <Card
      data-testid="relationship-edges-card"
      data-f03="true"
      data-exec-no-mgr={String(inventory?.executives_without_manager ?? 0)}
      data-contractor-sponsors={String(inventory?.contractor_sponsors ?? 0)}
      data-needs-manager={String(inventory?.needs_manager ?? 0)}
      data-solid={String(inventory?.solid_reporting ?? 0)}
      data-matrix-hints={String(inventory?.matrix_hint_count ?? 0)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GitBranch className="h-4 w-4" aria-hidden />
          Relationship edges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="f03-doctrine">{F03_DOCTRINE}</p>
        <p data-testid="f03-dotted-honesty">{F03_DOTTED_LINE_HONESTY}</p>
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="f03-kind-list">
          {RELATIONSHIP_EDGE_KINDS.map((k) => {
            const count = inventory?.by_kind[k.id] ?? 0;
            return (
              <li
                key={k.id}
                className="rounded-md border border-border/60 bg-card px-2 py-2"
                data-testid="f03-kind-row"
                data-kind={k.id}
                data-count={String(count)}
                data-primary-reporting={k.is_primary_reporting ? "true" : "false"}
              >
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  {ICONS[k.id]}
                  {k.label}
                  <span className="ml-auto text-[10px] font-normal text-muted-foreground">
                    {count}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px]">{k.plain}</p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
