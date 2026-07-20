// FILE: connection-coverage.ts
// PURPOSE: O-02 — Org / team / user connection scopes; enterprise admin
//          consent; coverage & health; SCIM/group mapping honesty.
//          Never claim SCIM provisioned or domain-wide coverage when not wired.
// CONNECTS TO: ToolsConnections inventory, FOUNDER O-02.

/** Product-facing connection scope (maps foundation ConnectorScopeType). */
export type ConnectionScopeLevel = "org" | "team" | "user";

export type AdminConsentState =
  | "none_needed"
  | "ready_for_consent"
  | "partial"
  | "healthy";

/** SCIM / group-mapping bridge — honest until enterprise IdP wire lands. */
export type ScimBridgeState =
  | "not_wired"
  | "configured"
  | "syncing"
  | "healthy"
  | "error";

export type CoverageHealthLevel =
  | "empty"
  | "partial"
  | "healthy"
  | "blocked";

export interface CoverageKpiInput {
  capabilities_connected: number;
  capabilities_ready: number;
  capabilities_blocked: number;
  oauth_verified: number;
  oauth_ready_for_consent: number;
  org_bindings_enabled: number;
  pending_access_requests: number;
  active_employee_grants?: number;
  people_with_open_requests?: number;
}

export interface ScopeGrantLike {
  scope_type: string;
  allowed_operations?: string[];
}

export interface CoverageSummary {
  health: CoverageHealthLevel;
  orgCount: number;
  teamCount: number;
  userCount: number;
  adminConsent: AdminConsentState;
  scim: ScimBridgeState;
  headline: string;
  consentDetail: string;
  scimDetail: string;
  scopeBreakdownLabel: string;
}

const SCOPE_LABELS: Record<ConnectionScopeLevel, string> = {
  org: "Organization",
  team: "Team",
  user: "User",
};

/** Map foundation / inventory scope_type strings → product levels. */
export function normalizeConnectionScope(
  scopeType: string | null | undefined,
): ConnectionScopeLevel | null {
  if (!scopeType) return null;
  const s = scopeType.trim().toUpperCase();
  if (s === "ORG" || s === "ORGANIZATION" || s === "ORG_BINDING") return "org";
  if (s === "TEAM" || s === "GROUP") return "team";
  if (
    s === "EMPLOYEE" ||
    s === "USER" ||
    s === "PERSON" ||
    s === "PERSONAL" ||
    s === "TWIN"
  ) {
    return "user";
  }
  // PROJECT / ROLE sit under team for coverage rollup
  if (s === "PROJECT" || s === "ROLE") return "team";
  return null;
}

export function labelConnectionScope(
  scopeType: string | null | undefined,
): string {
  const level = normalizeConnectionScope(scopeType);
  if (level) return SCOPE_LABELS[level];
  if (!scopeType) return "Unscoped";
  return scopeType.replace(/_/g, " ").toLowerCase();
}

export function countScopesByLevel(
  grants: ReadonlyArray<ScopeGrantLike>,
): { org: number; team: number; user: number; unknown: number } {
  let org = 0;
  let team = 0;
  let user = 0;
  let unknown = 0;
  for (const g of grants) {
    const level = normalizeConnectionScope(g.scope_type);
    if (level === "org") org += 1;
    else if (level === "team") team += 1;
    else if (level === "user") user += 1;
    else unknown += 1;
  }
  return { org, team, user, unknown };
}

/**
 * SCIM bridge honesty. Default product path is not_wired until IdP
 * provisioning is explicitly configured (flag or status from API later).
 */
export function classifyScimBridge(input?: {
  scimConfigured?: boolean | null;
  scimHealthy?: boolean | null;
  scimError?: boolean | null;
  scimSyncing?: boolean | null;
}): ScimBridgeState {
  if (input?.scimError === true) return "error";
  if (input?.scimSyncing === true) return "syncing";
  if (input?.scimHealthy === true) return "healthy";
  if (input?.scimConfigured === true) return "configured";
  return "not_wired";
}

export function scimHonestyCopy(state: ScimBridgeState): string {
  switch (state) {
    case "not_wired":
      return (
        "SCIM and group mapping are not wired yet. Org and user connections " +
        "work via OAuth and admin grants — not automatic IdP provisioning."
      );
    case "configured":
      return "SCIM is configured; first sync has not completed.";
    case "syncing":
      return "SCIM group sync is in progress.";
    case "healthy":
      return "SCIM group mapping is healthy.";
    case "error":
      return "SCIM sync failed — groups are not updating. Check IdP credentials.";
  }
}

