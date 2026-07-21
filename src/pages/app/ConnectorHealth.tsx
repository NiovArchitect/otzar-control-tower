// FILE: ConnectorHealth.tsx
// PURPOSE: Employee tools surface — connect / reconnect calendars, docs, Meet.
//          When Comms (or Today) deep-links with ?need=reconnect, show an honest
//          banner and allow Google providers to re-run OAuth even if catalog
//          still says "Connected" (stale scopes / SCOPE_REAUTH).
// CONNECTS TO: api.otzar.enterpriseTools.*, Comms ambient sync, AmbientToday chip.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Cable,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth";
import { isOrgAdmin } from "@/lib/auth/capabilities";
import {
  CAPABILITY_FIRST_DETAIL,
  CAPABILITY_FIRST_HEADLINE,
} from "@/lib/connectors/capability-first-tools";
import { MeetOperationalResidualCard } from "@/components/otzar/MeetOperationalResidualCard";

type ProviderRow = {
  provider: string;
  label: string;
  oauth_slug: string | null;
  employee_self_serve: boolean;
  status: string;
  status_label: string;
  connect_action: string;
};

type CapabilityRow = {
  capability_id: string;
  label: string;
  description: string;
  category: string;
  status: string;
  status_label: string;
  providers: ProviderRow[];
};

function statusBadge(status: string, label: string): JSX.Element {
  const tone =
    status === "connected"
      ? "text-emerald-700 border-emerald-300/50"
      : status === "ready_to_connect"
        ? "text-sky-700 border-sky-300/50"
        : status === "error_reconnect"
          ? "text-amber-700 border-amber-300/50"
          : "text-muted-foreground";
  return (
    <Badge variant="outline" className={`shrink-0 text-[10px] ${tone}`}>
      {status === "connected" ? (
        <CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden />
      ) : null}
      {label}
    </Badge>
  );
}

function isGoogleish(p: ProviderRow): boolean {
  const s = `${p.provider} ${p.label} ${p.oauth_slug ?? ""}`.toLowerCase();
  return s.includes("google") || s.includes("meet") || s.includes("gmail");
}

