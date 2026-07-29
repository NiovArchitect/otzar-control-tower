// FILE: ToolsConnections.tsx
// PURPOSE: Admin organization tool launcher — OAuth-first Connections primary;
//          Access governance (approve/revoke); Advanced engineering (MCP,
//          rails, secret_ref) last. Employee personal reconnect stays on
//          ConnectorHealth. O-01/O-02 capability-first + coverage honesty.
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
// AI Voice / STT / TTS organization policy lives in Control Tower (this page +
// Voice providers), never on the regular-employee Connections surface.
import { MCP_ADVANCED_ONLY_COPY } from "@/lib/connectors/capability-first-tools";
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

/** Human primary tools — OAuth-first org launcher (founder rejection of engineering console). */
const ORG_PRIMARY_TOOLS: Array<{
  id: string;
  name: string;
  why: string;
  oauth_slug: string | null;
  provider_match: RegExp;
}> = [
  {
    id: "GOOGLE_WORKSPACE",
    name: "Google Workspace",
    why: "Connect Gmail, Calendar, Drive, and Docs so Otzar can understand authorized work and help your team coordinate.",
    oauth_slug: "google",
    provider_match: /google/i,
  },
  {
    id: "MICROSOFT_365",
    name: "Microsoft 365",
    why: "Connect Outlook, Calendar, OneDrive, and Teams context Otzar is allowed to use.",
    oauth_slug: "microsoft",
    provider_match: /microsoft|m365|azure/i,
  },
  {
    id: "SLACK",
    name: "Slack",
    why: "Connect Slack so Otzar can understand authorized channels and draft or send messages within organization policy.",
    oauth_slug: "slack",
    provider_match: /slack/i,
  },
  {
    id: "GITHUB",
    name: "GitHub",
    why: "Connect GitHub so Otzar can understand authorized repositories, pull requests, and issues.",
    oauth_slug: null,
    provider_match: /github/i,
  },
  {
    id: "JIRA",
    name: "Jira",
    why: "Connect Jira so Otzar can understand authorized project work and issue status.",
    oauth_slug: null,
    provider_match: /jira/i,
  },
  {
    id: "LINEAR",
    name: "Linear",
    why: "Connect Linear so Otzar can understand authorized issues and delivery status.",
    oauth_slug: null,
    provider_match: /linear/i,
  },
];

