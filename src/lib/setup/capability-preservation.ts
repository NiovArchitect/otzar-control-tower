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
    newSurface: "Connections (nav) — plug-and-play redesign pending",
    fullCapabilityRoute: "/tools-connections",
    status: "DEEP_LINK_ONLY",
  },
  {
    oldScreen: "Access Control",
    capability: "Permissions matrix, grants, revocations, org defaults",
    newSurface: "Governance → Access (+ contextual People/Project later)",
    fullCapabilityRoute: "/access-control",
    status: "DEEP_LINK_ONLY",
  },
  {
    oldScreen: "Policies",
    capability: "Compliance frameworks and autonomy policy gates",
    newSurface: "Governance → Policies",
    fullCapabilityRoute: "/policies",
    status: "DEEP_LINK_ONLY",
  },
  {
    oldScreen: "Data retention",
    capability: "Retention, legal hold, memory revocation controls",
    newSurface: "Governance → Data retention",
    fullCapabilityRoute: "/retention",
    status: "DEEP_LINK_ONLY",
  },
  {
    oldScreen: "Pending Approvals / Review Center",
    capability: "Dual-control approval queue; high-sensitivity review",
    newSurface: "Action Center",
    fullCapabilityRoute: "/approvals",
    status: "RECOMPOSED",
  },
  {
    oldScreen: "Reports",
    capability: "Exportable readiness/activity packages",
    newSurface: "Intelligence → Reports",
    fullCapabilityRoute: "/reports",
    status: "DEEP_LINK_ONLY",
  },
  {
    oldScreen: "Security & Audit",
    capability: "Security posture and audit evidence",
    newSurface: "Security",
    fullCapabilityRoute: "/security-audit",
    status: "PRESERVED_IN_PLACE",
  },
] as const;

export function capabilityMapNeedsWork(): CapabilityMapEntry[] {
  return CAPABILITY_PRESERVATION_MAP.filter((e) => e.status === "NEEDS_WORK");
}
