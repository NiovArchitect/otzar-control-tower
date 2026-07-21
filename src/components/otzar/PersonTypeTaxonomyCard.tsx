// FILE: PersonTypeTaxonomyCard.tsx
// PURPOSE: E-03 — product surface for employee/contractor/vendor/customer
//          distinction + participation ≠ authority doctrine.
// CONNECTS TO: Users, Collaboration, person-type-taxonomy.ts.

import { Users, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  E03_DOCTRINE,
  PARTICIPATION_NEQ_AUTHORITY,
  PERSON_TYPES,
  type PersonTypeInventory,
} from "@/lib/org/person-type-taxonomy";

export function PersonTypeTaxonomyCard({
  inventory,
  variant = "admin",
}: {
  inventory: PersonTypeInventory | null;
  variant?: "admin" | "employee";
}): JSX.Element {
  return (
    <Card
      data-testid="person-type-taxonomy-card"
      data-e03="true"
      data-variant={variant}
      data-participation-implies-authority="false"
      data-multi-type={inventory?.multi_type ? "true" : "false"}
      data-types-present={(inventory?.types_present ?? []).join(",")}
      data-total={String(inventory?.total ?? 0)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" aria-hidden />
          Person types
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="e03-doctrine">{E03_DOCTRINE}</p>
        <p
          className="flex items-start gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
          data-testid="e03-participation-neq-authority"
        >
          <ShieldOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{PARTICIPATION_NEQ_AUTHORITY}</span>
        </p>
        <ul className="grid gap-2 sm:grid-cols-2" data-testid="e03-type-list">
          {PERSON_TYPES.map((t) => {
            const count = inventory?.by_type[t.id] ?? 0;
            return (
              <li
                key={t.id}
                className="rounded-md border border-border/60 bg-card px-2 py-2"
                data-testid="e03-type-row"
                data-person-type={t.id}
                data-count={String(count)}
              >
                <p className="font-medium text-foreground">
                  {t.label}
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                    {count}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px]">{t.plain}</p>
              </li>
            );
          })}
        </ul>
        {variant === "employee" ? (
          <p className="text-[11px]" data-testid="e03-employee-note">
            You see people you can work with. Their type is for routing honesty —
            it never unlocks their (or your) permissions.
          </p>
        ) : (
          <p className="text-[11px]" data-testid="e03-admin-note">
            Counts are inferred from role and department labels. Set clear titles
            (e.g. Contractor, Vendor contact) so Otzar classifies people correctly.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
