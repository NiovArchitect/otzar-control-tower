// FILE: invoke-operations.ts
// PURPOSE: CT-side closed-vocab catalog of the read-first operations
//          each Foundation ConnectorProvider supports per Section 4
//          C2/C3/C4-A/C4-B/C-GitHub/C5 runtime. Mirrors Foundation
//          providers verbatim so the CT operator-visible invocation
//          surface cannot offer an operation Foundation rejects at
//          validation tier.
//
//          Read-first only. Writes are forward-substrate to ≥C6
//          per ADR-0084 and require separate Founder authorization
//          per slice. Test-invoke surface dispatches ONLY against
//          this catalog.
//
//          The 8 closed-vocab fixture keys per ADR-0014 +
//          c2/c3/c4-a/c4-b/c-github/c5 provider tests are
//          available for forced-failure testing without ever
//          reaching real vendor APIs (CI + dev environments
//          leave *_USE_REAL unset; production deployments flip
//          it Founder-authorized).
//
// CONNECTS TO:
//   - src/lib/connectors/types.ts (CtConnectorType union)
//   - src/lib/connectors/data.ts (CT_CONNECTOR_REGISTRY)
//   - src/lib/api.ts (api.actions.createInvokeConnector)
//   - src/pages/ConnectorsAdmin.tsx (per-binding "Test invoke")
//   - src/components/ConnectorInvokeDialog.tsx (the modal)

import type { CtConnectorType } from "./types";

/**
 * Read-first operations per connector type. The names match
 * Foundation provider operation enums verbatim. Adding an
 * operation here without a corresponding Foundation provider
 * support would surface 422 INVALID_FIELD at create-time —
 * keep this list synchronized with each provider's operation
 * closed-vocab.
 */
export const CT_INVOKE_OPERATIONS: Readonly<
  Record<CtConnectorType, ReadonlyArray<string>>
> = Object.freeze({
  SLACK_READ: Object.freeze([
    "channels.list",
    "users.list",
    "conversations.history",
  ]),
  GOOGLE_WORKSPACE_READ: Object.freeze([
    "calendar.events.list",
    "drive.files.list",
    "gmail.messages.list",
  ]),
  JIRA_CLOUD_READ: Object.freeze(["myself", "project.search", "issue.search"]),
  LINEAR_READ: Object.freeze(["viewer", "teams.list", "issues.list"]),
  GITHUB_READ: Object.freeze(["user", "repos.list", "issues.search"]),
  MICROSOFT_365_READ: Object.freeze([
    "calendar.events.list",
    "drive.items.list",
    "mail.messages.list",
  ]),
  // Non-vendor connector types are present in the union but the
  // test-invoke surface does NOT offer them as operations
  // because they don't fit the read-first-operation shape.
  OUTBOUND_WEBHOOK: Object.freeze([]),
  FIXTURE_ECHO: Object.freeze([]),
});

/**
 * Closed-vocab fixture keys per ADR-0014 + the C2/C3/C4-A/C4-B/
 * C-GitHub/C5 provider tests. Operators can pick a fixture key
 * to test the failure path without reaching the real vendor
 * API. Each fixture key maps to a deterministic forced
 * error_class at the provider boundary.
 *
 * "(none)" is the empty fixture key — fixture-mode success path.
 */
export const CT_INVOKE_FIXTURE_KEYS: ReadonlyArray<{
  key: string;
  label: string;
}> = Object.freeze([
  { key: "", label: "(no fixture key — happy path)" },
  { key: "force-auth-failure", label: "Force AUTH failure" },
  { key: "force-network-failure", label: "Force NETWORK failure" },
  { key: "force-timeout", label: "Force TIMEOUT failure" },
  { key: "force-rate-limit", label: "Force RATE_LIMIT failure" },
  { key: "force-provider-error", label: "Force PROVIDER_ERROR failure" },
  { key: "force-validation-failure", label: "Force VALIDATION failure" },
  { key: "force-not-configured", label: "Force NOT_CONFIGURED failure" },
  { key: "force-disabled", label: "Force DISABLED failure" },
]);

/**
 * Returns true if a connector type supports any read-first
 * operations at all (i.e., is a vendor connector). Non-vendor
 * types like OUTBOUND_WEBHOOK + FIXTURE_ECHO return false.
 */
export function supportsInvokeOperations(type: CtConnectorType): boolean {
  return (CT_INVOKE_OPERATIONS[type] ?? []).length > 0;
}
