// FILE: ConnectorsAdmin.tsx
// PURPOSE: Section 4 ConnectorBinding admin surface — operator-visible
//          CT page consuming the 5 LIVE Foundation admin routes at
//          /api/v1/org/connectors[/:id]. Graduates Section 4 Slack
//          from RUNTIME_READY (backend) toward OPERATING (admin can
//          self-serve binding creation today).
//
//          PRIVACY INVARIANT mirrors the Foundation page-1-rule:
//          ConnectorBindingView.secret_ref carries the env-var NAME
//          (e.g. "SLACK_BOT_TOKEN_PROD"); the resolved env-var VALUE
//          never crosses the API boundary and this page never
//          attempts to display, decode, or fetch the resolved value.
//          The form prompts admins for the env-var NAME only, and
//          renders an explicit warning that the resolved value is
//          NEVER displayed.
// CONNECTS TO: src/lib/connectors/types.ts (shared shapes),
//              src/lib/connectors/data.ts (closed-vocab type registry
//              mirror), src/lib/api.ts (api.connectors namespace),
//              src/lib/nav.ts (Connectors NAV entry).

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import {
  CT_CONNECTOR_REGISTRY,
  getCtConnectorTypeDefinition,
  getSelectableConnectorTypes,
} from "@/lib/connectors/data";
import type {
  ConnectorBindingView,
  CtConnectorType,
} from "@/lib/connectors/types";

const PRIVACY_NOTICE =
  "The secret_ref field is the env-var NAME on the deployment host. The resolved env-var value (e.g. a bot token) never crosses the API boundary and this page never attempts to display, decode, or fetch it.";

const ENABLED_BY_DEFAULT_NOTICE =
  "New bindings are read-only at the connector tier — write capabilities are disabled at the runtime layer and require separate Founder authorization (forward-substrate to ≥C6).";

