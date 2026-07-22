// FILE: ToolsConnections.tsx
// PURPOSE: Admin Tools & Connections — inventory KPIs, per-person tool
//          footprint, in-place approve/deny requests, force-revoke OAuth
//          (Phase E.1 + E.2). O-01: capability-first primary; MCP advanced-only.
//          O-02: org/team/user coverage, enterprise admin consent, SCIM honesty.
// CONNECTS TO: api.otzar.enterpriseTools.*, ConnectorsAdmin, ConnectorRailsAdmin.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectorsAdminPage } from "@/pages/ConnectorsAdmin";
import ConnectorRailsAdmin from "@/pages/ConnectorRailsAdmin";
import { api } from "@/lib/api";
import {
  CAPABILITY_FIRST_DETAIL,
  CAPABILITY_FIRST_HEADLINE,
  MCP_ADVANCED_ONLY_COPY,
  MCP_TAB_LABEL,
} from "@/lib/connectors/capability-first-tools";
import {
  coverageKpisFromInventory,
  labelConnectionScope,
  normalizeConnectionScope,
  summarizeConnectionCoverage,
} from "@/lib/connectors/connection-coverage";

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
    people_with_open_requests?: number;
    active_employee_grants?: number;
  };
  tools: Array<{
    provider: string;
    display_name: string;
    category: string;
    adapter_status: string;
    oauth_status: string | null;
    oauth_slug?: string | null;
    account_label: string | null;
    last_verified_at: string | null;
    can_write: boolean;
    employee_self_serve: boolean;
    revocable?: boolean;
  }>;
  pending_requests: Array<{
    seed_id: string;
    subject_name: string | null;
    subject_entity_id?: string | null;
    capability_id?: string | null;
    provider?: string | null;
    recommended_action: string;
    created_at: string;
  }>;
  people?: Array<{
    person_entity_id: string;
    display_name: string;
    open_request_count: number;
    active_grant_count: number;
    sample_requests: string[];
    grants: Array<{
      grant_id: string;
      connection_id: string;
      scope_type: string;
      allowed_operations: string[];
    }>;
  }>;
  accuracy?: {
    twin_claims: number;
    twin_active: number;
    twin_completed: number;
    regulated_claims: number;
    awaiting_human_verify: number;
    human_verified: number;
    human_verified_and_completed: number;
    human_edit_after_claim: number;
    completion_gate_blocks: number;
    regulated_classes: string[];
  };
};