function OrgToolLauncher(): JSX.Element {
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

  async function connectTool(
    tool: (typeof ORG_PRIMARY_TOOLS)[number],
  ): Promise<void> {
    if (tool.oauth_slug === null) {
      setNotice(
        `${tool.name} is available for organization setup. Open Advanced for enterprise configuration, or ask your deployment team.`,
      );
      return;
    }
    setBusy(tool.id);
    setNotice(null);
    const r = await api.otzar.enterpriseTools.oauthStart(tool.oauth_slug);
    setBusy(null);
    if (r.ok && r.data.authorize_url) {
      window.location.assign(r.data.authorize_url);
      return;
    }
    setNotice(
      !r.ok && r.code === "APP_CREDENTIALS_MISSING"
        ? "Administrator setup is still required for this tool in your deployment. Open Advanced only if you own provider setup."
        : "Couldn't open the official sign-in flow. Try again shortly.",
    );
  }

  if (error !== null) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="org-tool-launcher-error">
        Couldn&apos;t load connections ({error}).
      </p>
    );
  }
  if (inv === null) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="org-tool-launcher-loading">
        Loading tools…
      </p>
    );
  }

  const tools = inv.tools ?? [];
  function statusFor(tool: (typeof ORG_PRIMARY_TOOLS)[number]): {
    status: "connected" | "needs_attention" | "available";
    label: string;
    identity: string | null;
  } {
    const row = tools.find((t) => tool.provider_match.test(t.provider));
    if (row === undefined) {
      return { status: "available", label: "Not connected", identity: null };
    }
    const oauth = (row.oauth_status ?? row.adapter_status ?? "").toLowerCase();
    if (/connected|verified|ok|healthy/.test(oauth)) {
      return {
        status: "connected",
        label: "Connected",
        identity: row.account_label,
      };
    }
    if (/error|reconnect|expired|revoked|fail/.test(oauth)) {
      return {
        status: "needs_attention",
        label: "Needs attention",
        identity: row.account_label,
      };
    }
    return {
      status: "available",
      label: "Not connected",
      identity: row.account_label,
    };
  }

  const connected = ORG_PRIMARY_TOOLS.filter(
    (t) => statusFor(t).status === "connected",
  );
  const attention = ORG_PRIMARY_TOOLS.filter(
    (t) => statusFor(t).status === "needs_attention",
  );
  const available = ORG_PRIMARY_TOOLS.filter(
    (t) => statusFor(t).status === "available",
  );

  function ToolCard(tool: (typeof ORG_PRIMARY_TOOLS)[number]): JSX.Element {
    const s = statusFor(tool);
    return (
      <Card
        key={tool.id}
        data-testid={`org-tool-card-${tool.id}`}
        data-tool-status={s.status}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{tool.name}</CardTitle>
            <Badge
              variant="outline"
              className={
                s.status === "connected"
                  ? "border-emerald-300/50 text-emerald-700 text-[10px]"
                  : s.status === "needs_attention"
                    ? "border-amber-300/50 text-amber-700 text-[10px]"
                    : "text-[10px] text-muted-foreground"
              }
            >
              {s.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{tool.why}</p>
          {s.identity !== null && s.identity.length > 0 ? (
            <p className="text-xs text-foreground" data-testid="org-tool-identity">
              Connected as {s.identity}
            </p>
          ) : null}
          {s.status === "connected" ? (
            <p className="text-xs text-muted-foreground">
              View and understand enabled. Writes stay gated by organization policy.
            </p>
          ) : null}
          <Button
            type="button"
            className="w-full"
            disabled={busy !== null}
            onClick={() => void connectTool(tool)}
            data-testid={`org-tool-connect-${tool.id}`}
          >
            {busy === tool.id
              ? "Opening…"
              : s.status === "connected"
                ? "Reconnect"
                : s.status === "needs_attention"
                  ? "Fix connection"
                  : tool.oauth_slug
                    ? `Connect ${tool.name}`
                    : "Set up"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="org-tool-launcher">
      {notice !== null ? (
        <p
          className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm"
          data-testid="org-tool-launcher-notice"
        >
          {notice}
        </p>
      ) : null}

      {attention.length > 0 ? (
        <section className="space-y-3" data-testid="org-tools-needs-attention">
          <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {attention.map((t) => ToolCard(t))}
          </div>
        </section>
      ) : null}

      {connected.length > 0 ? (
        <section className="space-y-3" data-testid="org-tools-connected">
          <h2 className="text-sm font-semibold text-foreground">Connected</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {connected.map((t) => ToolCard(t))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3" data-testid="org-tools-available">
        <h2 className="text-sm font-semibold text-foreground">Available</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {available.map((t) => ToolCard(t))}
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Employees reconnect personal access from{" "}
        <Link
          to="/app/connector-health"
          className="font-medium underline-offset-2 hover:underline"
        >
          Connect your work tools
        </Link>
        . Official provider sign-in is the default path — no tokens to paste.
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
      data-oauth-first="true"
      data-mcp-advanced-only="true"
      data-plug-and-play="true"
    >
      <PageHeader
        title="Connect your organization’s tools"
        description="Choose the tools your team already uses. Sign in through the provider, keep access under organization policy, and start with read-only understanding."
      />

      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList
          data-testid="tools-admin-tablist"
          data-tab-order="connections>access>advanced"
        >
          <TabsTrigger value="connections" data-testid="tab-connected-tools">
            Connections
          </TabsTrigger>
          <TabsTrigger value="access" data-testid="tab-tools-access">
            Access
          </TabsTrigger>
          <TabsTrigger
            value="advanced"
            data-testid="tab-integrations-advanced"
            data-mcp-advanced="true"
          >
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="connections"
          data-testid="panel-connected-tools"
          data-capability-primary="true"
        >
          <OrgToolLauncher />
        </TabsContent>

        <TabsContent value="access" data-testid="panel-tools-access">
          <p className="mb-3 text-sm text-muted-foreground">
            Approve who may use organization tools and revoke access when needed.
            Technical inventory stays under Advanced.
          </p>
          <InventoryPanel />
        </TabsContent>

        <TabsContent
          value="advanced"
          data-testid="panel-integrations-advanced"
          data-mcp-advanced-only="true"
        >
          <p
            className="mb-3 text-sm text-muted-foreground"
            data-testid="tools-mcp-advanced-copy"
          >
            Advanced integrations are for deployment and enterprise setup only —
            service accounts, MCP, rails, and credential references. Everyday
            connections use official provider sign-in on the Connections tab.{" "}
            {MCP_ADVANCED_ONLY_COPY}
          </p>
          <div className="space-y-6">
            <ConnectorsAdminPage />
            <ConnectorRailsAdmin />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
