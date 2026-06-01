// FILE: Onboarding.tsx
// PURPOSE: ADR-0080 Wave 3 consumer surface — replaces the
//          Placeholder with the customer-admin-facing READ-ONLY
//          Dandelion Preview screen. Composes against the CT-side
//          mirror of the Foundation Wave 2 OOTB static seed catalog
//          (src/lib/ootb-catalog/data.ts).
//
//          CANONICAL DOCTRINE (Founder, preserved verbatim):
//            "Dandelion suggests the starter shape; Foundation
//             governance authorizes what may actually run."
//            "Templates describe useful defaults. Governed envelopes
//             define how those defaults may be used."
//            "JSON is not the moat — the governed context envelope
//             is."
//            "Catalog entries are not permissions."
//            "Connector presets are not live connectors."
//            "This preview does not activate tools, users,
//             permissions, workflows, or Digital Twin profiles."
//
//          Read-only — NO permission grants, NO connector
//          activations, NO Digital Twin profile creation, NO
//          autonomous execution, NO LLM, NO Python, NO BEAM, NO
//          new audit literal, NO mutation to existing Foundation
//          dandelion.service.ts.
//
//          No raw catalog dump. No raw envelope payload. No secret
//          refs. Workforce-monitoring framing forbidden.
// CONNECTS TO: src/lib/ootb-catalog/data.ts, src/lib/ootb-catalog/
//              types.ts, src/components/PageHeader.tsx, ui/* primitives.
// FOUNDATION SOURCE: docs/ootb-catalog/* (PR #166 HEAD 86b1a4b).

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import { OOTB_CATALOG_MIRROR } from "@/lib/ootb-catalog/data";
import type {
  CollaborationMap,
  ConnectorPresetSummary,
  DmwEducation,
  ExecutiveAssistantSpotlight,
  RoleDepthStatusRow,
  RoleSummary,
  ToolSummary,
  WorkflowSummary,
} from "@/lib/ootb-catalog/types";

const CATALOG = OOTB_CATALOG_MIRROR;

const PREVIEW_DOCTRINE_LINE =
  "Dandelion suggests the starter shape; Foundation governance authorizes what may actually run.";

function priorityBadgeLabel(
  tier: ToolSummary["connector_priority_tier"],
): string {
  switch (tier) {
    case "TIER_1_CRITICAL":
      return "Tier 1";
    case "TIER_2_HIGH":
      return "Tier 2";
    case "TIER_3_MEDIUM":
      return "Tier 3";
    case "TIER_4_LOWER":
      return "Tier 4";
  }
}

function sensitivityBadgeLabel(
  level: ToolSummary["data_sensitivity"],
): { variant: "secondary" | "outline" | "destructive"; label: string } {
  switch (level) {
    case "CRITICAL":
      return { variant: "destructive", label: "Critical sensitivity" };
    case "HIGH":
      return { variant: "destructive", label: "High sensitivity" };
    case "MEDIUM":
      return { variant: "secondary", label: "Medium sensitivity" };
    case "LOW":
      return { variant: "outline", label: "Low sensitivity" };
  }
}

function riskBadgeLabel(
  level: WorkflowSummary["risk_level"],
): { variant: "secondary" | "outline" | "destructive"; label: string } {
  switch (level) {
    case "CRITICAL":
    case "HIGH":
      return { variant: "destructive", label: `Risk: ${level.toLowerCase()}` };
    case "MEDIUM":
      return { variant: "secondary", label: "Risk: medium" };
    case "LOW":
      return { variant: "outline", label: "Risk: low" };
  }
}

function automationBadgeLabel(
  level: WorkflowSummary["automation_level"],
): string {
  switch (level) {
    case "NONE":
      return "Automation: none";
    case "SUGGEST_ONLY":
      return "Suggest-only";
    case "HUMAN_CONFIRMED":
      return "Human-confirmed";
    case "GOVERNED_AUTO":
      return "Governed-auto";
  }
}

