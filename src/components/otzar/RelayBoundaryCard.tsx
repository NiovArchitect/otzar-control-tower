// FILE: RelayBoundaryCard.tsx
// PURPOSE: T-01 — product surface: Relay stays separate from CT employee shell.
// CONNECTS TO: Comms, CompanyProfile, relay-boundary.ts.

import { MessageSquareOff, Split } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CT_EMPLOYEE_SHELL_LABEL,
  RELAY_BOUNDARY_RULES,
  RELAY_ROADMAP_LABEL,
  T01_DOCTRINE,
  T01_RELAY_APP_RESIDUAL,
} from "@/lib/work-os/relay-boundary";

export function RelayBoundaryCard({
  variant = "employee",
}: {
  variant?: "admin" | "employee";
}): JSX.Element {
  return (
    <Card
      data-testid="relay-boundary-card"
      data-t01="true"
      data-variant={variant}
      data-relay-app-shipped="false"
      data-ct-is-relay="false"
      data-boundary-preserved="true"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Split className="h-4 w-4" aria-hidden />
          Relay boundary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="t01-doctrine">{T01_DOCTRINE}</p>

        <div className="grid gap-2 sm:grid-cols-2" data-testid="t01-product-split">
          <div
            className="rounded-md border border-border/60 bg-card px-2 py-2"
            data-testid="t01-ct-shell"
            data-product="control_tower"
          >
            <p className="font-medium text-foreground">{CT_EMPLOYEE_SHELL_LABEL}</p>
            <p className="mt-0.5 text-[11px]">
              Today, Talk, Needs me, People, Memory — ambient Work OS. Comms
              captures meetings/sources under governance.
            </p>
          </div>
          <div
            className="rounded-md border border-border/60 bg-card px-2 py-2"
            data-testid="t01-relay-roadmap"
            data-product="relay"
          >
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <MessageSquareOff className="h-3.5 w-3.5" aria-hidden />
              {RELAY_ROADMAP_LABEL}
            </p>
            <p className="mt-0.5 text-[11px]">
              Real-time messaging product path — not a CT nav item, not a
              channel maze inside this shell.
            </p>
          </div>
        </div>

        <ul className="grid gap-1.5 sm:grid-cols-2" data-testid="t01-rules-list">
          {RELAY_BOUNDARY_RULES.map((r) => (
            <li
              key={r.id}
              className="rounded-md border border-border/50 px-2 py-1.5"
              data-testid="t01-rule-row"
              data-rule-id={r.id}
            >
              <span className="font-medium text-foreground">{r.label}</span>
              <span> — {r.plain}</span>
            </li>
          ))}
        </ul>

        <p data-testid="t01-relay-residual" data-relay-app="residual">
          {T01_RELAY_APP_RESIDUAL}
        </p>

        {variant === "admin" ? (
          <p className="text-[11px]" data-testid="t01-admin-note">
            Admins configure org policy and tools here. Do not rebrand Control
            Tower employee paths as Relay, and do not park Relay IA inside CT.
          </p>
        ) : (
          <p className="text-[11px]" data-testid="t01-employee-note">
            You are in the Work OS shell. Meeting capture on Comms is not Relay
            chat — when Relay ships, it will be a separate product.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
