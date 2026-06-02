// FILE: data.ts
// PURPOSE: CT-side mirror of the Foundation Section 4 connector-type
//          registry (apps/api/src/services/connector/connector.service.ts
//          CONNECTOR_REGISTRY) so the admin surface can display
//          human-readable type names + secret_ref requirements +
//          governance posture without round-tripping to the backend.
//          Read-only template metadata.
//
//          Type list mirrors the Foundation ConnectorType union at
//          PR #185 HEAD e1ef2e8: OUTBOUND_WEBHOOK + FIXTURE_ECHO +
//          SLACK_READ. FIXTURE_ECHO is documented for completeness
//          but the admin surface hides it from selection (it's
//          test-only at Foundation; never enabled in production
//          bindings).
// CONNECTS TO: src/pages/ConnectorsAdmin.tsx, src/lib/connectors/types.ts.

import type { CtConnectorType } from "./types";

export interface CtConnectorTypeDefinition {
  type: CtConnectorType;
  display_name: string;
  short_description: string;
  secret_ref_required: boolean;
  /** Hidden from the admin selection UI (test-only types). */
  hidden_from_admin_selection: boolean;
  /** Required config keys the admin must fill before submission. */
  required_config_keys: ReadonlyArray<string>;
  /** Stable governance note rendered next to the type selector. */
  governance_note: string;
}

