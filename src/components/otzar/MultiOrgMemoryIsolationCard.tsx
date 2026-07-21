// FILE: MultiOrgMemoryIsolationCard.tsx
// PURPOSE: I-02 — product surface: one user, multiple orgs without blended
//          memory. Shows current org scope, isolation rules, portable vs
//          org-bound honesty, and client switch residual.
// CONNECTS TO: MyMemory, multi-org-memory-isolation.ts, OrgContextBadge,
//          PortableCoreCard, auth store entity.org_entity_id.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, GitBranch, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import {
  I02_DOCTRINE,
  I02_ISOLATION_RULES,
  buildOrgScopedBag,
  multiOrgStatusLabel,
} from "@/lib/work-os/multi-org-memory-isolation";
import { EXPORT_HONESTY } from "@/lib/work-os/portable-core";

export function MultiOrgMemoryIsolationCard(): JSX.Element {
  const entity = useAuthStore((s) => s.entity);
  const orgId =
    entity?.org_entity_id?.trim() ||
    null;
  const orgName = entity?.org_name?.trim() || null;
  const [prefCount, setPrefCount] = useState(0);
  const [orgBoundCount, setOrgBoundCount] = useState(0);
  const [portableCount, setPortableCount] = useState(0);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">(
    "loading",
  );

  // Membership list is single-org until Foundation multi-membership API is
  // continuous; card still proves isolation doctrine + current-org scoping.
  const orgCount = orgId ? 1 : 0;
  const status = multiOrgStatusLabel(orgCount);

  const load = useCallback(async (): Promise<void> => {
    const r = await api.otzar.workStyle.preferences();
    if (!r.ok) {
      setLoadState("error");
      return;
    }
    const bag = buildOrgScopedBag(
      orgId ?? "unknown",
      r.data.preferences ?? [],
    );
    setPrefCount(bag.fingerprints.length);
    setOrgBoundCount(bag.org_bound.length);
    setPortableCount(bag.portable.length);
    setLoadState("ok");
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const scopeLabel = useMemo(() => {
    if (orgName && orgId) return `${orgName}`;
    if (orgId) return "Current organization";
    return "Organization not bound yet";
  }, [orgId, orgName]);

  return (
    <Card
      data-testid="multi-org-memory-isolation-card"
      data-i02="true"
      data-org-id={orgId ?? ""}
      data-org-count={String(orgCount)}
      data-isolation-mode={status.mode}
      data-pref-count={String(prefCount)}
      data-org-bound-count={String(orgBoundCount)}
      data-portable-count={String(portableCount)}
      data-export-available="false"
      data-second-tenant-suite={status.mode === "multi_org" ? "ready" : "residual"}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GitBranch className="h-4 w-4" aria-hidden />
          Multi-org memory isolation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="i02-doctrine">{I02_DOCTRINE}</p>

        <div
          className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
          data-testid="i02-org-scope"
          data-org-id={orgId ?? ""}
        >
          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium text-foreground">
              Memory scope: {scopeLabel}
            </p>
            <p data-testid="i02-status-label">{status.label}</p>
            {orgId ? (
              <p
                className="mt-0.5 font-mono text-[10px] text-muted-foreground"
                data-testid="i02-org-id"
              >
                org {orgId.slice(0, 12)}…
              </p>
            ) : null}
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2" data-testid="i02-rules-list">
          {I02_ISOLATION_RULES.map((rule) => (
            <li
              key={rule.id}
              className="rounded-md border border-border/60 bg-card px-2 py-2"
              data-testid="i02-rule-row"
              data-rule-id={rule.id}
            >
              <p className="font-medium text-foreground">{rule.label}</p>
              <p className="mt-0.5 text-[11px]">{rule.plain}</p>
            </li>
          ))}
        </ul>

        <div
          className="rounded-md border border-border/60 px-2 py-2"
          data-testid="i02-live-counts"
          data-load-state={loadState}
        >
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Shield className="h-3.5 w-3.5" aria-hidden />
            This org&apos;s preference bag
          </p>
          {loadState === "loading" ? (
            <p data-testid="i02-loading">Loading scoped preferences…</p>
          ) : loadState === "error" ? (
            <p data-testid="i02-error">
              Couldn&apos;t load preferences for this org. Isolation rules still
              apply — we never blend across organizations.
            </p>
          ) : (
            <p data-testid="i02-count-summary">
              {prefCount} visible preference
              {prefCount === 1 ? "" : "s"} here · {orgBoundCount} org-bound ·{" "}
              {portableCount} portable methods
            </p>
          )}
        </div>

        <p data-testid="i02-export-honesty" data-export-available="false">
          {EXPORT_HONESTY} Multi-org transfer is never silent copy.
        </p>

        {status.mode === "single_org" ? (
          <p className="text-[11px]" data-testid="i02-single-org-residual">
            This session shows one organization. Continuous second-tenant proof
            runs when multi-org membership credentials are available — the
            product rules above already forbid blend.
          </p>
        ) : (
          <p className="text-[11px]" data-testid="i02-multi-org-ready">
            Multi-org membership detected. Org-bound memory stays in each
            organization; portable methods do not auto-copy.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