function InventoryPanel(): JSX.Element {
  const [inv, setInv] = useState<Inventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const r = await api.otzar.enterpriseTools.inventory();
    if (r.ok) {
      setInv(r.data.inventory);
      setError(null);
    } else {
      setError(r.code);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(
    seedId: string,
    decision: "approve" | "deny",
  ): Promise<void> {
    setBusy(`req:${seedId}:${decision}`);
    setNotice(null);
    const r = await api.otzar.enterpriseTools.decideRequest({
      seed_id: seedId,
      decision,
    });
    setBusy(null);
    if (r.ok) {
      setNotice(
        decision === "approve"
          ? "Request approved — connect still needs OAuth when credentials allow (never auto-granted)."
          : "Request denied.",
      );
      void load();
    } else {
      setNotice("Couldn't update that request right now.");
    }
  }

  async function revokeTool(slug: string, label: string): Promise<void> {
    if (
      !window.confirm(
        `Revoke ${label} for the organization? Otzar will wipe stored secrets. This is recorded in the audit trail.`,
      )
    ) {
      return;
    }
    setBusy(`revoke:${slug}`);
    setNotice(null);
    const r = await api.otzar.enterpriseTools.oauthRevoke(slug);
    setBusy(null);
    if (r.ok) {
      setNotice(`${label} revoked for the org.`);
      void load();
    } else {
      setNotice(
        r.code === "NOT_CONNECTED"
          ? "Nothing to revoke for that tool."
          : "Couldn't revoke right now.",
      );
    }
  }

  async function revokeGrant(grantId: string): Promise<void> {
    if (
      !window.confirm(
        "Revoke this employee tool grant? They will lose that scope. Recorded in audit.",
      )
    ) {
      return;
    }
    setBusy(`grant:${grantId}`);
    setNotice(null);
    const r = await api.otzar.enterpriseTools.revokeGrant(grantId);
    setBusy(null);
    if (r.ok) {
      setNotice("Employee grant revoked.");
      void load();
    } else {
      setNotice("Couldn't revoke that grant.");
    }
  }

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
    {
      label: "People with requests",
      value: k.people_with_open_requests ?? 0,
      testId: "kpi-people-requests",
    },
    {
      label: "Employee grants",
      value: k.active_employee_grants ?? 0,
      testId: "kpi-grants",
    },
  ];

  const people = inv.people ?? [];
  const allGrants = people.flatMap((p) => p.grants ?? []);
  // exactOptionalPropertyTypes: omit optional KPIs when API did not send them
  const coverage = summarizeConnectionCoverage({
    kpis: coverageKpisFromInventory(k),
    grants: allGrants,
  });
  const acc = inv.accuracy;
  const accuracyItems: Array<{ label: string; value: number; testId: string }> =
    acc !== undefined
      ? [
          {
            label: "Twin claims",
            value: acc.twin_claims,
            testId: "acc-twin-claims",
          },
          {
            label: "Twin active",
            value: acc.twin_active,
            testId: "acc-twin-active",
          },
          {
            label: "Regulated",
            value: acc.regulated_claims,
            testId: "acc-regulated",
          },
          {
            label: "Awaiting verify",
            value: acc.awaiting_human_verify,
            testId: "acc-awaiting-verify",
          },
          {
            label: "Human verified",
            value: acc.human_verified,
            testId: "acc-human-verified",
          },
          {
            label: "Human edits after claim",
            value: acc.human_edit_after_claim,
            testId: "acc-human-edits",
          },
          {
            label: "Gate blocks",
            value: acc.completion_gate_blocks,
            testId: "acc-gate-blocks",
          },
          {
            label: "Verified + complete",
            value: acc.human_verified_and_completed,
            testId: "acc-verified-complete",
          },
        ]
      : [];

  return (
    <div className="space-y-4" data-testid="tools-inventory-panel">
      <p className="text-sm text-muted-foreground" data-testid="tools-inventory-headline">
        {inv.headline}
      </p>
      {notice !== null ? (
        <p className="text-xs text-foreground" data-testid="tools-inventory-notice">
          {notice}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {kpiItems.map((item) => (
          <Card key={item.label}>
            <CardContent className="py-3" data-testid={item.testId}>
              <p className="text-2xl font-semibold tabular-nums">{item.value}</p>
              <p className="text-[11px] text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* O-02 — org/team/user coverage, enterprise consent, SCIM honesty */}
      <Card
        data-testid="tools-coverage-panel"
        data-coverage-health={coverage.health}
        data-admin-consent={coverage.adminConsent}
        data-scim-state={coverage.scim}
        data-org-count={String(coverage.orgCount)}
        data-team-count={String(coverage.teamCount)}
        data-user-count={String(coverage.userCount)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Coverage · org / team / user
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p
            className="text-xs text-foreground"
            data-testid="tools-coverage-headline"
          >
            {coverage.headline}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" data-testid="tools-scope-org">
              Organization · {coverage.orgCount}
            </Badge>
            <Badge variant="outline" data-testid="tools-scope-team">
              Team · {coverage.teamCount}
            </Badge>
            <Badge variant="outline" data-testid="tools-scope-user">
              User · {coverage.userCount}
            </Badge>
            <span
              className="text-[11px] text-muted-foreground self-center"
              data-testid="tools-scope-breakdown"
            >
              {coverage.scopeBreakdownLabel}
            </span>
          </div>
          <p
            className="text-xs text-muted-foreground"
            data-testid="tools-admin-consent"
            data-consent-state={coverage.adminConsent}
          >
            <span className="font-medium text-foreground">
              Enterprise admin consent:{" "}
            </span>
            {coverage.consentDetail}
          </p>
          <p
            className="text-xs text-muted-foreground"
            data-testid="tools-scim-status"
            data-scim-state={coverage.scim}
          >
            <span className="font-medium text-foreground">SCIM / groups: </span>
            {coverage.scimDetail}
          </p>
        </CardContent>
      </Card>

      {accuracyItems.length > 0 ? (
        <Card data-testid="tools-accuracy-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Twin accuracy &amp; dual-control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              From recent AI Teammate work claims. Regulated work cannot complete
              without human verification. Edits after claim mean a human overrode
              the Twin draft.
            </p>
            <div className="grid gap-2 sm:grid-cols-4">
              {accuracyItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-border/50 px-2 py-2"
                  data-testid={item.testId}
                >
                  <p className="text-xl font-semibold tabular-nums">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
            {acc !== undefined && acc.regulated_classes.length > 0 ? (
              <p className="text-[11px] text-muted-foreground" data-testid="acc-classes">
                Classes seen:{" "}
                {acc.regulated_classes
                  .map((c) =>
                    c === "REGULATED_HEALTH"
                      ? "Clinical"
                      : c === "REGULATED_FINANCE"
                        ? "Financial"
                        : c === "INSURANCE"
                          ? "Insurance"
                          : c,
                  )
                  .join(" · ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {inv.pending_requests.length > 0 ? (
        <Card data-testid="tools-pending-requests">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">People waiting on tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Approve acknowledges the ask so you can enable credentials / connect.
              Deny closes it. Nothing is auto-granted.
            </p>
            <ul className="space-y-2">
              {inv.pending_requests.map((req) => (
                <li
                  key={req.seed_id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 px-2 py-2 text-xs"
                  data-testid="tools-pending-row"
                  data-seed-id={req.seed_id}
                >
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">
                      {req.subject_name ?? "Someone"}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {req.recommended_action}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy !== null}
                      onClick={() => void decide(req.seed_id, "approve")}
                      data-testid="tools-request-approve"
                    >
                      {busy === `req:${req.seed_id}:approve` ? "…" : "Approve"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => void decide(req.seed_id, "deny")}
                      data-testid="tools-request-deny"
                    >
                      {busy === `req:${req.seed_id}:deny` ? "…" : "Deny"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {people.length > 0 ? (
        <Card data-testid="tools-people-panel">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">People &amp; tools</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {people.map((p) => (
                <li
                  key={p.person_entity_id}
                  className="rounded-md border border-border/50 px-3 py-2 text-xs"
                  data-testid="tools-people-row"
                  data-person-id={p.person_entity_id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{p.display_name}</span>
                    <span className="text-muted-foreground">
                      {p.open_request_count > 0
                        ? `${p.open_request_count} open request${p.open_request_count === 1 ? "" : "s"}`
                        : ""}
                      {p.open_request_count > 0 && p.active_grant_count > 0
                        ? " · "
                        : ""}
                      {p.active_grant_count > 0
                        ? `${p.active_grant_count} grant${p.active_grant_count === 1 ? "" : "s"}`
                        : ""}
                    </span>
                  </div>
                  {p.sample_requests.length > 0 ? (
                    <p className="mt-1 text-muted-foreground">
                      {p.sample_requests.join(" · ")}
                    </p>
                  ) : null}
                  {p.grants.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {p.grants.map((g) => (
                        <li
                          key={g.grant_id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded bg-muted/20 px-2 py-1"
                          data-testid="tools-grant-row"
                          data-scope-type={g.scope_type}
                          data-scope-level={
                            normalizeConnectionScope(g.scope_type) ?? "other"
                          }
                        >
                          <span className="text-muted-foreground">
                            {labelConnectionScope(g.scope_type)} ·{" "}
                            {g.allowed_operations.join(", ") || "scoped"}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy !== null}
                            onClick={() => void revokeGrant(g.grant_id)}
                            data-testid="tools-grant-revoke"
                          >
                            {busy === `grant:${g.grant_id}` ? "…" : "Revoke grant"}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
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
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {t.oauth_status ?? t.adapter_status}
                  </Badge>
                  {t.can_write ? (
                    <Badge variant="outline" className="text-[10px]">
                      writes gated
                    </Badge>
                  ) : null}
                  {t.revocable === true &&
                  typeof t.oauth_slug === "string" &&
                  t.oauth_slug.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() => void revokeTool(t.oauth_slug!, t.display_name)}
                      data-testid="tools-oauth-revoke"
                      data-slug={t.oauth_slug}
                    >
                      {busy === `revoke:${t.oauth_slug}` ? "…" : "Revoke"}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Employees connect from{" "}
        <Link
          to="/app/connector-health"
          className="font-medium underline-offset-2 hover:underline"
        >
          Your tools
        </Link>{" "}
        in Work OS — not a place to live, just when work needs a tool.
      </p>
    </div>
  );
}

export function ToolsConnectionsPage(): JSX.Element {
  return (
    <div
      className="space-y-6"
      data-testid="tools-connections-page"
      data-capability-first="true"
      data-mcp-advanced-only="true"
      data-plug-and-play="true"
    >
      <PageHeader
        title="Connections"
        description="Find a tool → Connect → it works under your permissions. Employees connect from Work OS when work needs a tool. You approve requests and can revoke anytime."
      />

      {/* Plug-and-play path — human steps, no protocol jargon. */}
      <Card data-testid="connections-plug-play-path" className="otzar-atari-frame">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-50">How connection works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol
            className="grid gap-2 sm:grid-cols-3"
            data-testid="connections-plug-play-steps"
          >
            {[
              {
                n: "1",
                title: "Find the tool",
                detail: "Calendar, documents, Meet, chat — by capability, not protocol.",
              },
              {
                n: "2",
                title: "Connect once",
                detail: "Org or employee OAuth under your rules. Nothing posts by default.",
              },
              {
                n: "3",
                title: "Works under permissions",
                detail: "Writes stay gated. You can revoke. Audit keeps the trail.",
              },
            ].map((s) => (
              <li
                key={s.n}
                className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5"
                data-testid={`connections-step-${s.n}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a855f7]">
                  {s.n}. {s.title}
                </p>
                <p className="mt-1 text-xs text-slate-300">{s.detail}</p>
              </li>
            ))}
          </ol>
          <p
            className="mt-3 text-sm text-slate-300"
            data-testid="tools-capability-first-banner"
          >
            <span className="font-medium text-slate-50">
              {CAPABILITY_FIRST_HEADLINE}
            </span>{" "}
            {CAPABILITY_FIRST_DETAIL}
          </p>
        </CardContent>
      </Card>

      {/* O-01 — default inventory; MCP/protocol only under Advanced (last). */}
      <Tabs defaultValue="connected" className="space-y-4">
        <TabsList data-testid="tools-admin-tablist" data-tab-order="connected>inventory>advanced">
          <TabsTrigger value="connected" data-testid="tab-connected-tools">
            Connect tools
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-tools-inventory">
            Inventory &amp; requests
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            data-testid="tab-integrations-advanced"
            data-mcp-advanced="true"
          >
            {MCP_TAB_LABEL}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="connected" data-testid="panel-connected-tools" data-capability-primary="true">
          <ConnectorsAdminPage />
        </TabsContent>
        <TabsContent value="inventory" data-testid="panel-tools-inventory" data-capability-primary="true">
          <InventoryPanel />
        </TabsContent>
        <TabsContent
          value="advanced"
          data-testid="panel-integrations-advanced"
          data-mcp-advanced-only="true"
        >
          <p
            className="mb-3 text-sm text-slate-300"
            data-testid="tools-mcp-advanced-copy"
          >
            {MCP_ADVANCED_ONLY_COPY}
          </p>
          <ConnectorRailsAdmin />
        </TabsContent>
      </Tabs>
    </div>
  );
}
