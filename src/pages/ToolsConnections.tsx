// FILE: ToolsConnections.tsx
// PURPOSE: Admin Tools & Connections — click-and-play inventory + KPI
//          (Phase E.1), org bindings (Your tools), advanced MCP/rails.
//          Human language; MCP never primary.
// CONNECTS TO: api.otzar.enterpriseTools.inventory, ConnectorsAdmin,
//              ConnectorRailsAdmin.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectorsAdminPage } from "@/pages/ConnectorsAdmin";
import ConnectorRailsAdmin from "@/pages/ConnectorRailsAdmin";
import { api } from "@/lib/api";

type Inventory = {
  headline: string;
  kpis: {
    capabilities_connected: number;
    capabilities_ready: number;
    capabilities_blocked: number;
    oauth_verified: number;
    oauth_ready_for_consent: number;
    org_bindings_enabled: number;
    pending_access_requests: number;
  };
  tools: Array<{
    provider: string;
    display_name: string;
    category: string;
    adapter_status: string;
    oauth_status: string | null;
    account_label: string | null;
    last_verified_at: string | null;
    can_write: boolean;
    employee_self_serve: boolean;
  }>;
  pending_requests: Array<{
    seed_id: string;
    subject_name: string | null;
    recommended_action: string;
    created_at: string;
  }>;
};

function InventoryPanel(): JSX.Element {
  const [inv, setInv] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.otzar.enterpriseTools.inventory().then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setInv(r.data.inventory);
        setError(null);
      } else {
        setError(r.code);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error !== null) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="tools-inventory-error">
        Couldn&apos;t load inventory ({error}).
      </p>
    );
  }
  if (inv === null) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="tools-inventory-loading">
        Loading inventory…
      </p>
    );
  }

  const k = inv.kpis;
  const kpiItems: Array<{ label: string; value: number; testId: string }> = [
    { label: "Connected areas", value: k.capabilities_connected, testId: "kpi-connected" },
    { label: "Ready to connect", value: k.capabilities_ready, testId: "kpi-ready" },
    { label: "OAuth verified", value: k.oauth_verified, testId: "kpi-oauth-verified" },
    { label: "Pending requests", value: k.pending_access_requests, testId: "kpi-pending" },
    { label: "Org bindings on", value: k.org_bindings_enabled, testId: "kpi-bindings" },
  ];

  return (
    <div className="space-y-4" data-testid="tools-inventory-panel">
      <p className="text-sm text-muted-foreground" data-testid="tools-inventory-headline">
        {inv.headline}
      </p>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpiItems.map((item) => (
          <Card key={item.label}>
            <CardContent className="py-3" data-testid={item.testId}>
              <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {inv.pending_requests.length > 0 ? (
        <Card data-testid="tools-pending-requests">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">People waiting on tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Approve or dismiss on{" "}
              <Link
                to="/organization-seeding"
                className="font-medium underline-offset-2 hover:underline"
              >
                Organization Seeding
              </Link>
              . Nothing is auto-granted.
            </p>
            <ul className="space-y-1.5">
              {inv.pending_requests.map((req) => (
                <li
                  key={req.seed_id}
                  className="rounded-md border border-border/50 px-2 py-1.5 text-xs"
                  data-testid="tools-pending-row"
                >
                  <span className="font-medium text-foreground">
                    {req.subject_name ?? "Someone"}
                  </span>
                  <span className="text-muted-foreground"> — {req.recommended_action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Tool inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border/60">
            {inv.tools.map((t) => (
              <li
                key={t.provider}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                data-testid="tools-inventory-row"
                data-provider={t.provider}
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t.display_name}</p>
                  <p className="text-muted-foreground">
                    {t.category}
                    {t.employee_self_serve ? " · employees can connect" : " · admin setup"}
                    {t.account_label ? ` · ${t.account_label}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {t.oauth_status ?? t.adapter_status}
                  </Badge>
                  {t.can_write ? (
                    <Badge variant="outline" className="text-[10px]">
                      writes gated
                    </Badge>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Employees connect from{" "}
        <Link to="/app/connector-health" className="font-medium underline-offset-2 hover:underline">
          Your tools
        </Link>{" "}
        in Work OS — not a place to live, just when work needs a tool.
      </p>
    </div>
  );
}

export function ToolsConnectionsPage(): JSX.Element {
  return (
    <div className="space-y-6" data-testid="tools-connections-page">
      <PageHeader
        title="Connect the tools your company already uses"
        description="Employees pick a capability and connect in a few clicks when you enable it. You keep inventory, health, and approve/deny. Otzar never posts without policy — and nobody needs MCP jargon for daily setup."
      />

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory" data-testid="tab-tools-inventory">
            Inventory &amp; KPIs
          </TabsTrigger>
          <TabsTrigger value="connected" data-testid="tab-connected-tools">
            Your tools
          </TabsTrigger>
          <TabsTrigger value="advanced" data-testid="tab-integrations-advanced">
            Advanced (developers)
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" data-testid="panel-tools-inventory">
          <InventoryPanel />
        </TabsContent>
        <TabsContent value="connected" data-testid="panel-connected-tools">
          <ConnectorsAdminPage />
        </TabsContent>
        <TabsContent value="advanced" data-testid="panel-integrations-advanced">
          <p className="mb-3 text-sm text-muted-foreground">
            Protocol-level connections, tool policies, and custom servers for
            authorized technical administrators. Ordinary org setup does not
            require this tab.
          </p>
          <ConnectorRailsAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
