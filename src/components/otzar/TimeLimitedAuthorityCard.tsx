// FILE: TimeLimitedAuthorityCard.tsx
// PURPOSE: M-02 — product surface for multi-class time-limited authority:
//          one-time / session / project / time-boxed; revoke; transparent reason.
// CONNECTS TO: AuthorityGrants, time-limited-authority.ts.

import { Clock, KeyRound, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DURATION_CLASS_CATALOG,
  INDEFINITE_NOT_UNLIMITED,
  REVOCATION_COPY,
  TRANSPARENT_REASON_COPY,
  type GrantInventorySummary,
} from "@/lib/work-os/time-limited-authority";

export function TimeLimitedAuthorityCard({
  inventory,
}: {
  inventory?: GrantInventorySummary | null;
}): JSX.Element {
  const timeLimited = DURATION_CLASS_CATALOG.filter((d) => d.time_limited);
  const openEnded = DURATION_CLASS_CATALOG.filter((d) => !d.time_limited);

  return (
    <Card
      data-testid="time-limited-authority-card"
      data-m02="true"
      data-duration-class-count={String(DURATION_CLASS_CATALOG.length)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4" aria-hidden />
          Time-limited authority classes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="m02-reason-copy">{TRANSPARENT_REASON_COPY}</p>
        <p
          className="flex items-start gap-1.5"
          data-testid="m02-revocation-copy"
        >
          <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{REVOCATION_COPY}</span>
        </p>
        <p data-testid="m02-indefinite-honesty">{INDEFINITE_NOT_UNLIMITED}</p>

        <div className="grid gap-2 sm:grid-cols-2">
          <div data-testid="m02-time-limited-list">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Time-limited ({timeLimited.length})
            </p>
            <ul className="mt-1 space-y-1">
              {timeLimited.map((d) => (
                <li
                  key={d.id}
                  data-testid="m02-duration-class"
                  data-duration-class={d.id}
                  data-time-limited="true"
                  data-family={d.family}
                >
                  <span className="font-medium text-foreground">{d.label}</span>
                  {" — "}
                  {d.plain}
                </li>
              ))}
            </ul>
          </div>
          <div data-testid="m02-open-ended-list">
            <p className="font-medium text-foreground">
              Open-ended but revocable ({openEnded.length})
            </p>
            <ul className="mt-1 space-y-1">
              {openEnded.map((d) => (
                <li
                  key={d.id}
                  data-testid="m02-duration-class"
                  data-duration-class={d.id}
                  data-time-limited="false"
                  data-family={d.family}
                >
                  <span className="font-medium text-foreground">{d.label}</span>
                  {" — "}
                  {d.plain}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {inventory && inventory.total > 0 ? (
          <p
            className="border-t border-border pt-2 text-[11px]"
            data-testid="m02-inventory"
            data-grant-total={String(inventory.total)}
            data-time-limited-count={String(inventory.time_limited_count)}
            data-revocable-count={String(inventory.revocable_count)}
            data-classes={inventory.duration_classes_present.join(",")}
          >
            Active inventory: {inventory.total} grant
            {inventory.total === 1 ? "" : "s"} · {inventory.time_limited_count}{" "}
            time-limited · {inventory.revocable_count} revocable ·{" "}
            {inventory.purposes_present} with purpose · classes:{" "}
            {inventory.duration_classes_present.join(", ") || "none"}
          </p>
        ) : (
          <p
            className="border-t border-border pt-2 text-[11px]"
            data-testid="m02-inventory-empty"
          >
            No active grants yet — create one below with a clear purpose and
            duration class.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
