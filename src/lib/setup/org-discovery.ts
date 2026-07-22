// FILE: org-discovery.ts
// PURPOSE: Pure "Otzar found" derivation for Organization setup.
//          Surfaces Dandelion seed intelligence + live people/structure
//          counts as human findings — not a separate Seeding product.
//          Capability is preserved: review deep-links to the full
//          approve/hold/reject/sync/meeting-ingest surface.
// CONNECTS TO: OrgSetup, dandelion-proposal-classes, seed-grouping,
//          tests/unit/org-discovery.test.ts.

import type { Entity, EntityMembership, OrgSeed } from "@/lib/types/foundation";
import {
  inventoryProposalClasses,
  type ProposalClassId,
} from "@/lib/work-os/dandelion-proposal-classes";

const PENDING = new Set(["SEED_PROPOSED", "SEED_NEEDS_REVIEW"]);

export interface OrgDiscoveryFinding {
  id: string;
  /** Short human count line, e.g. "42 people". */
  label: string;
  /** Optional secondary detail. */
  detail?: string;
  kind: "ok" | "review" | "missing";
}

export interface OrgDiscoveryView {
  /** True when we had enough projections to speak. */
  available: boolean;
  peopleCount: number;
  activePeopleCount: number;
  managerLineCount: number;
  peopleWithoutManager: number;
  teamCount: number;
  openSeedCount: number;
  /** Per-class open proposal counts (Dandelion inventory, human labels). */
  classFindings: Array<{
    id: ProposalClassId;
    label: string;
    open: number;
  }>;
  /** Top summary bullets for the Organization surface. */
  findings: OrgDiscoveryFinding[];
  /** Primary CTA when work needs admin confirmation. */
  reviewCta: {
    label: string;
    to: string;
    openCount: number;
  } | null;
  /** Honest empty/unavailable copy. */
  emptyNote: string | null;
}

function isActivePerson(p: Entity): boolean {
  const a = (p as { activation_status?: string }).activation_status;
  const s = (p as { status?: string }).status;
  if (s !== undefined && s !== "ACTIVE") return false;
  if (a === "active" || a === undefined || a === null) return true;
  return a === "active";
}

/**
 * Derive calm "Otzar found" findings from live org projections + Dandelion seeds.
 * Never invents counts. Never hides open seeds.
 */
export function deriveOrgDiscovery(input: {
  people: Entity[] | null;
  memberships: EntityMembership[] | null;
  seeds: OrgSeed[] | null;
  orgEntityId?: string | null;
}): OrgDiscoveryView {
  const people = input.people;
  const memberships = input.memberships;
  const seeds = input.seeds;

  if (people === null && seeds === null && memberships === null) {
    return {
      available: false,
      peopleCount: 0,
      activePeopleCount: 0,
      managerLineCount: 0,
      peopleWithoutManager: 0,
      teamCount: 0,
      openSeedCount: 0,
      classFindings: [],
      findings: [],
      reviewCta: null,
      emptyNote: "Otzar could not load organization discoveries yet.",
    };
  }

  const peopleList = people ?? [];
  const peopleCount = peopleList.length;
  const activePeopleCount = peopleList.filter(isActivePerson).length;

  const mems = memberships ?? [];
  const orgId = input.orgEntityId ?? null;
  // Reporting edges: child has a parent that is not the org root.
  const managerLineCount = mems.filter((m) => {
    if (!m.is_active) return false;
    if (orgId !== null && m.parent_id === orgId) return false;
    return true;
  }).length;

  const childIds = new Set(
    mems.filter((m) => m.is_active).map((m) => m.child_id),
  );
  const hasNonOrgParent = new Set(
    mems
      .filter((m) => m.is_active && (orgId === null || m.parent_id !== orgId))
      .map((m) => m.child_id),
  );
  const peopleWithoutManager =
    peopleList.length === 0
      ? 0
      : peopleList.filter((p) => {
          const id = p.entity_id;
          if (!childIds.has(id)) return true;
          return !hasNonOrgParent.has(id);
        }).length;

  const depts = new Set<string>();
  for (const m of mems) {
    const d = (m.department ?? "").trim();
    if (d.length > 0) depts.add(d.toLowerCase());
  }
  const teamCount = depts.size;

  const seedList = seeds ?? [];
  const openSeeds = seedList.filter((s) => PENDING.has(s.status));
  const openSeedCount = openSeeds.length;
  const inv = inventoryProposalClasses(openSeeds);
  const classFindings = inv.rows
    .filter((r) => r.count > 0)
    .map((r) => ({ id: r.id, label: r.label, open: r.count }));

  const findings: OrgDiscoveryFinding[] = [];
  if (people !== null) {
    const peopleFinding: OrgDiscoveryFinding = {
      id: "people",
      label: `${activePeopleCount} ${activePeopleCount === 1 ? "person" : "people"} ready to use Otzar`,
      kind: activePeopleCount > 0 ? "ok" : "missing",
    };
    if (peopleCount > activePeopleCount) {
      peopleFinding.detail = `${peopleCount - activePeopleCount} still need activation`;
    }
    findings.push(peopleFinding);
  }
  if (memberships !== null) {
    const structureFinding: OrgDiscoveryFinding = {
      id: "structure",
      label: `${managerLineCount} reporting ${managerLineCount === 1 ? "relationship" : "relationships"}`,
      kind: peopleWithoutManager > 0 ? "review" : "ok",
    };
    if (peopleWithoutManager > 0) {
      structureFinding.detail = `${peopleWithoutManager} without a clear manager line`;
    }
    findings.push(structureFinding);
    if (teamCount > 0) {
      findings.push({
        id: "teams",
        label: `${teamCount} ${teamCount === 1 ? "team/department" : "teams/departments"} observed`,
        kind: "ok",
      });
    }
  }
  for (const c of classFindings) {
    findings.push({
      id: `seed-${c.id}`,
      label: `${c.open} ${c.label.toLowerCase()} ${c.open === 1 ? "proposal" : "proposals"}`,
      detail: "Needs your confirmation — nothing applies automatically",
      kind: "review",
    });
  }

  const reviewCta =
    openSeedCount > 0
      ? {
          label:
            openSeedCount === 1
              ? "Review 1 item"
              : `Review ${openSeedCount} items`,
          to: "/organization-seeding",
          openCount: openSeedCount,
        }
      : null;

  let emptyNote: string | null = null;
  if (findings.length === 0) {
    emptyNote =
      "No discoveries yet. Connect tools or refresh structure signals so Otzar can propose people and relationships.";
  }

  return {
    available: true,
    peopleCount,
    activePeopleCount,
    managerLineCount,
    peopleWithoutManager,
    teamCount,
    openSeedCount,
    classFindings,
    findings,
    reviewCta,
    emptyNote,
  };
}