export const CT_CONNECTOR_REGISTRY: ReadonlyArray<CtConnectorTypeDefinition> = [
  {
    type: "SLACK_READ",
    display_name: "Slack (read-first)",
    short_description:
      "Bot-token (xoxb-*) read access to public channels, bot-member channels, and the workspace user directory. C2 RUNTIME_READY.",
    secret_ref_required: true,
    hidden_from_admin_selection: false,
    required_config_keys: ["use_real", "workspace_id"],
    governance_note:
      "Reads only at C2. The secret_ref field is the env-var NAME on the deployment host that resolves to a bot token (xoxb-*); never paste the resolved token here.",
  },
  {
    type: "GOOGLE_WORKSPACE_READ",
    display_name: "Google Workspace (read-first)",
    short_description:
      "OAuth-2.0 access-token read access to Calendar (events.list), Drive (files.list metadata only), and Gmail (messages.list IDs only). C3 RUNTIME_READY.",
    secret_ref_required: true,
    hidden_from_admin_selection: false,
    required_config_keys: ["use_real", "workspace_domain"],
    governance_note:
      "Reads only at C3. The secret_ref field is the env-var NAME on the deployment host that resolves to a Google OAuth access token (ya29.*); never paste the resolved token here. Drive content download + Gmail body read are deferred to ≥C5; writes are deferred to ≥C6.",
  },
  {
    type: "JIRA_CLOUD_READ",
    display_name: "Jira Cloud (read-first)",
    short_description:
      "OAuth-2.0 3LO access-token read access to Jira Cloud via myself + project.search + issue.search (POST /rest/api/3/search/jql cursor-based JQL). Counts + status-category aggregates only. C4-A RUNTIME_READY.",
    secret_ref_required: true,
    hidden_from_admin_selection: false,
    required_config_keys: ["use_real", "cloud_id"],
    governance_note:
      "Reads only at C4-A. The secret_ref field is the env-var NAME on the deployment host that resolves to a Jira Cloud OAuth 2.0 access token; never paste the resolved token here. The cloud_id field is the per-tenant UUID returned by Atlassian accessible-resources at OAuth install. Issue keys, summaries, descriptions, assignee identity, and reporter identity are NEVER traversed by the connector. Webhook ingestion, agile-board, sprint, worklog, and changelog reads are deferred; writes are deferred to ≥C6.",
  },
  {
    type: "LINEAR_READ",
    display_name: "Linear (read-first)",
    short_description:
      "OAuth-2.0 access-token read access to Linear via viewer + teams.list + issues.list (single POST /graphql endpoint with pinned GraphQL query strings). Counts + state-type aggregates only (to_do / in_progress / done / canceled grouped from WorkflowState.type). C4-B RUNTIME_READY. Closes Project / Engineering family at 2/2 alongside Jira Cloud.",
    secret_ref_required: true,
    hidden_from_admin_selection: false,
    required_config_keys: ["use_real"],
    governance_note:
      "Reads only at C4-B. The secret_ref field is the env-var NAME on the deployment host that resolves to a Linear OAuth 2.0 access token; never paste the resolved token here. Linear OAuth tokens are workspace-bound by construction at install time, so no per-tenant cloud_id / workspace_domain is required. Team keys (TEAM-NNN), issue identifiers, titles, descriptions, assignee identity, reporter identity, and comments are NEVER traversed by the connector. Cycle / roadmap / label / project reads are deferred; personal-API-key fallback is intentionally excluded for workspace-tier auditability; writes are deferred to ≥C6.",
  },
  {
    type: "GITHUB_READ",
    display_name: "GitHub (read-first)",
    short_description:
      "OAuth-2.0 access-token OR Personal Access Token read access to GitHub REST v3 via user + repos.list + issues.search (X-GitHub-Api-Version 2022-11-28 pinned). Counts + state aggregates only (open / closed_completed / closed_not_planned grouped from GitHub state + state_reason). C-GitHub RUNTIME_READY.",
    secret_ref_required: true,
    hidden_from_admin_selection: false,
    required_config_keys: ["use_real"],
    governance_note:
      "Reads only at C-GitHub. The secret_ref field is the env-var NAME on the deployment host that resolves to a GitHub OAuth 2.0 access token or Personal Access Token (PAT); never paste the resolved token here. GitHub access tokens are global to the authenticated caller or GitHub App installation, so no per-tenant cloud_id / workspace_id is required. Repository names, owner logins, branch names, issue identifiers, titles, bodies, assignee email, reporter login, and comments are NEVER traversed by the connector. PR / commit / branch / file-content reads are deferred; webhook ingestion is deferred to ≥C7; GraphQL v4 surface is deferred (REST v3 only at C-GitHub); writes are deferred to ≥C6.",
  },
  {
    type: "MICROSOFT_365_READ",
    display_name: "Microsoft 365 (read-first)",
    short_description:
      "OAuth-2.0 access-token read access to Microsoft Graph v1.0 via calendar.events.list + drive.items.list + mail.messages.list ($select query parameter restricts response field set at the request boundary). Counts + aggregates only (recurring_events_count + folders_count). C5 RUNTIME_READY. Closes the 6/6 connector matrix at RUNTIME_READY or higher.",
    secret_ref_required: true,
    hidden_from_admin_selection: false,
    required_config_keys: ["use_real", "tenant_id"],
    governance_note:
      "Reads only at C5. The secret_ref field is the env-var NAME on the deployment host that resolves to a Microsoft 365 OAuth 2.0 access token issued by Azure Active Directory; never paste the resolved token (JWT format eyJ...) here. The tenant_id field carries the Azure AD tenant identifier (GUID format) and is analogous to the Google Workspace workspace_domain. Event subjects, attendee email PII, body content, file names, folder paths, mail subject lines, sender and recipient email addresses, and attachment names are NEVER traversed by the connector. OneDrive content download, Outlook mail body read, Teams read, webhook subscriptions, SharePoint, OneNote, Planner, and Bookings reads are deferred; writes are deferred to ≥C6.",
  },
  {
    type: "OUTBOUND_WEBHOOK",
    display_name: "Outbound Webhook",
    short_description:
      "HTTPS POST to a per-binding URL with HMAC-SHA-256 request signing using the secret_ref-resolved env var.",
    secret_ref_required: true,
    hidden_from_admin_selection: false,
    required_config_keys: ["url"],
    governance_note:
      "The secret_ref field is the env-var NAME that resolves to the HMAC signing secret; never paste the resolved secret here.",
  },
  {
    type: "FIXTURE_ECHO",
    display_name: "Fixture Echo (test-only)",
    short_description:
      "Deterministic test-only connector. Never enabled in production bindings.",
    secret_ref_required: false,
    hidden_from_admin_selection: true,
    required_config_keys: [],
    governance_note:
      "Hidden from the admin selection UI — present in the registry only so the listing view can render historical FIXTURE_ECHO rows safely.",
  },
];

export function getCtConnectorTypeDefinition(
  type: string,
): CtConnectorTypeDefinition | undefined {
  return CT_CONNECTOR_REGISTRY.find((def) => def.type === type);
}

export function getSelectableConnectorTypes(): ReadonlyArray<CtConnectorTypeDefinition> {
  return CT_CONNECTOR_REGISTRY.filter((def) => !def.hidden_from_admin_selection);
}
