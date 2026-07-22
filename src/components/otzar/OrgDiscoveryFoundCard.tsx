// FILE: OrgDiscoveryFoundCard.tsx
// PURPOSE: Human-facing "Otzar found" surface for Organization setup.
//          Surfaces Dandelion discovery counts without asking the admin
//          to "run seeding" or operate a separate product.
// CONNECTS TO: org-discovery.ts, OrgSetup, /organization-seeding.

import { Link } from "react-router-dom";
import { ArrowRight, Check, CircleDashed, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OrgDiscoveryView } from "@/lib/setup/org-discovery";

interface Props {
  discovery: OrgDiscoveryView;
  /** Optional: refresh structure signals (syncFromGrowth). */
  onRefreshSignals?: () => void;
  refreshBusy?: boolean;
}

export function OrgDiscoveryFoundCard({
  discovery,
  onRefreshSignals,
  refreshBusy = false,
}: Props): JSX.Element {
  return (
    <Card data-testid="org-discovery-found">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-indigo-500" aria-hidden />
          Otzar found
        </CardTitle>
        <CardDescription className="text-xs">
          Discoveries from your people, structure, and real work. Confirm what
          needs a human decision — nothing applies automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!discovery.available ? (
          <p className="text-sm text-muted-foreground" data-testid="org-discovery-unavailable">
            {discovery.emptyNote ?? "Loading discoveries…"}
          </p>
        ) : discovery.findings.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="org-discovery-empty">
            {discovery.emptyNote}
          </p>
        ) : (
          <ul className="space-y-2" data-testid="org-discovery-findings">
            {discovery.findings.map((f) => (
              <li key={f.id} className="flex items-start gap-2 text-sm">
                {f.kind === "ok" ? (
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
                <span>
                  <span
                    className={
                      f.kind === "review"
                        ? "font-medium text-foreground"
                        : "text-foreground"
                    }
                  >
                    {f.label}
                  </span>
                  {f.detail !== undefined ? (
                    <span className="block text-xs text-muted-foreground">
                      {f.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {discovery.reviewCta !== null ? (
            <Button asChild size="sm" data-testid="org-discovery-review-cta">
              <Link to={discovery.reviewCta.to}>
                {discovery.reviewCta.label}
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" data-testid="org-discovery-open-review">
              <Link to="/organization-seeding">
                Open discovery review
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          )}
          {onRefreshSignals !== undefined ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              disabled={refreshBusy}
              data-testid="org-discovery-refresh"
              onClick={onRefreshSignals}
            >
              {refreshBusy ? "Scanning…" : "Refresh structure signals"}
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Full confirm / hold / correct actions stay available in the review
          queue — same intelligence, calmer surface.
        </p>
      </CardContent>
    </Card>
  );
}
