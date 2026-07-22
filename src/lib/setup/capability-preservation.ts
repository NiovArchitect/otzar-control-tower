// FILE: capability-preservation.ts
// PURPOSE: RC2 gate — no route may be removed without mapping every
//          working capability to a new human surface. This is inventory,
//          not a deletion license.
// PRINCIPLE: Preserve intelligence underneath; recompose the surface.
// CONNECTS TO: nav.ts, OrgSetup, OrganizationSeeding, AccessControl.

export interface CapabilityMapEntry {
  /** Prior human-facing screen or label. */
  oldScreen: string;
  /** Working capability (what the system can do). */
  capability: string;
  /** New primary human surface. */
  newSurface: string;
  /** Deep link / route that still hosts full capability when needed. */
  fullCapabilityRoute: string;
  /** Status of the mapping. */
  status:
    | "PRESERVED_IN_PLACE"
    | "RECOMPOSED"
    | "DEEP_LINK_ONLY"
    | "NEEDS_WORK";
}

/**
 * Capability-preservation map for RC2 consolidation.
 * Update when merging surfaces — never drop a row by deleting the old screen.
 */
export const CAPABILITY_PRESERVATION_MAP: readonly CapabilityMapEntry[] = [
  {
    oldScreen: "Organization Seeding",
    capability:
      "Dandelion list/sync/approve/reject/hold seeds; structure scan; meeting ingest; external identity decide; project assign; manager confirm",
    newSurface: "Organization → Otzar found + Review N items",
    fullCapabilityRoute: "/organization-seeding",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Legacy /seeding and /dandelion URLs",
    capability: "Reach full Dandelion review queue without dead links",
    newSurface: "Redirect → /organization-seeding",
    fullCapabilityRoute: "/organization-seeding",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Legacy /organization, /org-setup, /setup/coach",
    capability: "Reach Organization activation + setup coach",
    newSurface: "Redirect → /setup",
    fullCapabilityRoute: "/setup",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Onboarding (Dandelion Preview)",
    capability:
      "OOTB catalog preview; starter/team/business/enterprise activation packages",
    newSurface: "Organization → Recommended starter shape",
    fullCapabilityRoute: "/onboarding",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Organization Setup",
    capability:
      "Readiness journey, next-best step, people/twins/connectors/governance sections",
    newSurface: "Organization (/setup)",
    fullCapabilityRoute: "/setup",
    status: "PRESERVED_IN_PLACE",
  },
  {
    oldScreen: "Tools & Connections",
    capability: "OAuth connect/reconnect; provider inventory; connector health",
    newSurface:
      "Connections — plug-and-play path (Find → Connect → permissions); MCP advanced-only",
    fullCapabilityRoute: "/tools-connections",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Access Control",
    capability: "Permissions matrix, grants, revocations, org defaults",
    newSurface: "Governance → Access tab (/governance?tab=access)",
    fullCapabilityRoute: "/access-control",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Policies",
    capability: "Compliance frameworks and autonomy policy gates",
    newSurface: "Governance → Policies tab (/governance?tab=policies)",
    fullCapabilityRoute: "/policies",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Data retention",
    capability: "Retention, legal hold, memory revocation controls",
    newSurface: "Governance → Data retention tab (/governance?tab=retention)",
    fullCapabilityRoute: "/retention",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Pending Approvals",
    capability: "Dual-control escalation approve/deny queue",
    newSurface: "Action Center → Approvals tab (/approvals?tab=approvals)",
    fullCapabilityRoute: "/approvals-queue",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Review Center",
    capability: "High-sensitivity data review approve/deny/revoke",
    newSurface: "Action Center → Sensitive reviews tab (/approvals?tab=reviews)",
    fullCapabilityRoute: "/review-center",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Reports",
    capability: "Exportable readiness/activity packages",
    newSurface: "Intelligence → Reports tab (/intelligence?tab=reports)",
    fullCapabilityRoute: "/reports",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Security & Audit",
    capability: "Security posture and audit evidence",
    newSurface: "Security hub → Audit tab (/security-audit?tab=audit)",
    fullCapabilityRoute: "/security-audit-log",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "System Health",
    capability: "Platform health, runtimes, voice substrate status",
    newSurface: "Security hub → System health tab (/security-audit?tab=health)",
    fullCapabilityRoute: "/system-health",
    status: "RECOMPOSED",
  },
] as const;

/** Primary admin job hubs after RC2 recomposition (sidebar destinations). */
export const RC2_PRIMARY_HUB_ROUTES = [
  "/setup",
  "/tools-connections",
  "/governance",
  "/approvals",
  "/intelligence",
  "/security-audit",
] as const;

export function capabilityMapNeedsWork(): CapabilityMapEntry[] {
  return CAPABILITY_PRESERVATION_MAP.filter((e) => e.status === "NEEDS_WORK");
}

/** Every deep-link / full capability route that must stay registered. */
export function capabilityFullRoutes(): string[] {
  return [
    ...new Set(CAPABILITY_PRESERVATION_MAP.map((e) => e.fullCapabilityRoute)),
  ].sort();
}

/**
 * Rows that claim RECOMPOSED/PRESERVED but still say NEEDS_WORK — always empty
 * when the map is healthy.
 */
export function capabilityMapHealthIssues(): string[] {
  const issues: string[] = [];
  for (const row of CAPABILITY_PRESERVATION_MAP) {
    if (row.status === "NEEDS_WORK") {
      issues.push(`NEEDS_WORK: ${row.oldScreen}`);
    }
    if (!row.fullCapabilityRoute.startsWith("/")) {
      issues.push(`route missing leading slash: ${row.oldScreen}`);
    }
    if (row.capability.trim().length < 8) {
      issues.push(`capability too thin: ${row.oldScreen}`);
    }
    if (row.newSurface.trim().length < 3) {
      issues.push(`newSurface empty: ${row.oldScreen}`);
    }
  }
  return issues;
}
