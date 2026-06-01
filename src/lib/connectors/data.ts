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
