// FILE: CollaborationPolicy.tsx
// PURPOSE: Phase 4F — admin can_admin_org page for the
//          OrgCollaborationPolicy substrate (Foundation #284/#286).
//          Lets the org admin shape the operating envelope for
//          autonomous collaboration WITHOUT making employee
//          permissions a per-request blocker.
//
// PRESETS (per FOUNDER-CLARITY autonomous flow): the form exposes
// quick presets — "Autonomous Internal Flow" / "Conservative" /
// "Highly Autonomous" — that prefill the policy row fields to
// sensible defaults. Admins can then tweak per scope.
//
// PRIVACY INVARIANT: never displays raw secrets; the page only
// renders policy metadata returned by the route's safe view.
// CONNECTS TO: api.orgCollaborationPolicy.{list, upsert}.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type {
  OrgCollaborationOutcome,
  OrgCollaborationPolicySafeView,
  OrgCollaborationScope,
  TwinAuthoritySensitivityClass,
  TwinCollaborationRequestType,
  UpsertOrgCollaborationPolicyRequest,
} from "@/lib/types/foundation";

const SCOPES: ReadonlyArray<OrgCollaborationScope> = [
  "SAME_TEAM",
  "SAME_PROJECT",
  "CROSS_TEAM",
  "CROSS_PROJECT",
  "ORG_WIDE",
];
const OUTCOMES: ReadonlyArray<OrgCollaborationOutcome> = [
  "ALLOW",
  "NEEDS_APPROVAL",
  "BLOCK",
  "DRAFT_ONLY",
  "DUAL_CONTROL_REQUIRED",
];
const REQUEST_TYPES: ReadonlyArray<TwinCollaborationRequestType> = [
  "STATUS_REQUEST",
  "REVIEW_REQUEST",
  "BLOCKER_RESOLUTION",
  "FOLLOW_UP",
  "HANDOFF",
  "CONTEXT_REQUEST",
  "APPROVAL_REQUEST",
  "PROJECT_COORDINATION",
  "CROSS_TEAM_COORDINATION",
  "WORKFLOW_COORDINATION",
];
const SENSITIVITY_CLASSES: ReadonlyArray<TwinAuthoritySensitivityClass> = [
  "LOW",
  "MODERATE",
  "HIGH",
  "REGULATED",
  "CUSTOMER_SENSITIVE",
  "FINANCIAL",
  "LEGAL",
  "SECURITY",
  "PERSONAL_MEMORY",
  "CONNECTOR_WRITE",
];

// Quick-preset bundles — these are UI-only convenience. Each
// preset is materialized as a sequence of upsert calls when the
// admin clicks Apply.
type PresetRow = Omit<UpsertOrgCollaborationPolicyRequest, "outcome"> & {
  outcome: OrgCollaborationOutcome;
};

const PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  rows: ReadonlyArray<PresetRow>;
}> = [
  {
    id: "autonomous-internal-flow",
    label: "Autonomous internal flow",
    description:
      "Same-team and same-project work flows automatically. Cross-team / cross-project needs approval. Sensitive domains require dual-control. External writes draft-only.",
    rows: [
      { collaboration_scope: "SAME_TEAM", outcome: "ALLOW" },
      { collaboration_scope: "SAME_PROJECT", outcome: "ALLOW" },
      { collaboration_scope: "CROSS_TEAM", outcome: "NEEDS_APPROVAL" },
      { collaboration_scope: "CROSS_PROJECT", outcome: "NEEDS_APPROVAL" },
      { collaboration_scope: "ORG_WIDE", outcome: "NEEDS_APPROVAL" },
    ],
  },
  {
    id: "conservative",
    label: "Conservative",
    description:
      "Same-team / same-project allow status + follow-up only. Cross-* needs approval. Sensitive dual-control. Connector writes blocked.",
    rows: [
      {
        collaboration_scope: "SAME_TEAM",
        request_type: "STATUS_REQUEST",
        outcome: "ALLOW",
      },
      {
        collaboration_scope: "SAME_TEAM",
        request_type: "FOLLOW_UP",
        outcome: "ALLOW",
      },
      {
        collaboration_scope: "SAME_PROJECT",
        request_type: "STATUS_REQUEST",
        outcome: "ALLOW",
      },
      {
        collaboration_scope: "SAME_PROJECT",
        request_type: "FOLLOW_UP",
        outcome: "ALLOW",
      },
      { collaboration_scope: "CROSS_TEAM", outcome: "NEEDS_APPROVAL" },
      { collaboration_scope: "CROSS_PROJECT", outcome: "NEEDS_APPROVAL" },
    ],
  },
  {
    id: "highly-autonomous",
    label: "Highly autonomous",
    description:
      "Same-team / same-project allow. Cross-team status / follow-up allowed. Cross-project status / follow-up needs approval. Sensitive dual-control.",
    rows: [
      { collaboration_scope: "SAME_TEAM", outcome: "ALLOW" },
      { collaboration_scope: "SAME_PROJECT", outcome: "ALLOW" },
      {
        collaboration_scope: "CROSS_TEAM",
        request_type: "STATUS_REQUEST",
        outcome: "ALLOW",
      },
      {
        collaboration_scope: "CROSS_TEAM",
        request_type: "FOLLOW_UP",
        outcome: "ALLOW",
      },
      {
        collaboration_scope: "CROSS_PROJECT",
        request_type: "STATUS_REQUEST",
        outcome: "NEEDS_APPROVAL",
      },
      { collaboration_scope: "ORG_WIDE", outcome: "NEEDS_APPROVAL" },
    ],
  },
];

function labelOutcome(o: OrgCollaborationOutcome): string {
  switch (o) {
    case "ALLOW":
      return "Allow";
    case "NEEDS_APPROVAL":
      return "Needs approval";
    case "BLOCK":
      return "Block";
    case "DRAFT_ONLY":
      return "Draft only";
    case "DUAL_CONTROL_REQUIRED":
      return "Dual control";
  }
}

export function CollaborationPolicy() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["org-collab-policy", "list"],
    queryFn: () => api.orgCollaborationPolicy.list(),
  });

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: ["org-collab-policy"],
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collaboration policy"
        description="Define your org's operating envelope. Employee authority controls what each employee's Twin may do inside that envelope; org policy cannot override employee revocation."
      />

      <PresetsCard onApplied={invalidate} />

      <UpsertPolicyForm onUpserted={invalidate} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Active policy rows</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading && <Skeleton className="h-24 w-full" />}
          {list.data && list.data.ok && (
            <PolicyList policies={list.data.data.policies} />
          )}
          {list.data && !list.data.ok && (
            <p className="text-sm text-destructive">{list.data.message}</p>
          )}
        </CardContent>
      </Card>

      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Rule precedence</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Org policy defines the operating envelope.</li>
          <li>Employee authority controls what each employee's Twin may do inside that envelope.</li>
          <li>Employee authority cannot override org policy.</li>
          <li>Org policy cannot override employee revocation.</li>
          <li>Connector writes remain blocked / draft-only unless explicitly authorized.</li>
          <li>Legal / financial / security / customer-sensitive default to dual-control.</li>
        </ul>
      </div>
    </div>
  );
}