const FOUNDER_DOCTRINE_LINE =
  "Billing entitles availability; Foundation governance authorizes activation. Map-region approval per ADR-0082 Amendment 1 remains stronger than entitlement.";

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function BindingCard({
  binding,
  onToggleEnabled,
  onDelete,
  toggleBusy,
  deleteBusy,
}: {
  binding: ConnectorBindingView;
  onToggleEnabled: (binding: ConnectorBindingView) => void;
  onDelete: (binding: ConnectorBindingView) => void;
  toggleBusy: boolean;
  deleteBusy: boolean;
}) {
  const typeDef = getCtConnectorTypeDefinition(binding.type);
  return (
    <Card data-testid={`binding-${binding.binding_id}`}>
      <CardHeader>
        <CardTitle>{binding.display_name}</CardTitle>
        <CardDescription>
          {typeDef?.display_name ?? binding.type}
          {typeDef?.short_description ? ` — ${typeDef.short_description}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-1">
          <Badge variant={binding.enabled ? "secondary" : "outline"}>
            {binding.enabled ? "Enabled" : "Disabled"}
          </Badge>
          <Badge variant="outline">Type: {binding.type}</Badge>
          <Badge variant="outline">Read-first (no writes at C2)</Badge>
        </div>
        <div>
          <div className="font-medium">Secret env-var name</div>
          <div className="text-muted-foreground">
            {binding.secret_ref ?? "—"}
            <span className="ml-2 text-xs italic">
              (env-var NAME only; resolved value never displayed)
            </span>
          </div>
        </div>
        <div>
          <div className="font-medium">Config keys</div>
          <div className="text-muted-foreground">
            {Object.keys(binding.config).length === 0
              ? "—"
              : Object.keys(binding.config).join(", ")}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Created {formatTimestamp(binding.created_at)} · Updated{" "}
          {formatTimestamp(binding.updated_at)} · binding_id{" "}
          {binding.binding_id.slice(0, 8)}…
        </div>
        <Separator />
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggleEnabled(binding)}
            disabled={toggleBusy}
            data-testid={`toggle-${binding.binding_id}`}
          >
            {binding.enabled ? "Disable" : "Enable"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(binding)}
            disabled={deleteBusy}
            data-testid={`delete-${binding.binding_id}`}
          >
            Soft-delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState<CtConnectorType>("SLACK_READ");
  const [displayName, setDisplayName] = useState("");
  const [secretRef, setSecretRef] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const typeDef = getCtConnectorTypeDefinition(type);
      const config: Record<string, unknown> = {};
      if (type === "SLACK_READ") {
        config["use_real"] = false;
        config["workspace_id"] = displayName.trim() || "pending";
      } else if (type === "OUTBOUND_WEBHOOK") {
        config["url"] = "";
      }
      return api.connectors.register({
        type,
        display_name: displayName.trim(),
        config,
        secret_ref: typeDef?.secret_ref_required
          ? secretRef.trim()
          : null,
      });
    },
    onSuccess: (result) => {
      if (result.ok) {
        setDisplayName("");
        setSecretRef("");
        setErrorMessage(null);
        onSuccess();
      } else {
        setErrorMessage(
          result.message ?? result.code ?? "Registration failed",
        );
      }
    },
    onError: (err) => {
      setErrorMessage(err instanceof Error ? err.message : "Network error");
    },
  });

  const selectableTypes = getSelectableConnectorTypes();
  const typeDef = getCtConnectorTypeDefinition(type);
  const submitDisabled =
    mutation.isPending ||
    displayName.trim().length === 0 ||
    (typeDef?.secret_ref_required === true && secretRef.trim().length === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Register a new ConnectorBinding</CardTitle>
        <CardDescription>{FOUNDER_DOCTRINE_LINE}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="space-y-1">
          <Label htmlFor="connector-type">Connector type</Label>
          <Select
            value={type}
            onValueChange={(v) => setType(v as CtConnectorType)}
          >
            <SelectTrigger id="connector-type" data-testid="connector-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {selectableTypes.map((def) => (
                <SelectItem key={def.type} value={def.type}>
                  {def.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {typeDef ? (
            <p className="text-xs text-muted-foreground">
              {typeDef.short_description}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. niov-prod-slack"
            data-testid="display-name-input"
          />
        </div>
        {typeDef?.secret_ref_required ? (
          <div className="space-y-1">
            <Label htmlFor="secret-ref">Secret env-var NAME</Label>
            <Input
              id="secret-ref"
              value={secretRef}
              onChange={(e) => setSecretRef(e.target.value)}
              placeholder="e.g. SLACK_BOT_TOKEN_PROD"
              data-testid="secret-ref-input"
            />
            <p className="text-xs text-muted-foreground" data-testid="privacy-notice">
              {PRIVACY_NOTICE}
            </p>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">{ENABLED_BY_DEFAULT_NOTICE}</p>
        {errorMessage ? (
          <p className="text-xs text-destructive" data-testid="register-error">
            {errorMessage}
          </p>
        ) : null}
        <Button
          onClick={() => mutation.mutate()}
          disabled={submitDisabled}
          data-testid="register-submit"
        >
          {mutation.isPending ? "Registering…" : "Register binding"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DoctrineCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Posture & doctrine</CardTitle>
        <CardDescription>{FOUNDER_DOCTRINE_LINE}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>{PRIVACY_NOTICE}</p>
        <p>{ENABLED_BY_DEFAULT_NOTICE}</p>
        <Separator />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div>
            <p className="font-medium">This page can</p>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Register a new ConnectorBinding (admin gated)</li>
              <li>List existing bindings (org-scoped)</li>
              <li>Enable / disable a binding</li>
              <li>Soft-delete a binding (RULE 10)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">This page cannot</p>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Display the resolved bot token / signing secret</li>
              <li>Invoke connector writes (deferred to ≥C6)</li>
              <li>Bypass Foundation governance</li>
              <li>Act outside the caller's org boundary</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TypeRegistryCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Available connector types</CardTitle>
        <CardDescription>
          Mirror of Foundation CONNECTOR_REGISTRY at PR #185.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {CT_CONNECTOR_REGISTRY.filter((def) => !def.hidden_from_admin_selection).map(
          (def) => (
            <div
              key={def.type}
              className="rounded border p-2"
              data-testid={`type-${def.type}`}
            >
              <div className="font-medium">{def.display_name}</div>
              <div className="text-muted-foreground">{def.short_description}</div>
              <div className="text-xs text-muted-foreground">
                Required config keys:{" "}
                {def.required_config_keys.length === 0
                  ? "—"
                  : def.required_config_keys.join(", ")}
              </div>
            </div>
          ),
        )}
      </CardContent>
    </Card>
  );
}

export function ConnectorsAdminPage() {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ["connectors", "list"],
    queryFn: () => api.connectors.list(),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["connectors", "list"] });
  };

  const toggleMutation = useMutation({
    mutationFn: (binding: ConnectorBindingView) =>
      api.connectors.update(binding.binding_id, { enabled: !binding.enabled }),
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: (binding: ConnectorBindingView) =>
      api.connectors.delete(binding.binding_id),
    onSuccess: refresh,
  });

  const result = listQuery.data;
  const bindings: ConnectorBindingView[] =
    result && result.ok ? result.data.bindings : [];
  const errorMessage =
    result && !result.ok
      ? result.message ?? result.code ?? "Failed to load bindings"
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connectors"
        description="Register and manage governed ConnectorBindings. Section 4 Slack is RUNTIME_READY at Foundation."
      />
      <DoctrineCard />
      <TypeRegistryCard />
      <RegisterForm onSuccess={refresh} />
      <section data-testid="bindings-section">
        <Card>
          <CardHeader>
            <CardTitle>Existing bindings</CardTitle>
            <CardDescription>
              Org-scoped list of ConnectorBindings registered on this tenant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {listQuery.isLoading ? (
              <p data-testid="loading-state">Loading…</p>
            ) : errorMessage ? (
              <p className="text-destructive" data-testid="list-error">
                {errorMessage}
              </p>
            ) : bindings.length === 0 ? (
              <p data-testid="empty-state">
                No bindings registered yet. Use the registration form above to
                add the first one.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {bindings.map((binding) => (
                  <BindingCard
                    key={binding.binding_id}
                    binding={binding}
                    onToggleEnabled={(b) => toggleMutation.mutate(b)}
                    onDelete={(b) => deleteMutation.mutate(b)}
                    toggleBusy={toggleMutation.isPending}
                    deleteBusy={deleteMutation.isPending}
                  />
                ))}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Listing surface honors the can_admin_org gate at the Foundation
              route tier; the soft-delete action follows RULE 10 (rows are
              never hard-deleted; deleted_at timestamps are set).
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