export function ConnectorHealth(): JSX.Element {
  const { capabilities: caps } = useAuthStore();
  const admin = isOrgAdmin(caps);
  const [searchParams] = useSearchParams();
  const needReconnect =
    searchParams.get("need") === "reconnect" ||
    searchParams.get("focus") === "reconnect";
  const fromComms = searchParams.get("from") === "comms";

  const [headline, setHeadline] = useState<string | null>(null);
  const [items, setItems] = useState<CapabilityRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const r = await api.otzar.enterpriseTools.catalog();
    if (r.ok) {
      setHeadline(r.data.catalog.headline);
      setItems(r.data.catalog.capabilities);
      setError(null);
    } else {
      setError(r.code);
      setItems(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const catalogReconnectCount = useMemo(() => {
    if (!items) return 0;
    let n = 0;
    for (const cap of items) {
      for (const p of cap.providers) {
        if (
          p.connect_action === "reconnect" ||
          p.status === "error_reconnect"
        ) {
          n += 1;
        }
      }
    }
    return n;
  }, [items]);

  async function startOauth(p: ProviderRow, capabilityId: string): Promise<void> {
    const key = `${capabilityId}:${p.provider}`;
    setBusyKey(key);
    setNotice(null);
    if (p.oauth_slug === null) {
      setBusyKey(null);
      setNotice("This tool has no self-serve reconnect on this account.");
      return;
    }
    const r = await api.otzar.enterpriseTools.oauthStart(p.oauth_slug);
    setBusyKey(null);
    if (r.ok && r.data.authorize_url) {
      window.location.assign(r.data.authorize_url);
      return;
    }
    setNotice(
      r.ok
        ? "Couldn't open connect flow."
        : r.code === "APP_CREDENTIALS_MISSING"
          ? "Your org still needs app credentials — ask an admin."
          : "Couldn't start connect right now.",
    );
  }

  async function connectProvider(
    capabilityId: string,
    p: ProviderRow,
    forceReconnect = false,
  ): Promise<void> {
    const key = `${capabilityId}:${p.provider}`;
    setBusyKey(key);
    setNotice(null);
    if (
      (p.connect_action === "oauth_start" ||
        p.connect_action === "reconnect" ||
        forceReconnect) &&
      p.oauth_slug !== null
    ) {
      await startOauth(p, capabilityId);
      return;
    }
    const r = await api.otzar.enterpriseTools.request({
      capability_id: capabilityId,
      provider: p.provider,
    });
    setBusyKey(null);
    if (r.ok) {
      setNotice("Request sent. An admin can enable this in Tools & Connections.");
      void load();
    } else if (r.code === "ALREADY_OPEN") {
      setNotice("You already asked for this — your admin still has the request.");
    } else {
      setNotice("Couldn't send the request right now.");
    }
  }

  const byCategory = new Map<string, CapabilityRow[]>();
  for (const c of items ?? []) {
    const list = byCategory.get(c.category) ?? [];
    list.push(c);
    byCategory.set(c.category, list);
  }

  const googleReconnectTargets: Array<{
    capabilityId: string;
    provider: ProviderRow;
  }> = [];
  if (needReconnect && items) {
    for (const cap of items) {
      for (const p of cap.providers) {
        if (isGoogleish(p) && p.oauth_slug !== null) {
          googleReconnectTargets.push({
            capabilityId: cap.capability_id,
            provider: p,
          });
        }
      }
    }
  }

  return (
    <div
      className="space-y-6"
      data-testid="connector-health-page"
      data-capability-first="true"
      data-mcp-primary="false"
    >
      <PageHeader
        title="Your tools"
        description="Pick what you need for work — calendars, documents, Meet, chat. Connect or reconnect when scopes go stale. Otzar never writes without policy."
      />
      {/* O-01 — capability-first framing; MCP is not the employee primary path. */}
      <p
        className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        data-testid="tools-capability-first-banner"
      >
        <span className="font-medium text-foreground">
          {CAPABILITY_FIRST_HEADLINE}
        </span>{" "}
        {CAPABILITY_FIRST_DETAIL}
      </p>

      {/* N-02 — Meet operational residual honesty (operator OAuth) */}
      <MeetOperationalResidualCard
        variant="tools"
        needsReconnect={needReconnect}
      />

      {needReconnect ? (
        <Card
          className="border-amber-300/70 bg-amber-50/80"
          data-testid="tools-reconnect-banner"
        >
          <CardContent className="space-y-3 py-4 text-sm">
            <p className="font-medium text-amber-950" data-testid="tools-reconnect-headline">
              {fromComms
                ? "Comms could not pull Google Meet — scopes may be stale"
                : "A tool needs reconnect before Otzar can use it"}
            </p>
            <p className="text-xs text-amber-900/90">
              Catalog may still say “Connected” while Meet or calendar write
              scopes are missing. Reconnect Google below to refresh access —
              this is the honest fix, not a fake green status.
            </p>
            {googleReconnectTargets.length > 0 ? (
              <ul className="flex flex-wrap gap-2" data-testid="tools-reconnect-actions">
                {googleReconnectTargets.map(({ capabilityId, provider: p }) => {
                  const key = `${capabilityId}:${p.provider}`;
                  const busy = busyKey === key;
                  return (
                    <li key={key}>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void connectProvider(capabilityId, p, true)
                        }
                        data-testid="tools-force-reconnect"
                        data-provider={p.provider}
                      >
                        {busy ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden
                          />
                        ) : (
                          `Reconnect ${p.label}`
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-amber-900">
                No Google self-serve reconnect on this account — use Tools &amp;
                Connections as admin, or ask an admin.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {catalogReconnectCount > 0 && !needReconnect ? (
        <p
          className="text-xs font-medium text-amber-900"
          data-testid="tools-catalog-reconnect-hint"
        >
          {catalogReconnectCount} connection
          {catalogReconnectCount === 1 ? "" : "s"} need reconnect — use the
          buttons below.
        </p>
      ) : null}

      {headline !== null ? (
        <p
          className="text-sm text-muted-foreground"
          data-testid="enterprise-tools-headline"
        >
          {headline}
        </p>
      ) : null}

      {admin ? (
        <Card data-testid="enterprise-tools-admin-link">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span className="text-muted-foreground">
              You can manage org credentials and inventory.
            </span>
            <Button asChild size="sm" variant="outline">
              <Link to="/tools-connections" data-testid="open-tools-connections">
                Tools &amp; Connections
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {notice !== null ? (
        <p className="text-xs text-foreground" data-testid="enterprise-tools-notice">
          {notice}
        </p>
      ) : null}

      {items === null && error === null ? (
        <p className="text-sm text-muted-foreground" data-testid="enterprise-tools-loading">
          Loading tools…
        </p>
      ) : null}

      {error !== null ? (
        <Card className="border-rose-400/40 bg-rose-500/5" data-testid="enterprise-tools-error">
          <CardContent className="py-4 text-sm">
            <AlertCircle className="mr-1 inline h-4 w-4" aria-hidden />
            Couldn&apos;t load your tools right now ({error}).
          </CardContent>
        </Card>
      ) : null}

      {[...byCategory.entries()].map(([category, rows]) => (
        <Card key={category} data-testid="enterprise-tools-category" data-category={category}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Cable className="h-4 w-4" aria-hidden />
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((cap) => (
              <div
                key={cap.capability_id}
                className="rounded-lg border border-border/60 bg-card p-3"
                data-testid="enterprise-tools-capability"
                data-capability-id={cap.capability_id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{cap.label}</p>
                    <p className="text-xs text-muted-foreground">{cap.description}</p>
                  </div>
                  {statusBadge(cap.status, cap.status_label)}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {cap.providers.map((p) => {
                    const key = `${cap.capability_id}:${p.provider}`;
                    const busy = busyKey === key;
                    const canAct =
                      p.connect_action === "oauth_start" ||
                      p.connect_action === "reconnect" ||
                      p.connect_action === "request_admin" ||
                      (needReconnect &&
                        isGoogleish(p) &&
                        p.oauth_slug !== null);
                    const force =
                      needReconnect &&
                      isGoogleish(p) &&
                      p.connect_action !== "oauth_start" &&
                      p.connect_action !== "reconnect" &&
                      p.connect_action !== "request_admin";
                    return (
                      <li
                        key={p.provider}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/20 px-2 py-1.5 text-xs"
                        data-testid="enterprise-tools-provider"
                      >
                        <span className="text-foreground">
                          {p.label}
                          <span className="ml-2 text-muted-foreground">
                            {p.status_label}
                          </span>
                        </span>
                        {canAct ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              p.connect_action === "request_admin" && !force
                                ? "outline"
                                : "secondary"
                            }
                            disabled={busy}
                            onClick={() =>
                              void connectProvider(
                                cap.capability_id,
                                p,
                                force,
                              )
                            }
                            data-testid="enterprise-tools-connect"
                            data-action={
                              force ? "force_reconnect" : p.connect_action
                            }
                          >
                            {busy ? (
                              <Loader2
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden
                              />
                            ) : p.connect_action === "request_admin" &&
                              !force ? (
                              "Ask admin"
                            ) : p.connect_action === "reconnect" || force ? (
                              "Reconnect"
                            ) : (
                              "Connect"
                            )}
                          </Button>
                        ) : p.status === "connected" ? (
                          <span className="text-[11px] text-emerald-700">
                            Ready for work
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
