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

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { getStepLabel } from "@/lib/dandelion-activation/labels";
import type {
  CtActivationFailureCode,
  CtActivationResult,
  CtActivationStepResult,
  CtTeamActivationInput,
  CtBusinessActivationInput,
  CtEnterpriseActivationInput,
} from "@/lib/dandelion-activation/types";
import { OOTB_CATALOG_MIRROR } from "@/lib/ootb-catalog/data";
import type {
  CollaborationMap,
  ConnectorPresetSummary,
  ConnectorPriorityMatrix,
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
          Templates describe useful defaults. Governed activation packages define
          how those defaults may be used.
        </p>
        <p>The value is the governed activation package — not the raw file behind it.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Catalog entries are not permissions.</li>
          <li>Connector presets are not live connectors.</li>
          <li>
            This preview does not activate tools, users, permissions,
            workflows, or Digital Twin profiles.
          </li>
          <li>
            Dandelion will eventually assemble governed starter packages
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

function ConnectorPriorityRankingPanel({
  matrix,
}: {
  matrix: ConnectorPriorityMatrix;
}) {
  return (
    <Card data-testid="connector-priority-ranking-panel">
      <CardHeader>
        <CardTitle className="text-base">
          Suggested first-connector ranking (Wave 6)
        </CardTitle>
        <CardDescription data-testid="connector-priority-suggest-only-notice">
          Suggest-only — derived deterministically from the static catalog.
          The first real connector requires Founder authorization plus a
          research arc. Nothing is connected from this page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Matrix version{" "}
          <span className="font-mono">{matrix.matrix_version}</span> ·
          generated{" "}
          <span className="font-mono">{matrix.generated_at}</span>
        </p>
        <section data-testid="priority-forward-substrate-inputs">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Forward-substrate inputs (not yet derivable)
          </h3>
          <ul className="ml-4 mt-1 list-disc text-xs text-muted-foreground">
            {matrix.forward_substrate_inputs_not_yet_available.map((input) => (
              <li key={input}>{input}</li>
            ))}
          </ul>
        </section>
        <ol
          className="divide-y rounded-md border"
          data-testid="priority-ranking-list"
        >
          {matrix.rows.map((row) => (
            <li
              key={row.preset_id}
              className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between"
              data-testid={`priority-row-${row.preset_id}`}
            >
              <div className="flex flex-1 items-start gap-3">
                <span
                  className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                  data-testid={`priority-rank-${row.preset_id}`}
                >
                  {row.rank}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{row.preset_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Underlying tools: {row.tool_count} · most-roles using:{" "}
                    {row.role_count_max}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    tier {row.tier_score_avg} · api{" "}
                    {row.api_maturity_score_avg} · adoption{" "}
                    {row.adoption_signal_score_avg} · auth{" "}
                    {row.auth_readiness_score_avg} ·{" "}
                    sensitivity-penalty {row.sensitivity_penalty_avg} ·
                    complexity-penalty {row.complexity_penalty_avg}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start sm:items-end">
                <Badge
                  variant={row.rank <= 3 ? "secondary" : "outline"}
                  data-testid={`priority-score-${row.preset_id}`}
                >
                  Score {row.total_score}
                </Badge>
              </div>
            </li>
          ))}
        </ol>
        <Separator />
        <p className="text-xs italic text-muted-foreground">
          Higher score = higher derivable priority for first-connector
          implementation given current catalog data. A high score does not
          mean a connector should be activated; it means the catalog
          evidence collectively favors this preset as a candidate. Section 4
          first-real-connector decision remains Founder-decision-gated.
        </p>
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
        <CardTitle className="text-base">Governed activation package</CardTitle>
        <CardDescription>
          Templates describe useful defaults. Governed activation packages define
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

// ────────────────────────────────────────────────────────────────
// D6 Dandelion Stage F starter-pilot activation admin walk surface.
// Consumes Foundation POST /api/v1/org/dandelion/activate (PR #196).
// The button is the smallest possible runtime authorization
// surface: one POST → one ActivationResult → 6 steps rendered.
//
// Privacy invariant inherited from Foundation:
// - Foundation NEVER includes resolved secret values or other
//   forbidden tokens in the result; we render audit_event_id +
//   step_id + audit_literal label only.
// - No raw audit row content is fetched here; the audit viewer
//   surface is the canonical place for that.
// ────────────────────────────────────────────────────────────────

const ACTIVATION_DOCTRINE_LINE =
  "Run the smallest viable starter pilot setup. Every step is audit-logged and reversible. Foundation governance authorizes activation — Dandelion suggests, Foundation governs.";

const ACTIVATION_OUT_OF_SCOPE_LINE =
  "This action records the activation lineage at the audit tier. Live connectors, live workflow execution, and the team / business / enterprise rollout packages follow in later product slices.";

function failureMessage(result: CtActivationResult): string {
  if (result.ok) return "";
  switch (result.code) {
    case "NOT_ADMIN":
      return "Your session does not have org-admin capability. Ask your administrator to grant access.";
    case "CALLER_ENTITY_NOT_FOUND":
      return "Your session does not resolve to a known entity. Sign out and sign back in.";
    case "CALLER_NOT_IN_ORG":
      return "Your session is not associated with an organization yet. Run the org onboarding flow first.";
    case "ARCHETYPE_UNKNOWN":
      return "That rollout package is not available yet.";
    case "CATALOG_NOT_FOUND":
    case "CATALOG_MALFORMED":
      return "The activation catalog is unavailable. Contact support.";
    case "AUDIT_WRITE_FAILED":
      return "The audit trail could not be written. The activation was rolled back. Try again.";
    case "INVALID_SLACK_BINDING_INPUT":
      return "Please provide both the Slack binding name and the env-var NAME for the bot token. The env-var NAME is the variable name on the deployment host — never paste the resolved bot token here.";
    case "INVALID_GOOGLE_BINDING_INPUT":
      return "Please provide both the Google Workspace binding name and the env-var NAME for the OAuth access token. The env-var NAME is the variable name on the deployment host — never paste the resolved OAuth access token here.";
    case "CONNECTOR_BINDING_FAILED":
      return "The connector binding could not be registered. Check that the binding name is unique for this organization and that the env-var name is UPPER_SNAKE_CASE.";
    default:
      return "Activation failed. Try again in a moment.";
  }
}

function ActivationStepCard({
  step,
}: {
  step: CtActivationStepResult;
}) {
  const label = getStepLabel(step.audit_literal);
  const isSlackBindingStep =
    step.step_id === "step.connector.slack-binding-register";
  const isGoogleBindingStep =
    step.step_id === "step.connector.google-workspace-binding-register";
  const isBindingStep = isSlackBindingStep || isGoogleBindingStep;
  // D6 enterprise dual-control detection: the catalog suffixes
  // dual-control-bound steps with _DUAL_CONTROL on the audit_literal
  // (steps 10 + 11 of the enterprise walk). The CT badge truthfully
  // records the catalog's design-intent — the actual dual-control
  // approval flow per ADR-0026 remains forward-substrate.
  const isDualControlStep = step.audit_literal.endsWith("_DUAL_CONTROL");
  const isHighlightedStep = isBindingStep || isDualControlStep;
  return (
    <div
      className={
        isHighlightedStep
          ? "rounded border-2 border-primary p-3"
          : "rounded border p-3"
      }
      data-testid={`activation-step-${step.step_order}`}
    >
      <div className="flex items-baseline gap-2">
        <Badge variant={isHighlightedStep ? "default" : "outline"}>
          Step {step.step_order}
        </Badge>
        <div className="font-medium">{label.title}</div>
        {isSlackBindingStep ? (
          <Badge variant="secondary" data-testid="slack-binding-highlight">
            Slack binding
          </Badge>
        ) : null}
        {isGoogleBindingStep ? (
          <Badge variant="secondary" data-testid="google-binding-highlight">
            Google binding
          </Badge>
        ) : null}
        {isDualControlStep ? (
          <Badge variant="secondary" data-testid="dual-control-highlight">
            DUAL-CONTROL
          </Badge>
        ) : null}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{label.summary}</div>
      <div className="text-xs text-muted-foreground mt-2 font-mono">
        audit_event_id {step.audit_event_id.slice(0, 8)}…
      </div>
    </div>
  );
}

function DandelionActivationCard() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CtActivationResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.dandelionActivation.activateStarterPilot(),
    onSuccess: (apiResult) => {
      if (apiResult.ok) {
        setResult(apiResult.data);
        setErrorMessage(
          apiResult.data.ok ? null : failureMessage(apiResult.data),
        );
      } else {
        setResult(null);
        setErrorMessage(
          apiResult.message.length > 0
            ? apiResult.message
            : "Activation request failed.",
        );
      }
    },
    onError: (err) => {
      setResult(null);
      setErrorMessage(
        err instanceof Error ? err.message : "Network error.",
      );
    },
  });

  const success = result !== null && result.ok ? result : null;

  return (
    <Card data-testid="dandelion-activation-card">
      <CardHeader>
        <CardTitle>Activate the starter pilot</CardTitle>
        <CardDescription>{ACTIVATION_DOCTRINE_LINE}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">
          {ACTIVATION_OUT_OF_SCOPE_LINE}
        </p>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          data-testid="activate-starter-pilot-button"
        >
          {mutation.isPending
            ? "Activating…"
            : success !== null
              ? "Activate again"
              : "Activate starter pilot"}
        </Button>
        {errorMessage !== null ? (
          <p
            className="text-xs text-destructive"
            data-testid="activation-error"
          >
            {errorMessage}
          </p>
        ) : null}
        {success !== null ? (
          <div className="space-y-2" data-testid="activation-success">
            <Separator />
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">Activated</Badge>
              <Badge variant="outline">archetype: {success.archetype}</Badge>
              <Badge variant="outline">
                plan_id: {success.plan_id}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Final audit_event_id{" "}
              {success.activation_audit_event_id.slice(0, 8)}…
            </div>
            <div className="space-y-2">
              {success.steps.map((step) => (
                <ActivationStepCard
                  key={step.step_order}
                  step={step}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Every step above appended one row to the Foundation
              audit trail. Open Security &amp; Audit to read the rows
              by audit_event_id.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// D6 Dandelion Stage F team-archetype activation admin walk surface.
// Consumes Foundation POST /api/v1/org/dandelion/activate/team
// (PR #198). Collects slack_display_name + slack_secret_ref +
// slack_workspace_id from the admin via form fields and POSTs.
//
// Privacy invariant:
// - slack_secret_ref is the env-var NAME on the deployment host;
//   the resolved env-var VALUE never crosses the API boundary.
// - Test suite asserts no concrete xoxb-* token regex appears in
//   the rendered output anywhere.
// ────────────────────────────────────────────────────────────────

const TEAM_ACTIVATION_DOCTRINE_LINE =
  "Activate the team rollout. Step 5 registers a read-first Slack workspace connection from the secure setup key on your deployment. Live API access stays disabled until a separate Founder-authorized deployment flip.";

const TEAM_ACTIVATION_PRIVACY_LINE =
  "The Slack env-var NAME field is the variable name on the deployment host (e.g. SLACK_BOT_TOKEN_PROD). Never paste the resolved bot token here. The resolved value never crosses the API boundary.";

function TeamActivationCard() {
  const [displayName, setDisplayName] = useState("");
  const [secretRef, setSecretRef] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CtActivationResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const input: CtTeamActivationInput = {
        slack_display_name: displayName.trim(),
        slack_secret_ref: secretRef.trim(),
      };
      if (workspaceId.trim().length > 0) {
        input.slack_workspace_id = workspaceId.trim();
      }
      return api.dandelionActivation.activateTeam(input);
    },
    onSuccess: (apiResult) => {
      if (apiResult.ok) {
        setResult(apiResult.data);
        setErrorMessage(
          apiResult.data.ok ? null : failureMessage(apiResult.data),
        );
      } else {
        setResult(null);
        setErrorMessage(
          apiResult.message.length > 0
            ? apiResult.message
            : "Activation request failed.",
        );
      }
    },
    onError: (err) => {
      setResult(null);
      setErrorMessage(
        err instanceof Error ? err.message : "Network error.",
      );
    },
  });

  const success = result !== null && result.ok ? result : null;
  const submitDisabled =
    mutation.isPending ||
    displayName.trim().length === 0 ||
    secretRef.trim().length === 0;

  return (
    <Card data-testid="dandelion-team-activation-card">
      <CardHeader>
        <CardTitle>Activate the team rollout</CardTitle>
        <CardDescription>{TEAM_ACTIVATION_DOCTRINE_LINE}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <Label htmlFor="team-slack-display-name">
            Slack binding name
          </Label>
          <Input
            id="team-slack-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. niov-prod-slack"
            data-testid="team-slack-display-name-input"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="team-slack-secret-ref">
            Slack env-var NAME
          </Label>
          <Input
            id="team-slack-secret-ref"
            value={secretRef}
            onChange={(e) => setSecretRef(e.target.value)}
            placeholder="e.g. SLACK_BOT_TOKEN_PROD"
            data-testid="team-slack-secret-ref-input"
          />
          <p
            className="text-xs text-muted-foreground"
            data-testid="team-privacy-notice"
          >
            {TEAM_ACTIVATION_PRIVACY_LINE}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="team-slack-workspace-id">
            Slack workspace (optional)
          </Label>
          <Input
            id="team-slack-workspace-id"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder="e.g. T01234ABCDE"
            data-testid="team-slack-workspace-id-input"
          />
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={submitDisabled}
          data-testid="activate-team-button"
        >
          {mutation.isPending
            ? "Activating…"
            : success !== null
              ? "Activate again"
              : "Activate team rollout"}
        </Button>
        {errorMessage !== null ? (
          <p
            className="text-xs text-destructive"
            data-testid="team-activation-error"
          >
            {errorMessage}
          </p>
        ) : null}
        {success !== null ? (
          <div className="space-y-2" data-testid="team-activation-success">
            <Separator />
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">Activated</Badge>
              <Badge variant="outline">archetype: {success.archetype}</Badge>
              <Badge variant="outline">
                plan_id: {success.plan_id}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Final audit_event_id{" "}
              {success.activation_audit_event_id.slice(0, 8)}…
            </div>
            <div className="space-y-2">
              {success.steps.map((step) => (
                <ActivationStepCard
                  key={step.step_order}
                  step={step}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Step 5 created a real Slack read-first binding. Open
              Connectors to see the new binding, or Security &amp; Audit
              to read the full lineage by audit_event_id.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// D6 Dandelion Stage F business-archetype activation admin walk
// surface. Consumes Foundation POST /api/v1/org/dandelion/activate/
// business (PR #200). Collects Slack + Google env-var NAMEs from
// the admin via form fields and POSTs. Renders 11-step audit
// lineage with both binding steps (6 + 7) highlighted.
//
// Privacy invariant:
// - slack_secret_ref + google_secret_ref are env-var NAMEs on the
//   deployment host; the resolved env-var VALUEs never cross the
//   API boundary.
// - Test suite asserts no concrete xoxb-* / ya29.* / private-key
//   JSON / Bearer regex appears in the rendered success panel.
// ────────────────────────────────────────────────────────────────

const BUSINESS_ACTIVATION_DOCTRINE_LINE =
  "Activate the business rollout. Steps 6 + 7 register read-first Slack + Google Workspace connections from the secure setup keys on your deployment. Live API access stays disabled until a separate Founder-authorized deployment flip.";

const BUSINESS_ACTIVATION_PRIVACY_LINE =
  "Both Slack and Google env-var NAME fields are variable names on the deployment host (e.g. SLACK_BOT_TOKEN_PROD + GOOGLE_ACCESS_TOKEN_PROD). Never paste the resolved bot token or OAuth access token here. The resolved values never cross the API boundary.";

function BusinessActivationCard() {
  const [slackDisplayName, setSlackDisplayName] = useState("");
  const [slackSecretRef, setSlackSecretRef] = useState("");
  const [slackWorkspaceId, setSlackWorkspaceId] = useState("");
  const [googleDisplayName, setGoogleDisplayName] = useState("");
  const [googleSecretRef, setGoogleSecretRef] = useState("");
  const [googleWorkspaceDomain, setGoogleWorkspaceDomain] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CtActivationResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const input: CtBusinessActivationInput = {
        slack_display_name: slackDisplayName.trim(),
        slack_secret_ref: slackSecretRef.trim(),
        google_display_name: googleDisplayName.trim(),
        google_secret_ref: googleSecretRef.trim(),
      };
      if (slackWorkspaceId.trim().length > 0) {
        input.slack_workspace_id = slackWorkspaceId.trim();
      }
      if (googleWorkspaceDomain.trim().length > 0) {
        input.google_workspace_domain = googleWorkspaceDomain.trim();
      }
      return api.dandelionActivation.activateBusiness(input);
    },
    onSuccess: (apiResult) => {
      if (apiResult.ok) {
        setResult(apiResult.data);
        setErrorMessage(
          apiResult.data.ok ? null : failureMessage(apiResult.data),
        );
      } else {
        setResult(null);
        // The API client lifts the upstream body's `code` field into
        // apiResult.code on non-2xx responses; if it matches a known
        // closed-vocab failure code, render the customer-admin
        // message instead of the raw Foundation message. This keeps
        // the customer-admin vocabulary discipline consistent across
        // both 200+ok:false and 4xx response paths.
        const synthetic = {
          ok: false as const,
          code: apiResult.code as CtActivationFailureCode,
          message: apiResult.message,
        };
        setErrorMessage(failureMessage(synthetic));
      }
    },
    onError: (err) => {
      setResult(null);
      setErrorMessage(
        err instanceof Error ? err.message : "Network error.",
      );
    },
  });

  const success = result !== null && result.ok ? result : null;
  const submitDisabled =
    mutation.isPending ||
    slackDisplayName.trim().length === 0 ||
    slackSecretRef.trim().length === 0 ||
    googleDisplayName.trim().length === 0 ||
    googleSecretRef.trim().length === 0;

  return (
    <Card data-testid="dandelion-business-activation-card">
      <CardHeader>
        <CardTitle>Activate the business rollout</CardTitle>
        <CardDescription>
          {BUSINESS_ACTIVATION_DOCTRINE_LINE}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <div className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
            Slack
          </div>
          <Label htmlFor="business-slack-display-name">
            Slack binding name
          </Label>
          <Input
            id="business-slack-display-name"
            value={slackDisplayName}
            onChange={(e) => setSlackDisplayName(e.target.value)}
            placeholder="e.g. niov-prod-slack"
            data-testid="business-slack-display-name-input"
          />
          <Label htmlFor="business-slack-secret-ref">
            Slack env-var NAME
          </Label>
          <Input
            id="business-slack-secret-ref"
            value={slackSecretRef}
            onChange={(e) => setSlackSecretRef(e.target.value)}
            placeholder="e.g. SLACK_BOT_TOKEN_PROD"
            data-testid="business-slack-secret-ref-input"
          />
          <Label htmlFor="business-slack-workspace-id">
            Slack workspace (optional)
          </Label>
          <Input
            id="business-slack-workspace-id"
            value={slackWorkspaceId}
            onChange={(e) => setSlackWorkspaceId(e.target.value)}
            placeholder="e.g. T01234ABCDE"
            data-testid="business-slack-workspace-id-input"
          />
        </div>
        <Separator />
        <div className="space-y-1">
          <div className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
            Google Workspace
          </div>
          <Label htmlFor="business-google-display-name">
            Google binding name
          </Label>
          <Input
            id="business-google-display-name"
            value={googleDisplayName}
            onChange={(e) => setGoogleDisplayName(e.target.value)}
            placeholder="e.g. niov-prod-google"
            data-testid="business-google-display-name-input"
          />
          <Label htmlFor="business-google-secret-ref">
            Google env-var NAME
          </Label>
          <Input
            id="business-google-secret-ref"
            value={googleSecretRef}
            onChange={(e) => setGoogleSecretRef(e.target.value)}
            placeholder="e.g. GOOGLE_ACCESS_TOKEN_PROD"
            data-testid="business-google-secret-ref-input"
          />
          <Label htmlFor="business-google-workspace-domain">
            Google workspace domain (optional)
          </Label>
          <Input
            id="business-google-workspace-domain"
            value={googleWorkspaceDomain}
            onChange={(e) => setGoogleWorkspaceDomain(e.target.value)}
            placeholder="e.g. niov.io"
            data-testid="business-google-workspace-domain-input"
          />
        </div>
        <p
          className="text-xs text-muted-foreground"
          data-testid="business-privacy-notice"
        >
          {BUSINESS_ACTIVATION_PRIVACY_LINE}
        </p>
        <Button
          onClick={() => mutation.mutate()}
          disabled={submitDisabled}
          data-testid="activate-business-button"
        >
          {mutation.isPending
            ? "Activating…"
            : success !== null
              ? "Activate again"
              : "Activate business rollout"}
        </Button>
        {errorMessage !== null ? (
          <p
            className="text-xs text-destructive"
            data-testid="business-activation-error"
          >
            {errorMessage}
          </p>
        ) : null}
        {success !== null ? (
          <div
            className="space-y-2"
            data-testid="business-activation-success"
          >
            <Separator />
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">Activated</Badge>
              <Badge variant="outline">archetype: {success.archetype}</Badge>
              <Badge variant="outline">
                plan_id: {success.plan_id}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Final audit_event_id{" "}
              {success.activation_audit_event_id.slice(0, 8)}…
            </div>
            <div className="space-y-2">
              {success.steps.map((step) => (
                <ActivationStepCard
                  key={step.step_order}
                  step={step}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Steps 6 + 7 created real Slack and Google Workspace
              read-first bindings. Open Connectors to see the new
              bindings, or Security &amp; Audit to read the full
              lineage by audit_event_id.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ────────────────────────────────────────────────────────────────
// D6 Dandelion Stage F enterprise-archetype activation admin walk
// surface. Consumes Foundation POST /api/v1/org/dandelion/activate/
// enterprise (PR #202). Collects Slack + Google env-var NAMEs from
// the admin via the same 6 form fields as BusinessActivationCard,
// POSTs the input, and renders the returned 14-step audit lineage
// with steps 8 + 9 highlighted (real connector bindings) AND steps
// 10 + 11 marked with DUAL-CONTROL badges (truthfully recording
// the catalog's design-intent; actual dual-control approval flow
// per ADR-0026 remains forward-substrate).
//
// Privacy invariant:
// - slack_secret_ref + google_secret_ref are env-var NAMEs on the
//   deployment host; the resolved env-var VALUEs never cross the
//   API boundary.
// - Test suite asserts no concrete xoxb-* / ya29.* / private-key
//   JSON / Bearer regex appears in the rendered success panel.
// ────────────────────────────────────────────────────────────────

const ENTERPRISE_ACTIVATION_DOCTRINE_LINE =
  "Activate the enterprise rollout. Steps 8 + 9 register read-first Slack + Google Workspace connections; steps 5 + 6 + 7 + 12 record governance surfaces at the audit tier (underlying substrate forward-substrate); steps 10 + 11 record dual-control design-intent. Live API access stays disabled until a separate Founder-authorized deployment flip.";

const ENTERPRISE_ACTIVATION_PRIVACY_LINE =
  "Both Slack and Google env-var NAME fields are variable names on the deployment host (e.g. SLACK_BOT_TOKEN_PROD + GOOGLE_ACCESS_TOKEN_PROD). Never paste the resolved bot token or OAuth access token here. The resolved values never cross the API boundary.";

function EnterpriseActivationCard() {
  const [slackDisplayName, setSlackDisplayName] = useState("");
  const [slackSecretRef, setSlackSecretRef] = useState("");
  const [slackWorkspaceId, setSlackWorkspaceId] = useState("");
  const [googleDisplayName, setGoogleDisplayName] = useState("");
  const [googleSecretRef, setGoogleSecretRef] = useState("");
  const [googleWorkspaceDomain, setGoogleWorkspaceDomain] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CtActivationResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const input: CtEnterpriseActivationInput = {
        slack_display_name: slackDisplayName.trim(),
        slack_secret_ref: slackSecretRef.trim(),
        google_display_name: googleDisplayName.trim(),
        google_secret_ref: googleSecretRef.trim(),
      };
      if (slackWorkspaceId.trim().length > 0) {
        input.slack_workspace_id = slackWorkspaceId.trim();
      }
      if (googleWorkspaceDomain.trim().length > 0) {
        input.google_workspace_domain = googleWorkspaceDomain.trim();
      }
      return api.dandelionActivation.activateEnterprise(input);
    },
    onSuccess: (apiResult) => {
      if (apiResult.ok) {
        setResult(apiResult.data);
        setErrorMessage(
          apiResult.data.ok ? null : failureMessage(apiResult.data),
        );
      } else {
        setResult(null);
        const synthetic = {
          ok: false as const,
          code: apiResult.code as CtActivationFailureCode,
          message: apiResult.message,
        };
        setErrorMessage(failureMessage(synthetic));
      }
    },
    onError: (err) => {
      setResult(null);
      setErrorMessage(
        err instanceof Error ? err.message : "Network error.",
      );
    },
  });

  const success = result !== null && result.ok ? result : null;
  const submitDisabled =
    mutation.isPending ||
    slackDisplayName.trim().length === 0 ||
    slackSecretRef.trim().length === 0 ||
    googleDisplayName.trim().length === 0 ||
    googleSecretRef.trim().length === 0;

  return (
    <Card data-testid="dandelion-enterprise-activation-card">
      <CardHeader>
        <CardTitle>Activate the enterprise rollout</CardTitle>
        <CardDescription>
          {ENTERPRISE_ACTIVATION_DOCTRINE_LINE}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <div className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
            Slack
          </div>
          <Label htmlFor="enterprise-slack-display-name">
            Slack binding name
          </Label>
          <Input
            id="enterprise-slack-display-name"
            value={slackDisplayName}
            onChange={(e) => setSlackDisplayName(e.target.value)}
            placeholder="e.g. niov-prod-slack"
            data-testid="enterprise-slack-display-name-input"
          />
          <Label htmlFor="enterprise-slack-secret-ref">
            Slack env-var NAME
          </Label>
          <Input
            id="enterprise-slack-secret-ref"
            value={slackSecretRef}
            onChange={(e) => setSlackSecretRef(e.target.value)}
            placeholder="e.g. SLACK_BOT_TOKEN_PROD"
            data-testid="enterprise-slack-secret-ref-input"
          />
          <Label htmlFor="enterprise-slack-workspace-id">
            Slack workspace (optional)
          </Label>
          <Input
            id="enterprise-slack-workspace-id"
            value={slackWorkspaceId}
            onChange={(e) => setSlackWorkspaceId(e.target.value)}
            placeholder="e.g. T01234ABCDE"
            data-testid="enterprise-slack-workspace-id-input"
          />
        </div>
        <Separator />
        <div className="space-y-1">
          <div className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
            Google Workspace
          </div>
          <Label htmlFor="enterprise-google-display-name">
            Google binding name
          </Label>
          <Input
            id="enterprise-google-display-name"
            value={googleDisplayName}
            onChange={(e) => setGoogleDisplayName(e.target.value)}
            placeholder="e.g. niov-prod-google"
            data-testid="enterprise-google-display-name-input"
          />
          <Label htmlFor="enterprise-google-secret-ref">
            Google env-var NAME
          </Label>
          <Input
            id="enterprise-google-secret-ref"
            value={googleSecretRef}
            onChange={(e) => setGoogleSecretRef(e.target.value)}
            placeholder="e.g. GOOGLE_ACCESS_TOKEN_PROD"
            data-testid="enterprise-google-secret-ref-input"
          />
          <Label htmlFor="enterprise-google-workspace-domain">
            Google workspace domain (optional)
          </Label>
          <Input
            id="enterprise-google-workspace-domain"
            value={googleWorkspaceDomain}
            onChange={(e) => setGoogleWorkspaceDomain(e.target.value)}
            placeholder="e.g. niov.io"
            data-testid="enterprise-google-workspace-domain-input"
          />
        </div>
        <p
          className="text-xs text-muted-foreground"
          data-testid="enterprise-privacy-notice"
        >
          {ENTERPRISE_ACTIVATION_PRIVACY_LINE}
        </p>
        <Button
          onClick={() => mutation.mutate()}
          disabled={submitDisabled}
          data-testid="activate-enterprise-button"
        >
          {mutation.isPending
            ? "Activating…"
            : success !== null
              ? "Activate again"
              : "Activate enterprise rollout"}
        </Button>
        {errorMessage !== null ? (
          <p
            className="text-xs text-destructive"
            data-testid="enterprise-activation-error"
          >
            {errorMessage}
          </p>
        ) : null}
        {success !== null ? (
          <div
            className="space-y-2"
            data-testid="enterprise-activation-success"
          >
            <Separator />
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary">Activated</Badge>
              <Badge variant="outline">archetype: {success.archetype}</Badge>
              <Badge variant="outline">
                plan_id: {success.plan_id}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Final audit_event_id{" "}
              {success.activation_audit_event_id.slice(0, 8)}…
            </div>
            <div className="space-y-2">
              {success.steps.map((step) => (
                <ActivationStepCard
                  key={step.step_order}
                  step={step}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Steps 8 + 9 created real Slack and Google Workspace
              read-first bindings. Steps 10 + 11 recorded dual-control
              design-intent at the audit tier (actual approval flow
              forward-substrate). Open Connectors to see the new
              bindings, or Security &amp; Audit to read the full
              lineage by audit_event_id.
            </p>
          </div>
        ) : null}
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
      <DandelionActivationCard />
      <TeamActivationCard />
      <BusinessActivationCard />
      <EnterpriseActivationCard />
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
      <ConnectorPriorityRankingPanel
        matrix={CATALOG.connector_priority_matrix}
      />
      <DandelionFlowPreview />
      <DmwEducationPanel dmw={CATALOG.dmw_education} />
      <GovernedEnvelopePanel />
    </div>
  );
}
