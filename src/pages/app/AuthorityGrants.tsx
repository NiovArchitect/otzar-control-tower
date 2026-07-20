// FILE: AuthorityGrants.tsx
// PURPOSE: Phase 4B — employee-facing page for managing the EDX-4
//          TwinAuthorityGrant substrate (PR Foundation #269/#270/
//          #271/#272). Lets the employee:
//            - see their active authority grants
//            - create a new grant (8 duration classes + 10
//              sensitivity classes + closed-vocab scope_type)
//            - revoke a grant they own
//
// PRIVACY INVARIANT:
//   - Never renders raw `constraints_json` / `connector_binding_id`
//     / `revoked_by_entity_id` / `grantor_entity_id` — the route's
//     safe-view projection already omits these but the UI
//     additionally never echoes them.
//   - No fear-based / surveillance / monitoring language.
//   - Always reminds the employee: indefinite ≠ unlimited; revoke
//     anytime; org policy still applies.
//
// CONNECTS TO: api.otzar.authorityGrants.*

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import type {
  CreateAuthorityGrantRequest,
  TwinAuthorityDurationClass,
  TwinAuthorityGrantSafeView,
  TwinAuthorityScopeType,
  TwinAuthoritySensitivityClass,
} from "@/lib/types/foundation";

const DURATION_CLASSES: ReadonlyArray<TwinAuthorityDurationClass> = [
  "ONE_TIME",
  "SESSION",
  "SHORT_TERM",
  "PROJECT_SCOPED",
  "LONG_TERM",
  "INDEFINITE",
  "UNTIL_REVOKED",
  "SENSITIVE_CASE_BY_CASE",
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

const SCOPE_TYPES: ReadonlyArray<TwinAuthorityScopeType> = [
  "PERSONAL",
  "SESSION",
  "PROJECT",
  "TEAM",
  "ORG",
  "CONNECTOR",
  "ACTION_TYPE",
  "WORKFLOW",
  "CONVERSATION",
];

function labelDuration(value: TwinAuthorityDurationClass): string {
  switch (value) {
    case "ONE_TIME":
      return "One time";
    case "SESSION":
      return "Session";
    case "SHORT_TERM":
      return "Short term";
    case "PROJECT_SCOPED":
      return "Project scoped";
    case "LONG_TERM":
      return "Long term";
    case "INDEFINITE":
      return "Indefinite";
    case "UNTIL_REVOKED":
      return "Until revoked";
    case "SENSITIVE_CASE_BY_CASE":
      return "Sensitive — case by case";
  }
}

function labelSensitivity(value: TwinAuthoritySensitivityClass): string {
  switch (value) {
    case "LOW":
      return "Low";
    case "MODERATE":
      return "Moderate";
    case "HIGH":
      return "High";
    case "REGULATED":
      return "Regulated";
    case "CUSTOMER_SENSITIVE":
      return "Customer sensitive";
    case "FINANCIAL":
      return "Financial";
    case "LEGAL":
      return "Legal";
    case "SECURITY":
      return "Security";
    case "PERSONAL_MEMORY":
      return "Personal memory";
    case "CONNECTOR_WRITE":
      return "Connector write";
  }
}

function labelState(value: string): string {
  return value.replace(/_/g, " ").toLowerCase();
}

export function AuthorityGrants() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["otzar", "authority-grants"],
    queryFn: () => api.otzar.authorityGrants.list(),
  });

  return (
    <div className="space-y-6" data-testid="authority-grants">
      <PageHeader
        title="Authority you have granted your AI Teammate"
        description="Choose what your AI Teammate may do for you, for how long, and revoke it whenever you want. Org policy, memory scope, audit, and approvals still apply."
      />

      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">A few honest reminders</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>Indefinite does not mean unlimited.</li>
          <li>
            All authority remains limited by org policy, memory scope,
            audit, and approvals.
          </li>
          <li>You can revoke this later.</li>
          <li>Connector writes may still be blocked by org policy.</li>
        </ul>
      </div>

      <CreateAuthorityGrantForm
        onCreated={() => queryClient.invalidateQueries({
          queryKey: ["otzar", "authority-grants"],
        })}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Active grants</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading && <Skeleton className="h-24 w-full" />}
          {list.data && list.data.ok && (
            <GrantList
              grants={list.data.data.grants}
              onRevoked={() => queryClient.invalidateQueries({
                queryKey: ["otzar", "authority-grants"],
              })}
            />
          )}
          {list.data && !list.data.ok && (
            <p className="text-sm text-destructive">
              Couldn't load grants. {list.data.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreateAuthorityGrantForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [scopeType, setScopeType] = useState<TwinAuthorityScopeType>("PERSONAL");
  const [durationClass, setDurationClass] =
    useState<TwinAuthorityDurationClass>("SESSION");
  const [sensitivityClass, setSensitivityClass] =
    useState<TwinAuthoritySensitivityClass>("MODERATE");
  const [purposeSummary, setPurposeSummary] = useState("");
  const [actionType, setActionType] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (body: CreateAuthorityGrantRequest) =>
      api.otzar.authorityGrants.create(body),
    onSuccess: (result) => {
      if (result.ok) {
        setPurposeSummary("");
        setActionType("");
        setScopeId("");
        setError(null);
        onCreated();
      } else {
        setError(result.message);
      }
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Error"),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (purposeSummary.trim().length === 0) {
      setError("Purpose summary is required.");
      return;
    }
    const body: CreateAuthorityGrantRequest = {
      scope_type: scopeType,
      duration_class: durationClass,
      sensitivity_class: sensitivityClass,
      purpose_summary: purposeSummary.trim(),
    };
    if (scopeId.trim().length > 0) body.scope_id = scopeId.trim();
    if (actionType.trim().length > 0) body.action_type = actionType.trim();
    create.mutate(body);
  }

  return (
    <Card data-testid="create-authority-grant-form">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Grant a new authority</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Purpose"
            id="grant-purpose"
            description="Plain-language reason for this authority."
          >
            <textarea
              id="grant-purpose"
              data-testid="grant-purpose"
              value={purposeSummary}
              onChange={(e) => setPurposeSummary(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Draft follow-up emails for me until Friday."
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Scope" id="grant-scope-type">
              <select
                id="grant-scope-type"
                data-testid="grant-scope-type"
                value={scopeType}
                onChange={(e) =>
                  setScopeType(e.target.value as TwinAuthorityScopeType)
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {SCOPE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Duration" id="grant-duration">
              <select
                id="grant-duration"
                data-testid="grant-duration"
                value={durationClass}
                onChange={(e) =>
                  setDurationClass(
                    e.target.value as TwinAuthorityDurationClass,
                  )
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {DURATION_CLASSES.map((d) => (
                  <option key={d} value={d}>
                    {labelDuration(d)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sensitivity" id="grant-sensitivity">
              <select
                id="grant-sensitivity"
                data-testid="grant-sensitivity"
                value={sensitivityClass}
                onChange={(e) =>
                  setSensitivityClass(
                    e.target.value as TwinAuthoritySensitivityClass,
                  )
                }
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {SENSITIVITY_CLASSES.map((s) => (
                  <option key={s} value={s}>
                    {labelSensitivity(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Scope id (optional)" id="grant-scope-id">
              <input
                id="grant-scope-id"
                data-testid="grant-scope-id"
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Project / session id (optional)"
              />
            </Field>
            <Field label="Action type (optional)" id="grant-action-type">
              <input
                id="grant-action-type"
                data-testid="grant-action-type"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="SEND_INTERNAL_NOTIFICATION, ..."
              />
            </Field>
          </div>

          {error && (
            <p className="text-sm text-destructive" data-testid="grant-error">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={create.isPending}
            data-testid="grant-submit"
          >
            {create.isPending ? "Granting…" : "Grant authority"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  description,
  children,
}: {
  label: string;
  id: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}

function GrantList({
  grants,
  onRevoked,
}: {
  grants: TwinAuthorityGrantSafeView[];
  onRevoked: () => void;
}) {
  if (grants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="grants-empty">
        No grants yet. Grant your AI Teammate its first authority above.
      </p>
    );
  }
  return (
    <ul className="space-y-3" data-testid="grants-list">
      {grants.map((g) => (
        <GrantRow key={g.grant_id} grant={g} onRevoked={onRevoked} />
      ))}
    </ul>
  );
}

function GrantRow({
  grant,
  onRevoked,
}: {
  grant: TwinAuthorityGrantSafeView;
  onRevoked: () => void;
}) {
  const queryClient = useQueryClient();
  const revoke = useMutation({
    mutationFn: () => api.otzar.authorityGrants.revoke(grant.grant_id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["otzar", "authority-grants"],
      });
      onRevoked();
    },
  });
  return (
    <li
      className="rounded-md border border-border bg-card px-4 py-3"
      data-testid={`grant-row-${grant.grant_id}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{labelDuration(grant.duration_class)}</Badge>
        <Badge variant="outline">{labelSensitivity(grant.sensitivity_class)}</Badge>
        <Badge variant="outline">{grant.scope_type.replace(/_/g, " ")}</Badge>
        <span className="text-xs text-muted-foreground">
          {labelState(grant.state)}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground">{grant.purpose_summary}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Granted {formatRelativeTime(grant.created_at)}
        {grant.expires_at &&
          ` · expires ${formatRelativeTime(grant.expires_at)}`}
      </p>
      {grant.has_connector_binding && (
        <p className="mt-1 text-xs text-muted-foreground">
          Connector binding attached (writes may still be blocked by org
          policy).
        </p>
      )}
      {grant.revocable && (
        <div className="mt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={revoke.isPending}
            onClick={() => revoke.mutate()}
            data-testid={`grant-revoke-${grant.grant_id}`}
          >
            {revoke.isPending ? "Revoking…" : "Revoke"}
          </Button>
        </div>
      )}
    </li>
  );
}