function DoctrineCard() {
  return (
    <Card data-testid="dandelion-doctrine-card">
      <CardHeader>
        <CardTitle className="text-base">Read-only preview</CardTitle>
        <CardDescription data-testid="dandelion-doctrine-line">
          {PREVIEW_DOCTRINE_LINE}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <p>
          Templates describe useful defaults. Governed envelopes define
          how those defaults may be used.
        </p>
        <p>JSON is not the moat — the governed context envelope is.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Catalog entries are not permissions.</li>
          <li>Connector presets are not live connectors.</li>
          <li>
            This preview does not activate tools, users, permissions,
            workflows, or Digital Twin profiles.
          </li>
          <li>
            Dandelion will eventually assemble governed starter envelopes
            for Foundation governance to authorize.
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

function CatalogCountsCard() {
  return (
    <Card data-testid="dandelion-counts-card">
      <CardHeader>
        <CardTitle className="text-base">Catalog summary</CardTitle>
        <CardDescription>
          Wave 2 static seed catalog (read-only preview).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div data-testid="count-roles">
            <dt className="text-xs text-muted-foreground">Roles</dt>
            <dd className="text-2xl font-semibold">{CATALOG.counts.roles}</dd>
          </div>
          <div data-testid="count-departments">
            <dt className="text-xs text-muted-foreground">Departments</dt>
            <dd className="text-2xl font-semibold">
              {CATALOG.counts.departments}
            </dd>
          </div>
          <div data-testid="count-company-variants">
            <dt className="text-xs text-muted-foreground">Company variants</dt>
            <dd className="text-2xl font-semibold">
              {CATALOG.counts.company_variants}
            </dd>
          </div>
          <div data-testid="count-tools">
            <dt className="text-xs text-muted-foreground">Tools</dt>
            <dd className="text-2xl font-semibold">{CATALOG.counts.tools}</dd>
          </div>
          <div data-testid="count-workflows">
            <dt className="text-xs text-muted-foreground">Workflows</dt>
            <dd className="text-2xl font-semibold">
              {CATALOG.counts.workflows}
            </dd>
          </div>
          <div data-testid="count-connector-presets">
            <dt className="text-xs text-muted-foreground">Connector presets</dt>
            <dd className="text-2xl font-semibold">
              {CATALOG.counts.connector_presets}
            </dd>
          </div>
          <div data-testid="count-dandelion-flows">
            <dt className="text-xs text-muted-foreground">Dandelion flows</dt>
            <dd className="text-2xl font-semibold">
              {CATALOG.counts.dandelion_flows}
            </dd>
          </div>
          <div data-testid="count-total">
            <dt className="text-xs text-muted-foreground">Total items</dt>
            <dd className="text-2xl font-semibold">
              {CATALOG.counts.total_items}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function RoleBrowser({ roles }: { roles: RoleSummary[] }) {
  return (
    <Card data-testid="dandelion-role-browser">
      <CardHeader>
        <CardTitle className="text-base">Role templates</CardTitle>
        <CardDescription>
          Starter operating models. Executive Assistant is the deepest
          worked example.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y" data-testid="role-list">
          {roles.map((role) => (
            <li
              key={role.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              data-testid={`role-row-${role.id}`}
            >
              <div>
                <p className="text-sm font-medium">{role.role_name}</p>
                <p className="text-xs text-muted-foreground">
                  {role.role_family} · {role.department} ·{" "}
                  {role.seniority_level}
                </p>
              </div>
              {role.is_deepest_example && (
                <Badge variant="secondary" data-testid="badge-deepest-example">
                  Deepest worked example
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ExecutiveAssistantSpotlightCard({
  spotlight,
}: {
  spotlight: ExecutiveAssistantSpotlight;
}) {
  return (
    <Card data-testid="dandelion-ea-spotlight">
      <CardHeader>
        <CardTitle className="text-base">
          Executive Assistant spotlight
        </CardTitle>
        <CardDescription>
          Deepest worked example. Read-only template — no calendar,
          inbox, travel, or expense system is connected here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <section data-testid="ea-supported-executives">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Supported executives / likely reports-to
          </h3>
          <p className="mt-1">{spotlight.likely_reports_to.join(", ")}</p>
        </section>
        <section data-testid="ea-possible-direct-reports">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Possible direct reports
          </h3>
          <p className="mt-1">{spotlight.possible_direct_reports.join(", ")}</p>
        </section>
        <section data-testid="ea-workflows">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Common workflows
          </h3>
          <ul className="ml-4 mt-1 list-disc">
            {spotlight.common_workflows.map((wf) => (
              <li key={wf}>{wf}</li>
            ))}
          </ul>
        </section>
        <section data-testid="ea-tools">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Common tools (SAP Concur + Expensify + Ramp + Brex + Navan +
            TravelPerk family present)
          </h3>
          <p className="mt-1">{spotlight.common_tools.join(", ")}</p>
        </section>
        <section data-testid="ea-permission-bundles">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Permission bundles
          </h3>
          <ul className="ml-4 mt-1 list-disc">
            {spotlight.permission_bundles.map((bundle) => (
              <li key={bundle.name}>
                {bundle.name} —{" "}
                <span className="font-mono text-xs">{bundle.default_state}</span>
              </li>
            ))}
          </ul>
        </section>
        <section data-testid="ea-aha-moments">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Aha moments
          </h3>
          <ul className="ml-4 mt-1 list-disc">
            {spotlight.aha_moments.map((aha) => (
              <li key={aha}>{aha}</li>
            ))}
          </ul>
        </section>
        <section data-testid="ea-safe-fallback">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Safe fallback tiers
          </h3>
          <ul className="ml-4 mt-1 list-disc">
            {spotlight.safe_fallback_tiers.map((tier) => (
              <li key={tier.tier}>
                <span className="font-medium">{tier.tier}</span> —{" "}
                {tier.description}
              </li>
            ))}
          </ul>
        </section>
        <section data-testid="ea-forbidden-inferences">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Forbidden inferences (template-level)
          </h3>
          <ul className="ml-4 mt-1 list-disc">
            {spotlight.forbidden_inferences.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
        <Separator />
        <p
          className="text-xs italic text-muted-foreground"
          data-testid="ea-preview-only-notice"
        >
          {spotlight.preview_only_notice}
        </p>
      </CardContent>
    </Card>
  );
}

function ToolProfileBrowser({ tools }: { tools: ToolSummary[] }) {
  const byCategory = tools.reduce<Record<string, ToolSummary[]>>(
    (acc, tool) => {
      const bucket = acc[tool.category] ?? [];
      bucket.push(tool);
      acc[tool.category] = bucket;
      return acc;
    },
    {},
  );
  return (
    <Card data-testid="dandelion-tool-browser">
      <CardHeader>
        <CardTitle className="text-base">Tool profiles</CardTitle>
        <CardDescription>
          Representative entries from the {CATALOG.counts.tools}-tool
          Foundation catalog (read-only template metadata, not active
          integrations).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(byCategory).map(([category, items]) => (
          <section key={category} data-testid={`tool-category-${category}`}>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {category}
            </h3>
            <ul className="mt-1 divide-y" data-testid={`tool-list-${category}`}>
              {items.map((tool) => {
                const sens = sensitivityBadgeLabel(tool.data_sensitivity);
                return (
                  <li
                    key={tool.id}
                    className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between"
                    data-testid={`tool-row-${tool.id}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tool.tool_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Safe defaults:{" "}
                        {tool.safe_default_permissions.join(", ") || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Approval-gated: {tool.risky_permissions.join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">
                        {priorityBadgeLabel(tool.connector_priority_tier)}
                      </Badge>
                      <Badge variant={sens.variant}>{sens.label}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function WorkflowBrowser({ workflows }: { workflows: WorkflowSummary[] }) {
  return (
    <Card data-testid="dandelion-workflow-browser">
      <CardHeader>
        <CardTitle className="text-base">Workflow templates</CardTitle>
        <CardDescription>
          Representative entries from the {CATALOG.counts.workflows}-workflow
          Foundation catalog. Suggest-only at preview time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y" data-testid="workflow-list">
          {workflows.map((wf) => {
            const risk = riskBadgeLabel(wf.risk_level);
            return (
              <li
                key={wf.id}
                className="flex flex-col gap-1 py-3"
                data-testid={`workflow-row-${wf.id}`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-medium">{wf.workflow_name}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={risk.variant}>{risk.label}</Badge>
                    <Badge variant="outline">
                      {automationBadgeLabel(wf.automation_level)}
                    </Badge>
                    {wf.approvals_required.map((ap) => (
                      <Badge key={ap} variant="secondary">
                        {ap === "NONE" ? "No approval" : ap.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Triggering roles: {wf.triggering_role_families.join(", ")} ·
                  Required tools: {wf.required_tools.join(", ")}
                </p>
                <p className="text-xs italic text-muted-foreground">
                  Safe fallback: {wf.safe_fallback}
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function ConnectorPresetPreview({
  presets,
}: {
  presets: ConnectorPresetSummary[];
}) {
  return (
    <Card data-testid="dandelion-connector-preset-preview">
      <CardHeader>
        <CardTitle className="text-base">
          Connector preset preview (read-first)
        </CardTitle>
        <CardDescription data-testid="connector-not-live-notice">
          Connector presets are not live connectors. Nothing is connected
          from this page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {presets.map((preset) => (
          <section
            key={preset.id}
            className="rounded-md border p-3"
            data-testid={`connector-preset-${preset.id}`}
          >
            <h3 className="text-sm font-medium">{preset.connector_name}</h3>
            <p className="text-xs text-muted-foreground">
              Category: {preset.tool_category}
            </p>
            <div className="mt-2 text-xs">
              <p className="font-medium text-muted-foreground">
                Read capabilities
              </p>
              <p className="font-mono">{preset.read_capabilities.join(", ")}</p>
            </div>
            <div className="mt-2 text-xs">
              <p className="font-medium text-muted-foreground">
                Risky write actions disabled by default
              </p>
              <p className="font-mono">
                {preset.risky_write_actions_disabled_by_default.join(", ")}
              </p>
            </div>
            <div className="mt-2 text-xs">
              <p className="font-medium text-muted-foreground">
                Audit expectations
              </p>
              <p>{preset.audit_requirements_summary}</p>
            </div>
            <div className="mt-2 text-xs">
              <p className="font-medium text-muted-foreground">
                No-leak rules
              </p>
              <p>{preset.no_leak_rules_summary}</p>
            </div>
            <div className="mt-2 text-xs">
              <p className="font-medium text-muted-foreground">
                Production-enablement checklist
              </p>
              <ul className="ml-4 list-disc">
                {preset.production_enablement_checklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function DandelionFlowPreview() {
  const flow = CATALOG.dandelion_flow_summary;
  return (
    <Card data-testid="dandelion-flow-preview">
      <CardHeader>
        <CardTitle className="text-base">Dandelion flow</CardTitle>
        <CardDescription>
          Three-tier governed onboarding (preview only — does not run).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {flow.tiers.map((tier) => (
          <section
            key={tier.tier_name}
            className="rounded-md border p-3"
            data-testid={`flow-tier-${tier.tier_name.replace(/\s+/g, "-")}`}
          >
            <h3 className="text-sm font-medium">{tier.tier_name}</h3>
            <div className="mt-2 text-xs">
              <p className="font-medium text-muted-foreground">
                Example questions
              </p>
              <ul className="ml-4 list-disc">
                {tier.example_questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
            <div className="mt-2 text-xs">
              <p className="font-medium text-muted-foreground">
                Expected outputs (suggestions only)
              </p>
              <ul className="ml-4 list-disc">
                {tier.expected_outputs.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>
          </section>
        ))}
        <Separator />
        <section data-testid="flow-governance-review-points">
          <h3 className="text-sm font-medium">Governance review points</h3>
          <ul className="ml-4 mt-1 list-disc text-xs text-muted-foreground">
            {flow.governance_review_points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      </CardContent>
    </Card>
  );
}

function RoleDepthRoadmapPanel({
  roadmap,
}: {
  roadmap: RoleDepthStatusRow[];
}) {
  const groups = roadmap.reduce<Record<string, RoleDepthStatusRow[]>>(
    (acc, row) => {
      const bucket = acc[row.status] ?? [];
      bucket.push(row);
      acc[row.status] = bucket;
      return acc;
    },
    {},
  );
  const order: Array<RoleDepthStatusRow["status"]> = [
    "DEEP",
    "STARTER",
    "SUBSUMED",
    "NOT_YET_MODELED",
  ];
  const headings: Record<RoleDepthStatusRow["status"], string> = {
    DEEP: "Deep worked examples",
    STARTER: "Starter-depth in current catalog",
    SUBSUMED: "Subsumed into another template",
    NOT_YET_MODELED: "Needed before activation — not yet modeled",
  };
  const badges: Record<
    RoleDepthStatusRow["status"],
    { variant: "secondary" | "outline" | "destructive"; label: string }
  > = {
    DEEP: { variant: "secondary", label: "Deep" },
    STARTER: { variant: "outline", label: "Starter" },
    SUBSUMED: { variant: "outline", label: "Subsumed" },
    NOT_YET_MODELED: { variant: "destructive", label: "Not yet modeled" },
  };
  return (
    <Card data-testid="role-depth-roadmap">
      <CardHeader>
        <CardTitle className="text-base">Role depth roadmap</CardTitle>
        <CardDescription>
          Substrate-honest depth status across the Wave 2 catalog and the
          roles Wave 2.1 will prioritize. Templates shown here are not
          live and do not pretend depth that does not exist.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {order.map((status) => {
          const rows = groups[status] ?? [];
          if (rows.length === 0) return null;
          const badge = badges[status];
          return (
            <section
              key={status}
              data-testid={`role-depth-group-${status}`}
              className="rounded-md border p-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={badge.variant}>{badge.label}</Badge>
                <h3 className="text-sm font-medium">{headings[status]}</h3>
                <span className="text-xs text-muted-foreground">
                  ({rows.length})
                </span>
              </div>
              <ul className="ml-4 list-disc space-y-1 text-sm">
                {rows.map((row) => (
                  <li
                    key={`${row.status}-${row.role_label}`}
                    data-testid={`role-depth-row-${row.role_label.replace(/[^a-zA-Z0-9]+/g, "-")}`}
                  >
                    <span className="font-medium">{row.role_label}</span>
                    {row.subsumed_under !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        — subsumed under{" "}
                        <span className="font-mono">{row.subsumed_under}</span>
                      </span>
                    )}
                    {row.note !== undefined && (
                      <p className="text-xs italic text-muted-foreground">
                        {row.note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <Separator />
        <p
          className="text-xs italic text-muted-foreground"
          data-testid="role-depth-honesty-line"
        >
          The Wave 2 catalog ships 1 deep role (Executive Assistant) and 14
          starter-depth roles. Wave 2.1 role-depth expansion is the
          recommended next slice before Wave 4 onboarding-recommendation
          activation.
        </p>
      </CardContent>
    </Card>
  );
}

function CollaborationMapPanel({ map }: { map: CollaborationMap }) {
  const directionLabel: Record<
    CollaborationMap["entries"][number]["direction"],
    string
  > = {
    upward: "Upward",
    downward: "Downward",
    peer: "Peer",
    cross_functional: "Cross-functional",
    external: "External",
    approval_path: "Approval path",
    escalation_path: "Escalation path",
  };
  return (
    <Card data-testid="collaboration-map-panel">
      <CardHeader>
        <CardTitle className="text-base">
          Collaboration map — {map.role_name}
        </CardTitle>
        <CardDescription>
          How the deepest worked-example role collaborates up, down, and
          across. Read-only template metadata. Wave 2.1 will surface a
          RoleCollaborationMap object kind so additional roles can be
          rendered the same way.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {map.entries.map((entry) => (
          <section
            key={`${entry.direction}-${entry.description.slice(0, 16)}`}
            data-testid={`collab-${entry.direction}`}
            className="rounded-md border p-3 text-sm"
          >
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {directionLabel[entry.direction]}
            </h3>
            <p className="mt-1">{entry.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Partners: {entry.partner_roles.join(", ")}
            </p>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function DmwEducationPanel({ dmw }: { dmw: DmwEducation }) {
  return (
    <Card data-testid="dmw-education-panel">
      <CardHeader>
        <CardTitle className="text-base">
          Memory Wallet (DMW) education
        </CardTitle>
        <CardDescription data-testid="dmw-user-line">
          {dmw.user_facing_line}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p
          className="italic text-muted-foreground"
          data-testid="dmw-architecture-line"
        >
          {dmw.architecture_line}
        </p>
        <ul className="ml-4 list-disc space-y-1 text-xs text-muted-foreground">
          {dmw.bullet_points.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function GovernedEnvelopePanel() {
  const ed = CATALOG.envelope_defaults_summary;
  return (
    <Card data-testid="governed-envelope-panel">
      <CardHeader>
        <CardTitle className="text-base">Governed envelope</CardTitle>
        <CardDescription>
          Templates describe useful defaults. Governed envelopes define
          how those defaults may be used.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-muted-foreground">object_type</dt>
            <dd className="font-mono">{ed.object_type}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">
              sensitivity_level
            </dt>
            <dd className="font-mono">{ed.sensitivity_level}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">policy_purpose</dt>
            <dd className="font-mono">{ed.policy_purpose}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">scope_defaults</dt>
            <dd className="font-mono">{ed.scope_defaults.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">
              permission_defaults
            </dt>
            <dd className="font-mono">{ed.permission_defaults.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">
              audit_expectations
            </dt>
            <dd>{ed.audit_expectations.join(" ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">
              allowed_consumers
            </dt>
            <dd className="font-mono">{ed.allowed_consumers.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">
              forbidden_consumers
            </dt>
            <dd className="font-mono">{ed.forbidden_consumers.join(", ")}</dd>
          </div>
        </dl>
        <Separator />
        <p className="italic text-muted-foreground">
          {ed.human_readable_summary}
        </p>
        <p className="italic text-muted-foreground">{ed.model_usage_notes}</p>
      </CardContent>
    </Card>
  );
}

export function OnboardingPage() {
  // Defensive: if the mirror is empty / malformed for any reason, render a
  // safe empty state instead of crashing the screen.
  if (CATALOG.role_summaries.length === 0) {
    return (
      <div className="space-y-6" data-testid="onboarding-page">
        <PageHeader
          title="Dandelion Preview"
          description={PREVIEW_DOCTRINE_LINE}
        />
        <Card data-testid="dandelion-empty-state">
          <CardHeader>
            <CardTitle className="text-base">Catalog unavailable</CardTitle>
            <CardDescription>
              The Wave 2 catalog could not be loaded for preview. No
              tools have been connected and no permissions have been
              granted. Refresh to try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="onboarding-page">
      <PageHeader
        title="Dandelion Preview"
        description={PREVIEW_DOCTRINE_LINE}
      />
      <DoctrineCard />
      <CatalogCountsCard />
      <RoleBrowser roles={CATALOG.role_summaries} />
      <RoleDepthRoadmapPanel roadmap={CATALOG.role_depth_roadmap} />
      <ExecutiveAssistantSpotlightCard
        spotlight={CATALOG.executive_assistant_spotlight}
      />
      <CollaborationMapPanel map={CATALOG.ea_collaboration_map} />
      <ToolProfileBrowser tools={CATALOG.tool_summaries} />
      <WorkflowBrowser workflows={CATALOG.workflow_summaries} />
      <ConnectorPresetPreview presets={CATALOG.connector_preset_summaries} />
      <DandelionFlowPreview />
      <DmwEducationPanel dmw={CATALOG.dmw_education} />
      <GovernedEnvelopePanel />
    </div>
  );
}