function PresetsCard({ onApplied }: { onApplied: () => void }) {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (preset === undefined) return;
    setApplyingId(presetId);
    setError(null);
    try {
      for (const row of preset.rows) {
        const result = await api.orgCollaborationPolicy.upsert(row);
        if (!result.ok) {
          setError(result.message);
          break;
        }
      }
      onApplied();
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <Card data-testid="presets-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quick presets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PRESETS.map((p) => (
            <div
              key={p.id}
              className="rounded-md border border-border bg-card px-4 py-3"
              data-testid={`preset-${p.id}`}
            >
              <p className="text-sm font-medium text-foreground">{p.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {p.description}
              </p>
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={applyingId !== null}
                  onClick={() => applyPreset(p.id)}
                  data-testid={`preset-apply-${p.id}`}
                >
                  {applyingId === p.id ? "Applying…" : "Apply preset"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        {error && (
          <p className="mt-3 text-sm text-destructive" data-testid="preset-error">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UpsertPolicyForm({ onUpserted }: { onUpserted: () => void }) {
  const [scope, setScope] = useState<OrgCollaborationScope>("CROSS_TEAM");
  const [outcome, setOutcome] = useState<OrgCollaborationOutcome>("NEEDS_APPROVAL");
  const [requestType, setRequestType] = useState<TwinCollaborationRequestType | "">("");
  const [sensitivityClass, setSensitivityClass] = useState<TwinAuthoritySensitivityClass | "">("");
  const [connectorWriteAllowed, setConnectorWriteAllowed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upsert = useMutation({
    mutationFn: (body: UpsertOrgCollaborationPolicyRequest) =>
      api.orgCollaborationPolicy.upsert(body),
    onSuccess: (result) => {
      if (result.ok) {
        setError(null);
        onUpserted();
      } else {
        setError(result.message);
      }
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body: UpsertOrgCollaborationPolicyRequest = {
      collaboration_scope: scope,
      outcome,
      connector_write_allowed: connectorWriteAllowed,
    };
    if (requestType !== "") body.request_type = requestType;
    if (sensitivityClass !== "") body.sensitivity_class = sensitivityClass;
    upsert.mutate(body);
  }

  return (
    <Card data-testid="upsert-policy-form">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Add / update a policy row</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Scope" id="pol-scope">
              <select
                id="pol-scope"
                data-testid="pol-scope"
                value={scope}
                onChange={(e) =>
                  setScope(e.target.value as OrgCollaborationScope)
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {SCOPES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Outcome" id="pol-outcome">
              <select
                id="pol-outcome"
                data-testid="pol-outcome"
                value={outcome}
                onChange={(e) =>
                  setOutcome(e.target.value as OrgCollaborationOutcome)
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {labelOutcome(o)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Request type (optional)" id="pol-rtype">
              <select
                id="pol-rtype"
                data-testid="pol-rtype"
                value={requestType}
                onChange={(e) =>
                  setRequestType(
                    e.target.value as TwinCollaborationRequestType | "",
                  )
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Any —</option>
                {REQUEST_TYPES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sensitivity (optional)" id="pol-sensitivity">
              <select
                id="pol-sensitivity"
                data-testid="pol-sensitivity"
                value={sensitivityClass}
                onChange={(e) =>
                  setSensitivityClass(
                    e.target.value as TwinAuthoritySensitivityClass | "",
                  )
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Any —</option>
                {SENSITIVITY_CLASSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              data-testid="pol-connector-write"
              checked={connectorWriteAllowed}
              onChange={(e) => setConnectorWriteAllowed(e.target.checked)}
            />
            <span>
              Connector write allowed for this row (Founder-gated — only check
              when explicitly authorized)
            </span>
          </label>
          {error && (
            <p className="text-sm text-destructive" data-testid="pol-error">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={upsert.isPending}
            data-testid="pol-submit"
          >
            {upsert.isPending ? "Saving…" : "Save policy row"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function PolicyList({
  policies,
}: {
  policies: OrgCollaborationPolicySafeView[];
}) {
  if (policies.length === 0) {
    return (
      <p
        className="text-sm text-muted-foreground"
        data-testid="policies-empty"
      >
        No policy rows yet. Pick a preset above or add one manually.
      </p>
    );
  }
  return (
    <ul className="space-y-3" data-testid="policies-list">
      {policies.map((p) => (
        <li
          key={p.policy_id}
          className="rounded-md border border-border bg-card px-4 py-3 text-sm"
          data-testid={`policy-row-${p.policy_id}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{p.collaboration_scope.replace(/_/g, " ")}</Badge>
            <Badge variant="outline">{labelOutcome(p.outcome)}</Badge>
            {p.request_type && (
              <Badge variant="outline">
                {p.request_type.replace(/_/g, " ")}
              </Badge>
            )}
            {p.sensitivity_class && (
              <Badge variant="outline">
                {p.sensitivity_class.replace(/_/g, " ")}
              </Badge>
            )}
            {p.connector_write_allowed && (
              <Badge variant="destructive">connector write allowed</Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
