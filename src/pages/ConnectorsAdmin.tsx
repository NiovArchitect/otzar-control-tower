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
import { supportsInvokeOperations } from "@/lib/connectors/invoke-operations";
import { ConnectorInvokeDialog } from "@/components/ConnectorInvokeDialog";
import type {
  ConnectorBindingView,
  CtConnectorType,
} from "@/lib/connectors/types";

const PRIVACY_NOTICE =
  "The secure setup key is a NAME that points at a credential on your deployment — the credential value itself never crosses the API boundary, and this page never displays, decodes, or fetches it.";

// PROD-UX-P0F — human copy in the normal flow; the implementation detail
// (capability tiers, substrate codes) lives in Advanced details only.
const ENABLED_BY_DEFAULT_NOTICE =
  "New connections start read-only. Letting Otzar post or write through a tool is a separate, explicitly authorized step — nothing writes by default.";

const FOUNDER_DOCTRINE_LINE =
  "Having a plan makes a tool available; connecting it here is what actually authorizes Otzar to use it — and every use stays governed and auditable.";

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
  const [invokeOpen, setInvokeOpen] = useState(false);
  const canInvoke = supportsInvokeOperations(binding.type);
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
          {/* PROD-UX-P0F — the posture in human words; the capability-tier
              codes live in Advanced details below. */}
          <Badge variant="outline">
            {binding.type === "SLACK_WRITE"
              ? "Posting — every send needs approval"
              : "Read-only access"}
          </Badge>
        </div>
        <div>
          <div className="font-medium">Secure setup key name</div>
          <div className="text-muted-foreground">
            {binding.secret_ref ?? "—"}
            <span className="ml-2 text-xs italic">
              (a reference name only — the credential value is never shown)
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Created {formatTimestamp(binding.created_at)} · Updated{" "}
          {formatTimestamp(binding.updated_at)}
        </div>
        {/* PROD-UX-P0F — implementation detail out of the normal flow. */}
        <details data-testid={`advanced-${binding.binding_id}`}>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Advanced details
          </summary>
          <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            <div>Connector type: {binding.type}</div>
            <div>Binding id: {binding.binding_id}</div>
            <div>
              Config keys:{" "}
              {Object.keys(binding.config).length === 0
                ? "—"
                : Object.keys(binding.config).join(", ")}
            </div>
          </div>
        </details>
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
            Remove
          </Button>
          {canInvoke ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInvokeOpen(true)}
              disabled={!binding.enabled}
              data-testid={`invoke-${binding.binding_id}`}
            >
              Test invoke
            </Button>
          ) : null}
        </div>
      </CardContent>
      <ConnectorInvokeDialog
        binding={binding}
        open={invokeOpen}
        onClose={() => setInvokeOpen(false)}
      />
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
      } else if (type === "GOOGLE_WORKSPACE_READ") {
        config["use_real"] = false;
        config["workspace_domain"] = displayName.trim() || "pending";
      } else if (type === "JIRA_CLOUD_READ") {
        config["use_real"] = false;
        // C4-A uses the per-tenant cloud_id (the Atlassian-side
        // UUID returned by accessible-resources at OAuth install).
        // At registration tier we let the operator paste the
        // cloud_id in the display_name field as a stand-in until a
        // dedicated cloud_id form input lands in a later CT slice;
        // the operator can refine via the admin update route once
        // the binding exists. The displayName.trim() fallback
        // mirrors the SLACK_READ + GOOGLE_WORKSPACE_READ pattern.
        config["cloud_id"] = displayName.trim() || "pending";
      } else if (type === "LINEAR_READ") {
        config["use_real"] = false;
        // C4-B Linear OAuth tokens are workspace-bound by
        // construction at install time, so no per-tenant
        // cloud_id / workspace_domain is required. The config
        // shape is the minimal {use_real} pair; no display-name
        // stand-in is needed.
      } else if (type === "GITHUB_READ") {
        config["use_real"] = false;
        // C-GitHub access tokens (OAuth 2.0 access token or
        // Personal Access Token) are global to the authenticated
        // caller or GitHub App installation, so no per-tenant
        // cloud_id / workspace_id is required. The config shape
        // is the minimal {use_real} pair; no display-name
        // stand-in is needed.
      } else if (type === "MICROSOFT_365_READ") {
        config["use_real"] = false;
        // C5 Microsoft 365 carries the Azure AD tenant identifier
        // in `tenant_id` — analogous role to C3 workspace_domain
        // or C4-A cloud_id. At registration tier we let the
        // operator paste the tenant_id in the display_name field
        // as a stand-in until a dedicated tenant_id form input
        // lands in a later CT slice; the operator can refine via
        // the admin update route once the binding exists. The
        // displayName.trim() fallback mirrors the JIRA_CLOUD_READ
        // pattern.
        config["tenant_id"] = displayName.trim() || "pending";
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
        <CardTitle>Connect another tool</CardTitle>
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
            placeholder={
              type === "MICROSOFT_365_READ"
                ? "e.g. niov-prod-m365"
                : type === "GITHUB_READ"
                  ? "e.g. niov-prod-github"
                  : type === "LINEAR_READ"
                    ? "e.g. niov-prod-linear"
                    : type === "JIRA_CLOUD_READ"
                      ? "e.g. niov-prod-jira"
                      : type === "GOOGLE_WORKSPACE_READ"
                        ? "e.g. niov-prod-google"
                        : "e.g. niov-prod-slack"
            }
            data-testid="display-name-input"
          />
        </div>
        {typeDef?.secret_ref_required ? (
          <div className="space-y-1">
            <Label htmlFor="secret-ref">Credential reference (a name, never the credential itself)</Label>
            <Input
              id="secret-ref"
              value={secretRef}
              onChange={(e) => setSecretRef(e.target.value)}
              placeholder={
                type === "MICROSOFT_365_READ"
                  ? "e.g. MS365_ACCESS_TOKEN_PROD"
                  : type === "GITHUB_READ"
                    ? "e.g. GITHUB_ACCESS_TOKEN_PROD"
                    : type === "LINEAR_READ"
                      ? "e.g. LINEAR_ACCESS_TOKEN_PROD"
                      : type === "JIRA_CLOUD_READ"
                        ? "e.g. JIRA_ACCESS_TOKEN_PROD"
                        : type === "GOOGLE_WORKSPACE_READ"
                          ? "e.g. GOOGLE_ACCESS_TOKEN_PROD"
                          : "e.g. SLACK_BOT_TOKEN_PROD"
              }
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
          {mutation.isPending ? "Connecting…" : "Connect tool"}
        </Button>
      </CardContent>
    </Card>
  );
}

// PROD-UX-P0F — the Slice-F governed Slack write-back, connectable from the
// UI (no terminal). Idempotent: an existing enabled SLACK_WRITE binding comes
// back created:false ("Already connected"). Flag-off deployments answer 404
// FEATURE_DISABLED — rendered honestly, never as a crash. Also shows the REAL
// count of work items waiting on this connection (blind-spots feed; no claim
// when the feed is empty or unavailable).
function SlackWriteSetupCard({
  bindings,
  onSuccess,
}: {
  bindings: ConnectorBindingView[];
  onSuccess: () => void;
}) {
  const [channel, setChannel] = useState("");
  const [secretRef, setSecretRef] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const existing = bindings.find((b) => b.type === "SLACK_WRITE" && b.enabled);

  // Real signal: how many work items are blocked on Slack setup right now.
  const blockedQuery = useQuery({
    queryKey: ["work-os", "blind-spots", "slack-blocked"],
    queryFn: () => api.workOs.blindSpots(),
  });
  const blockedCount = (() => {
    const r = blockedQuery.data;
    if (!r || !r.ok || r.data.items === undefined) return 0;
    return r.data.items.filter((e) => {
      const plan = e.execution_plan;
      if (plan === undefined || plan === null) return false;
      const connector = plan["requiredConnector"] ?? plan["required_connector"];
      const cap = plan["capabilityState"] ?? plan["capability_state"];
      return (
        connector === "SLACK" &&
        typeof cap === "string" &&
        cap !== "available_and_authorized" &&
        cap !== "connected"
      );
    }).length;
  })();

  const mutation = useMutation({
    mutationFn: () =>
      api.connectors.registerSlackWrite({
        default_channel: channel.trim(),
        ...(secretRef.trim().length > 0 ? { secret_ref: secretRef.trim() } : {}),
      }),
    onSuccess: (result) => {
      if (result.ok && result.data.ok) {
        setNotice({
          tone: "ok",
          text: result.data.created
            ? "Slack posting is connected. Run a test from the connection card below — the test goes through the same approval-gated pipeline as real work."
            : "Slack posting was already connected — nothing changed.",
        });
        setChannel("");
        setSecretRef("");
        onSuccess();
        return;
      }
      const code = result.ok ? null : result.code;
      setNotice({
        tone: "error",
        text:
          code === "FEATURE_DISABLED"
            ? "Governed posting isn't enabled for this deployment yet — your host has to turn it on before Slack posting can be connected."
            : code === "ADMIN_REQUIRED"
              ? "Only an organization admin can connect Slack posting."
              : code === "MISSING_DEFAULT_CHANNEL"
                ? "Enter the Slack channel Otzar should post to by default."
                : (result.ok ? null : result.message) ??
                  "Couldn't connect Slack posting right now. Try again in a moment.",
      });
    },
    onError: () => {
      setNotice({ tone: "error", text: "Couldn't reach the server. Try again in a moment." });
    },
  });

  return (
    <Card data-testid="slack-write-setup-card">
      <CardHeader>
        <CardTitle>Slack posting (governed)</CardTitle>
        <CardDescription>
          Lets Otzar post approved messages to Slack. Every send goes through
          the governed approval pipeline — nothing is ever posted silently.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {blockedCount > 0 && existing === undefined ? (
          <p className="text-xs text-amber-600" data-testid="slack-write-blocked-count">
            {blockedCount === 1
              ? "1 work item is waiting on this connection."
              : `${blockedCount} work items are waiting on this connection.`}
          </p>
        ) : null}
        {existing !== undefined ? (
          <p className="text-xs text-emerald-600" data-testid="slack-write-connected">
            Connected — Otzar can post to Slack once each message is approved.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="slack-write-channel">Default Slack channel</Label>
              <Input
                id="slack-write-channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="e.g. C0123456789 (the channel Otzar posts to)"
                data-testid="slack-write-channel-input"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slack-write-secret">
                Credential reference name (optional)
              </Label>
              <Input
                id="slack-write-secret"
                value={secretRef}
                onChange={(e) => setSecretRef(e.target.value)}
                placeholder="defaults to SLACK_BOT_TOKEN"
                data-testid="slack-write-secret-input"
              />
              <p className="text-xs text-muted-foreground">{PRIVACY_NOTICE}</p>
            </div>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || channel.trim().length === 0}
              data-testid="slack-write-connect"
            >
              {mutation.isPending ? "Connecting…" : "Connect Slack posting"}
            </Button>
          </>
        )}
        {notice !== null ? (
          <p
            className={`text-xs ${notice.tone === "ok" ? "text-emerald-600" : "text-destructive"}`}
            data-testid="slack-write-notice"
          >
            {notice.text}
          </p>
        ) : null}
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
              <li>Connect a new tool (admins only)</li>
              <li>List this organization&apos;s connections</li>
              <li>Enable / disable a connection</li>
              <li>Remove a connection (the record is kept for audit)</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">This page cannot</p>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Display a stored credential value — ever</li>
              <li>Send or write through a tool without governed approval</li>
              <li>Read file contents or message bodies</li>
              <li>Bypass governance or audit</li>
              <li>Act outside your organization&apos;s boundary</li>
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
        <CardTitle>Available tools</CardTitle>
        <CardDescription>
          The tools Otzar can connect to today. Each one lists what it needs
          for setup; all of them start read-only.
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
        title="Connected Tools"
        description="Connect the tools your organization uses — Slack, Google Workspace, Jira, Linear, GitHub, and Microsoft 365. Every connection starts read-only; anything Otzar does through a tool is governed and auditable."
      />
      <SlackWriteSetupCard bindings={bindings} onSuccess={refresh} />
      <DoctrineCard />
      <TypeRegistryCard />
      <RegisterForm onSuccess={refresh} />
      <section data-testid="bindings-section">
        <Card>
          <CardHeader>
            <CardTitle>Your connections</CardTitle>
            <CardDescription>
              The tools connected for this organization.
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
                No tools connected yet. Use the form above to connect the
                first one.
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
              Only organization admins can see or change connections. Removing
              a connection keeps its record for audit — nothing is erased.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
