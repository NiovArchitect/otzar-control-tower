// FILE: MeetOperationalResidualCard.tsx
// PURPOSE: N-02 — honest residual surface for Meet operational transcripts
//          while EXTERNALLY_BLOCKED pending operator OAuth.
// CONNECTS TO: Comms, ConnectorHealth, meet-operational-residual.ts.

import { Link } from "react-router-dom";
import { AlertTriangle, Unplug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  N02_DOCTRINE,
  N02_OPERATOR_STEPS,
  N02_RESIDUAL_COPY,
  N02_STATUS,
  meetModeLabel,
  resolveMeetOperationalMode,
} from "@/lib/work-os/meet-operational-residual";

export function MeetOperationalResidualCard({
  needsReconnect = false,
  providerProven = false,
  variant = "comms",
}: {
  needsReconnect?: boolean;
  /** Only true when continuous ambient Meet proof has passed — rare. */
  providerProven?: boolean;
  variant?: "comms" | "tools";
}): JSX.Element {
  const mode = resolveMeetOperationalMode({ needsReconnect, providerProven });
  const blocked = mode !== "provider_proven";

  return (
    <Card
      data-testid="meet-operational-residual-card"
      data-n02="true"
      data-n02-status={N02_STATUS}
      data-meet-mode={mode}
      data-provider-proven={providerProven ? "true" : "false"}
      data-needs-reconnect={needsReconnect ? "true" : "false"}
      data-variant={variant}
      className={
        blocked
          ? "border-amber-400/50 bg-amber-500/5"
          : "border-border/60"
      }
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Unplug className="h-4 w-4" aria-hidden />
          Google Meet operational residual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="n02-doctrine">{N02_DOCTRINE}</p>

        <div
          className="flex items-start gap-2 rounded-md border border-border/60 bg-background/60 px-2 py-1.5"
          data-testid="n02-mode-banner"
          data-meet-mode={mode}
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden />
          <div>
            <p className="font-medium text-foreground" data-testid="n02-mode-label">
              {meetModeLabel(mode)}
            </p>
            <p data-testid="n02-status-code">Status: {N02_STATUS}</p>
          </div>
        </div>

        <ol className="grid gap-1.5 sm:grid-cols-2" data-testid="n02-operator-steps">
          {N02_OPERATOR_STEPS.map((s, i) => (
            <li
              key={s.id}
              className="rounded-md border border-border/50 px-2 py-1.5"
              data-testid="n02-operator-step"
              data-step-id={s.id}
              data-step-order={String(i + 1)}
            >
              <span className="font-medium text-foreground">
                {i + 1}. {s.label}
              </span>
              <span> — {s.plain}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" data-testid="n02-open-tools">
            <Link to="/app/connector-health?need=reconnect&from=n02">
              Open Tools reconnect
            </Link>
          </Button>
          {variant === "comms" ? (
            <Button asChild size="sm" variant="ghost" data-testid="n02-paste-fallback-hint">
              <Link to="/app/comms">Paste fallback on Comms</Link>
            </Button>
          ) : null}
        </div>

        <p data-testid="n02-residual-copy" data-externally-blocked="true">
          {N02_RESIDUAL_COPY}
        </p>
      </CardContent>
    </Card>
  );
}
