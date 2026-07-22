// FILE: DandelionProposalClassMatrix.tsx
// PURPOSE: E-01 — show which Dandelion proposal classes are present in the
//          oversight queue (people/roles/managers/teams/projects/externals/tools).
// CONNECTS TO: OrganizationSeeding, dandelion-proposal-classes.ts.

import { Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  E01_DOCTRINE,
  type ProposalClassInventory,
} from "@/lib/work-os/dandelion-proposal-classes";

export function DandelionProposalClassMatrix({
  inventory,
}: {
  inventory: ProposalClassInventory;
}): JSX.Element {
  return (
    <Card
      data-testid="dandelion-proposal-class-matrix"
      data-e01="true"
      data-multi-class={inventory.multi_class ? "true" : "false"}
      data-classes-present={inventory.classes_present.join(",")}
      data-core-present={inventory.core_classes_present.join(",")}
      data-total-seeds={String(inventory.total_seeds)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sprout className="h-4 w-4" aria-hidden />
          What Otzar is proposing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="e01-doctrine">{E01_DOCTRINE}</p>
        <ul
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="e01-class-list"
        >
          {inventory.rows.map((r) => (
            <li
              key={r.id}
              className={`rounded-md border px-2 py-2 ${
                r.present
                  ? "border-emerald-300/50 bg-emerald-500/5"
                  : "border-border/50 bg-muted/20"
              }`}
              data-testid="e01-class-row"
              data-class-id={r.id}
              data-class-present={r.present ? "true" : "false"}
              data-class-count={String(r.count)}
            >
              <p className="font-medium text-foreground">
                {r.label}
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                  {r.present ? `${r.count} open` : "none open"}
                </span>
              </p>
              <p className="mt-0.5 text-[11px]">{r.plain}</p>
            </li>
          ))}
        </ul>
        {inventory.unknown_seed_types.length > 0 ? (
          <p className="text-[11px]" data-testid="e01-unknown-types">
            Additional proposals awaiting classification ({inventory.unknown_seed_types.length}).
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
