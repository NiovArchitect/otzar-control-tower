// FILE: ConnectorRailsAdmin.tsx
// PURPOSE: Phase 6 — admin can_admin_org page for the connector +
//          MCP rails substrate (Foundation #296/#298). Three
//          sub-sections on one page:
//
//            1. Connector providers (read-only catalog of 14)
//            2. MCP server connections (per-tenant; secret_ref input
//               accepts vault PATHS only — never raw secrets)
//            3. MCP tool policies (per-tool ALLOW/NEEDS_APPROVAL/
//               BLOCK/DRAFT_ONLY/DUAL_CONTROL_REQUIRED)
//
//          ConnectorScopeGrant is a forward-substrate UI surface;
//          this slice ships the read-list + revoke control, but the
//          create-flow lives behind the existing /connectors page
//          where the ConnectorBinding it grants on top of lives.
//
// PRIVACY INVARIANT:
//   - secret_ref is rendered as text but the input + display copy
//     calls it a "vault path" and shows guidance on the format. The
//     route's server-side shape check rejects values that LOOK like
//     raw secrets, so a paste-mistake fails at the API tier with
//     a closed-vocab code.
//   - No customer credential ever lives in the SPA bundle. Build-time
//     env vars do NOT carry tenant secrets per the three-tier
//     credential separation in docs/deployment/cloud-portability.md
//     §2.2.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  ConnectorProviderDefinition,
  CreateMcpServerConnectionRequest,
  CreateMcpToolPolicyRequest,
  McpOperationClass,
  McpPolicyOutcome,
  McpServerConnectionView,
  McpToolPolicyView,
  OAuthConnectionStatus,
  OAuthStatusRow,
} from "@/lib/types/foundation";

// Phase 1261 — humanized closed-vocab copy for OAuth connection
// statuses. Exhaustive Record: a new status can't render raw.
const OAUTH_STATUS_COPY: Record<OAuthConnectionStatus, string> = {
  APP_CREDENTIALS_MISSING: "Needs app credentials",
  READY_FOR_CONSENT: "Ready to connect",
  CONNECTED_UNVERIFIED: "Connected — verify to confirm",
  VERIFIED: "Verified",
  ERROR_NEEDS_RECONNECT: "Needs reconnect",
  REVOKED: "Revoked",
};

