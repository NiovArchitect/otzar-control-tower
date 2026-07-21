// FILE: CrossTenantIsolationCard.tsx
// PURPOSE: Q-01 / Q-02 — product surface for cross-tenant / cross-user /
//          cross-Twin zero leakage + deep-link isolation honesty.
// CONNECTS TO: CompanyProfile, MyMemory, cross-tenant-isolation.ts,
//          OrgContextBadge, post-login-destination.

import { useMemo } from "react";
import { ShieldAlert, Link2Off, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth";
import {
  Q01_DOCTRINE,
  Q02_DOCTRINE,
  ZERO_LEAK_FACETS,
  deepLinkIsolationCheck,
  twinScopeIsolated,
  zeroLeakStatusLabel,
} from "@/lib/work-os/cross-tenant-isolation";

export function CrossTenantIsolationCard({
  variant = "employee",
}: {
  variant?: "admin" | "employee";
}): JSX.Element {
  const entity = useAuthStore((s) => s.entity);
  const orgId = entity?.org_entity_id?.trim() || "";
  const email = entity?.email?.trim() || "";
  const orgName = entity?.org_name?.trim() || null;

  const status = zeroLeakStatusLabel({
    hasOrg: orgId.length > 0,
    multiTenantSuite: false,
  });

  const twinScope = useMemo(
    () =>
      twinScopeIsolated({
        userKey: email || "anonymous",
        orgEntityId: orgId || null,
      }),
    [email, orgId],
  );

  const deepLinkSamples = useMemo(() => {
    const samples = [
      { path: "/app/action-center", expect: "allow" as const },
      { path: "/users", expect: "block" as const },
      { path: "/setup/data-flow", expect: "block" as const },
      { path: "/app/my-twin", expect: "allow" as const },
      { path: "/billing", expect: "block" as const },
    ];
    return samples.map((s) => {
      const r = deepLinkIsolationCheck(s.path);
      const ok =
        s.expect === "allow" ? r.allowed : r.blocked_sensitive || !r.allowed;
      return { ...s, ...r, ok };
    });
  }, []);

  const deepLinkOk = deepLinkSamples.every((s) => s.ok);

  return (
    <Card
      data-testid="cross-tenant-isolation-card"
      data-q01="true"
      data-q02="true"
      data-variant={variant}
      data-org-id={orgId}
      data-isolation-mode={status.mode}
      data-twin-scope-ok={twinScope.ok ? "true" : "false"}
      data-deeplink-ok={deepLinkOk ? "true" : "false"}
      data-second-tenant-suite="residual"
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldAlert className="h-4 w-4" aria-hidden />
          Cross-tenant zero leakage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        <p data-testid="q01-doctrine">{Q01_DOCTRINE}</p>
        <p data-testid="q02-doctrine">{Q02_DOCTRINE}</p>

        <div
          className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
          data-testid="q01-org-scope"
          data-org-id={orgId}
        >
          <p className="font-medium text-foreground">
            Active boundary
            {orgName ? `: ${orgName}` : orgId ? "" : ": not bound"}
          </p>
          <p data-testid="q01-status-label">{status.label}</p>
          {orgId ? (
            <p className="mt-0.5 font-mono text-[10px]" data-testid="q01-org-id">
              org {orgId.slice(0, 12)}…
            </p>
          ) : null}
          <p className="mt-1 text-[11px]" data-testid="q02-twin-scope">
            Twin / conversation scope:{" "}
            <span className="font-mono text-[10px] text-foreground">
              {twinScope.scope
                ? `${twinScope.scope.slice(0, 36)}${twinScope.scope.length > 36 ? "…" : ""}`
                : "(unscoped)"}
            </span>
            {" · "}
            {twinScope.ok ? "isolated" : twinScope.reason}
          </p>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2" data-testid="q01-facet-list">
          {ZERO_LEAK_FACETS.map((f) => (
            <li
              key={f.id}
              className="rounded-md border border-border/60 bg-card px-2 py-2"
              data-testid="q01-facet-row"
              data-facet-id={f.id}
            >
              <p className="font-medium text-foreground">{f.label}</p>
              <p className="mt-0.5 text-[11px]">{f.plain}</p>
            </li>
          ))}
        </ul>

        <div
          className="rounded-md border border-border/60 px-2 py-2"
          data-testid="q02-deeplink-panel"
          data-deeplink-ok={deepLinkOk ? "true" : "false"}
        >
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Link2Off className="h-3.5 w-3.5" aria-hidden />
            Deep-link isolation (login restore)
          </p>
          <ul className="mt-1 space-y-0.5" data-testid="q02-deeplink-samples">
            {deepLinkSamples.map((s) => (
              <li
                key={s.path}
                className="flex items-center justify-between gap-2 font-mono text-[10px]"
                data-testid="q02-deeplink-sample"
                data-path={s.path}
                data-expect={s.expect}
                data-allowed={s.allowed ? "true" : "false"}
                data-ok={s.ok ? "true" : "false"}
              >
                <span>{s.path}</span>
                <span className="text-muted-foreground">
                  {s.expect === "allow" ? "may restore" : "blocked"}
                  {s.ok ? " ✓" : " ✗"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {variant === "admin" ? (
          <p className="flex items-start gap-1.5 text-[11px]" data-testid="q01-admin-note">
            <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Admins govern this organization only. Control Tower never surfaces
              another tenant&apos;s people, grants, or Twin configuration here.
            </span>
          </p>
        ) : (
          <p className="text-[11px]" data-testid="q01-employee-note">
            Your wallet and AI Teammate stay inside this organization&apos;s
            boundary. Other people&apos;s private learning never appears on your
            surfaces.
          </p>
        )}

        <p className="text-[11px]" data-testid="q01-suite-residual">
          Continuous multi-tenant credential harness remains for second-org /
          foreign-tenant pressure proofs. Product rules above already fail closed.
        </p>
      </CardContent>
    </Card>
  );
}