/** True only for positive SCIM-provisioned claims (false-complete detector). */
export function isFalseScimProvisionedClaim(text: string): boolean {
  const t = text.toLowerCase();
  if (
    /not wired|not (yet )?(provisioned|configured)|scim .*not|no scim|without scim/i.test(
      t,
    )
  ) {
    return false;
  }
  return /\b(scim (is )?(live|active|connected|provisioned|healthy)|groups? (fully )?synced via scim|domain[- ]wide provisioned)\b/i.test(
    t,
  );
}

export function classifyAdminConsent(k: CoverageKpiInput): AdminConsentState {
  const ready = k.oauth_ready_for_consent;
  const verified = k.oauth_verified;
  const org = k.org_bindings_enabled;
  if (ready > 0 && verified === 0 && org === 0) return "ready_for_consent";
  if (ready > 0 && (verified > 0 || org > 0)) return "partial";
  if (verified > 0 || org > 0) return "healthy";
  return "none_needed";
}

export function adminConsentCopy(state: AdminConsentState, k: CoverageKpiInput): string {
  switch (state) {
    case "ready_for_consent":
      return `${k.oauth_ready_for_consent} OAuth app(s) ready for enterprise admin consent.`;
    case "partial":
      return `Enterprise consent partial — ${k.oauth_verified} verified, ${k.oauth_ready_for_consent} still awaiting consent.`;
    case "healthy":
      return `Enterprise admin consent healthy — ${k.oauth_verified} OAuth verified, ${k.org_bindings_enabled} org binding(s).`;
    case "none_needed":
      return "No pending enterprise admin consent. Connect a provider when the org needs it.";
  }
}

export function classifyCoverageHealth(k: CoverageKpiInput): CoverageHealthLevel {
  if (k.capabilities_blocked > 0 && k.capabilities_connected === 0) {
    return "blocked";
  }
  if (k.capabilities_connected === 0 && k.oauth_verified === 0) {
    return "empty";
  }
  if (
    k.capabilities_ready > 0 ||
    k.pending_access_requests > 0 ||
    k.oauth_ready_for_consent > 0 ||
    k.capabilities_blocked > 0
  ) {
    return "partial";
  }
  if (k.capabilities_connected > 0) return "healthy";
  return "empty";
}

export function summarizeConnectionCoverage(input: {
  kpis: CoverageKpiInput;
  grants?: ReadonlyArray<ScopeGrantLike>;
  scim?: Parameters<typeof classifyScimBridge>[0];
}): CoverageSummary {
  const k = input.kpis;
  const fromGrants = countScopesByLevel(input.grants ?? []);
  // Org bindings KPI is authoritative when grants list is incomplete
  const orgCount = Math.max(fromGrants.org, k.org_bindings_enabled);
  const teamCount = fromGrants.team;
  const userCount = Math.max(
    fromGrants.user,
    k.active_employee_grants ?? 0,
  );
  const health = classifyCoverageHealth(k);
  const adminConsent = classifyAdminConsent(k);
  const scim = classifyScimBridge(input.scim);
  const scopeBreakdownLabel = `Org ${orgCount} · Team ${teamCount} · User ${userCount}`;

  let headline: string;
  switch (health) {
    case "blocked":
      headline = "Tool coverage blocked — fix credentials before employees connect.";
      break;
    case "empty":
      headline =
        "No org or user connections yet. Start with enterprise admin consent, then employee grants.";
      break;
    case "partial":
      headline = `Coverage partial — ${k.capabilities_connected} connected, ${k.capabilities_ready} ready, ${k.pending_access_requests} pending.`;
      break;
    case "healthy":
      headline = `Coverage healthy — ${k.capabilities_connected} capability area(s) connected across org/team/user scopes.`;
      break;
  }

  return {
    health,
    orgCount,
    teamCount,
    userCount,
    adminConsent,
    scim,
    headline,
    consentDetail: adminConsentCopy(adminConsent, k),
    scimDetail: scimHonestyCopy(scim),
    scopeBreakdownLabel,
  };
}