function OAuthProviderRow({
  row,
  onChanged,
}: {
  row: OAuthStatusRow;
  onChanged: () => void;
}) {
  const start = useMutation({
    mutationFn: () => api.otzar.oauthStart(row.slug),
    onSuccess: (result) => {
      if (result.ok) {
        window.open(result.data.authorize_url, "_blank");
        toast.success(
          `Continue the ${row.display_name} consent in your browser, then come back and press Verify.`,
        );
      } else {
        toast.error(
          "Couldn't start the connection — check that the app credentials are configured on the server.",
        );
      }
    },
  });
  const verify = useMutation({
    mutationFn: () => api.otzar.oauthVerify(row.slug),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`${row.display_name} verified — the connection works.`);
      } else {
        toast.error(
          `${row.display_name} verification failed — reconnect from this card.`,
        );
      }
      onChanged();
    },
  });
  const revoke = useMutation({
    mutationFn: () => api.otzar.oauthRevoke(row.slug),
    onSuccess: () => {
      toast.success(`${row.display_name} connection revoked.`);
      onChanged();
    },
  });
  const connected =
    row.status === "CONNECTED_UNVERIFIED" ||
    row.status === "VERIFIED" ||
    row.status === "ERROR_NEEDS_RECONNECT";
  return (
    <Card
      data-testid="oauth-provider-row"
      data-provider={row.provider}
      data-status={row.status}
    >
      <CardContent className="pt-4 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">{row.display_name}</span>
          <Badge variant="outline" data-testid="oauth-status-badge">
            {OAUTH_STATUS_COPY[row.status]}
          </Badge>
        </div>
        {row.account_label !== null ? (
          <div className="text-muted-foreground">
            Workspace: {row.account_label}
          </div>
        ) : null}
        {row.last_verified_at !== null ? (
          <div className="text-muted-foreground">
            Last verified: {new Date(row.last_verified_at).toLocaleString()}
          </div>
        ) : null}
        {row.status === "APP_CREDENTIALS_MISSING" ? (
          <p className="text-muted-foreground">
            Create the OAuth app in the provider console first — the exact
            steps live in the setup runbook. Credentials go in the server
            deployment, never here.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            data-testid="oauth-connect-button"
            disabled={
              row.status === "APP_CREDENTIALS_MISSING" || start.isPending
            }
            onClick={() => start.mutate()}
          >
            {start.isPending
              ? "Opening…"
              : connected
                ? "Reconnect"
                : "Connect"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-testid="oauth-verify-button"
            disabled={!connected || verify.isPending}
            onClick={() => verify.mutate()}
          >
            {verify.isPending ? "Verifying…" : "Verify"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-testid="oauth-revoke-button"
            disabled={!connected || revoke.isPending}
            onClick={() => revoke.mutate()}
          >
            {revoke.isPending ? "Revoking…" : "Revoke"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const MCP_OPERATION_CLASSES: ReadonlyArray<McpOperationClass> = [
  "READ",
  "WRITE",
  "MUTATION",
  "EXTERNAL_SEND",
  "FINANCIAL",
  "LEGAL",
  "SECURITY",
  "CUSTOMER_SENSITIVE",
];

const MCP_POLICY_OUTCOMES: ReadonlyArray<McpPolicyOutcome> = [
  "ALLOW",
  "NEEDS_APPROVAL",
  "BLOCK",
  "DRAFT_ONLY",
  "DUAL_CONTROL_REQUIRED",
];

function ProviderCard({ provider }: { provider: ConnectorProviderDefinition }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{provider.display_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="text-muted-foreground">{provider.provider_id}</div>
        <div className="flex flex-wrap gap-1">
          {provider.read_supported ? (
            <Badge variant="secondary">read</Badge>
          ) : null}
          {provider.draft_supported ? (
            <Badge variant="secondary">draft</Badge>
          ) : null}
          {provider.write_supported ? (
            <Badge variant="secondary">write</Badge>
          ) : null}
        </div>
        <div>
          <span className="text-muted-foreground">Default write mode: </span>
          <Badge variant="outline">{provider.default_write_mode}</Badge>
        </div>
        {provider.connector_write_founder_gated ? (
          <div className="text-amber-600">
            Writes require Founder authorization
          </div>
        ) : null}
        <div className="text-muted-foreground">
          {provider.supported_auth_modes.join(", ")}
        </div>
        {provider.compliance_tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {provider.compliance_tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function NewMcpConnectionForm({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [secretRef, setSecretRef] = useState("");

  const create = useMutation({
    mutationFn: (body: CreateMcpServerConnectionRequest) =>
      api.connectorRails.createMcpConnection(body),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`Created ${result.data.connection.display_name}`);
        setDisplayName("");
        setServerUrl("");
        setSecretRef("");
        onCreated();
      } else {
        toast.error(`Create rejected: ${result.code}`);
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">New MCP server connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="mcp-display-name">Display name</Label>
          <Input
            id="mcp-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Customer MCP server"
          />
        </div>
        <div>
          <Label htmlFor="mcp-server-url">Server URL</Label>
          <Input
            id="mcp-server-url"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://mcp.example.com"
          />
        </div>
        <div>
          <Label htmlFor="mcp-secret-ref">Vault path (secret_ref)</Label>
          <Input
            id="mcp-secret-ref"
            value={secretRef}
            onChange={(e) => setSecretRef(e.target.value)}
            placeholder="niov/tenants/<your-org-id>/mcp/<connection-id>/secret"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Paste the vault PATH only — never a raw API key. The server
            rejects values that look like raw secrets.
          </p>
        </div>
        <Button
          onClick={() =>
            create.mutate({
              display_name: displayName,
              server_url: serverUrl,
              ...(secretRef.length > 0 ? { secret_ref: secretRef } : {}),
            })
          }
          disabled={
            create.isPending ||
            displayName.length === 0 ||
            serverUrl.length === 0
          }
        >
          {create.isPending ? "Creating…" : "Create"}
        </Button>
      </CardContent>
    </Card>
  );
}

function McpConnectionRow({
  connection,
  onRevoke,
}: {
  connection: McpServerConnectionView;
  onRevoke: () => void;
}) {
  const revoke = useMutation({
    mutationFn: () => api.connectorRails.revokeMcpConnection(connection.mcp_connection_id),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`Revoked ${result.data.connection.display_name}`);
        onRevoke();
      } else {
        toast.error("Revoke failed");
      }
    },
  });
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">{connection.display_name}</div>
          <Badge>{connection.status}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">{connection.server_url}</div>
        <div className="text-xs">
          <span className="text-muted-foreground">Tool policy mode: </span>
          <Badge variant="outline">{connection.tool_policy_mode}</Badge>
        </div>
        {connection.secret_ref !== null ? (
          <div className="text-xs text-muted-foreground">
            Vault path configured (value not displayed)
          </div>
        ) : (
          <div className="text-xs text-amber-600">No vault path configured</div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => revoke.mutate()}
          disabled={revoke.isPending || connection.revoked_at !== null}
        >
          {connection.revoked_at !== null
            ? "Revoked"
            : revoke.isPending
              ? "Revoking…"
              : "Revoke"}
        </Button>
      </CardContent>
    </Card>
  );
}

function NewMcpPolicyForm({
  connections,
  onCreated,
}: {
  connections: McpServerConnectionView[];
  onCreated: () => void;
}) {
  const activeConnections = useMemo(
    () => connections.filter((c) => c.revoked_at === null),
    [connections],
  );
  const [mcpConnectionId, setMcpConnectionId] = useState(
    activeConnections[0]?.mcp_connection_id ?? "",
  );
  const [toolName, setToolName] = useState("");
  const [operationClass, setOperationClass] =
    useState<McpOperationClass>("READ");
  const [outcome, setOutcome] = useState<McpPolicyOutcome>("NEEDS_APPROVAL");

  const create = useMutation({
    mutationFn: (body: CreateMcpToolPolicyRequest) =>
      api.connectorRails.createMcpPolicy(body),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`Policy for ${result.data.policy.tool_name} created`);
        setToolName("");
        onCreated();
      } else {
        toast.error(`Create rejected: ${result.code}`);
      }
    },
  });

  if (activeConnections.length === 0) {
    return (
      <Card>
        <CardContent className="pt-4 text-sm text-muted-foreground">
          Create at least one MCP server connection above before defining tool
          policies.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">New MCP tool policy</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="policy-connection">MCP connection</Label>
          <select
            id="policy-connection"
            className="w-full border rounded px-2 py-1 text-sm"
            value={mcpConnectionId}
            onChange={(e) => setMcpConnectionId(e.target.value)}
          >
            {activeConnections.map((c) => (
              <option key={c.mcp_connection_id} value={c.mcp_connection_id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="policy-tool-name">Tool name</Label>
          <Input
            id="policy-tool-name"
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
            placeholder="list_files"
          />
        </div>
        <div>
          <Label htmlFor="policy-operation-class">Operation class</Label>
          <select
            id="policy-operation-class"
            className="w-full border rounded px-2 py-1 text-sm"
            value={operationClass}
            onChange={(e) => setOperationClass(e.target.value as McpOperationClass)}
          >
            {MCP_OPERATION_CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="policy-outcome">Outcome</Label>
          <select
            id="policy-outcome"
            className="w-full border rounded px-2 py-1 text-sm"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as McpPolicyOutcome)}
          >
            {MCP_POLICY_OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <Button
          onClick={() =>
            create.mutate({
              mcp_connection_id: mcpConnectionId,
              tool_name: toolName,
              operation_class: operationClass,
              outcome,
            })
          }
          disabled={
            create.isPending ||
            toolName.length === 0 ||
            mcpConnectionId.length === 0
          }
        >
          {create.isPending ? "Creating…" : "Create policy"}
        </Button>
      </CardContent>
    </Card>
  );
}

function McpPolicyRow({
  policy,
  onRevoke,
}: {
  policy: McpToolPolicyView;
  onRevoke: () => void;
}) {
  const revoke = useMutation({
    mutationFn: () => api.connectorRails.revokeMcpPolicy(policy.policy_id),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success(`Revoked policy for ${result.data.policy.tool_name}`);
        onRevoke();
      } else {
        toast.error("Revoke failed");
      }
    },
  });
  return (
    <Card>
      <CardContent className="pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium">{policy.tool_name}</div>
          <Badge>{policy.outcome}</Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {policy.operation_class}
        </div>
        <div className="text-xs flex flex-wrap gap-1">
          {policy.requires_employee_authority ? (
            <Badge variant="outline">employee_authority</Badge>
          ) : null}
          {policy.requires_dmw_scope ? (
            <Badge variant="outline">dmw_scope</Badge>
          ) : null}
          {policy.requires_admin_approval ? (
            <Badge variant="outline">admin_approval</Badge>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => revoke.mutate()}
          disabled={revoke.isPending || policy.revoked_at !== null}
        >
          {policy.revoked_at !== null
            ? "Revoked"
            : revoke.isPending
              ? "Revoking…"
              : "Revoke"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ConnectorRailsAdmin() {
  const queryClient = useQueryClient();
  const providers = useQuery({
    queryKey: ["connector-rails", "providers"],
    queryFn: () => api.connectorRails.listProviders(),
  });
  const mcpConnections = useQuery({
    queryKey: ["connector-rails", "mcp-connections"],
    queryFn: () => api.connectorRails.listMcpConnections(),
  });
  const mcpPolicies = useQuery({
    queryKey: ["connector-rails", "mcp-policies"],
    queryFn: () => api.connectorRails.listMcpPolicies(),
  });

  const oauthStatus = useQuery({
    queryKey: ["connector-rails", "oauth-status"],
    queryFn: () => api.otzar.oauthStatus(),
  });

  const onProvidersChanged = () =>
    queryClient.invalidateQueries({ queryKey: ["connector-rails"] });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PageHeader
        title="Connector + MCP rails"
        description="Tenant-owned connector + MCP-server credentials. Vault paths only — never raw secrets."
      />

      <section className="space-y-4" data-testid="oauth-connections-section">
        <h2 className="text-lg font-semibold">
          Workspace connections (OAuth)
        </h2>
        <p className="text-xs text-muted-foreground">
          Google Workspace, Slack, Microsoft 365, and Zoom connect with your
          organization's own consent — Connect opens the provider's sign-in
          in your browser; Verify proves the connection actually works. A
          connection only shows Verified after a live check.
        </p>
        {oauthStatus.isLoading ? (
          <Skeleton className="h-32" />
        ) : oauthStatus.data?.ok ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {oauthStatus.data.data.providers.map((row) => (
              <OAuthProviderRow
                key={row.provider}
                row={row}
                onChanged={onProvidersChanged}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Couldn't load connection status (admin access required).
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Provider catalog</h2>
        {providers.isLoading ? (
          <Skeleton className="h-32" />
        ) : providers.data?.ok ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {providers.data.data.providers.map((p) => (
              <ProviderCard key={p.provider_id} provider={p} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Couldn't load providers (admin access required).
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">MCP server connections</h2>
        <NewMcpConnectionForm onCreated={onProvidersChanged} />
        {mcpConnections.isLoading ? (
          <Skeleton className="h-32" />
        ) : mcpConnections.data?.ok ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mcpConnections.data.data.connections.map((c) => (
              <McpConnectionRow
                key={c.mcp_connection_id}
                connection={c}
                onRevoke={onProvidersChanged}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">MCP tool policies</h2>
        {mcpConnections.data?.ok ? (
          <NewMcpPolicyForm
            connections={mcpConnections.data.data.connections}
            onCreated={onProvidersChanged}
          />
        ) : null}
        {mcpPolicies.isLoading ? (
          <Skeleton className="h-32" />
        ) : mcpPolicies.data?.ok ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {mcpPolicies.data.data.policies.map((p) => (
              <McpPolicyRow
                key={p.policy_id}
                policy={p}
                onRevoke={onProvidersChanged}
              />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
