// FILE: org-discovery.ts
// PURPOSE: Pure "Otzar found" derivation for Organization setup.
//          Breaks open Dandelion seeds into human review categories with
//          deep links + plain-language actionable items — not one opaque count.
// CONNECTS TO: OrgSetup, OrgDiscoveryFoundCard, OrgDiscoveryReviewQueue,
//          dandelion-proposal-classes, tests/unit/org-discovery.test.ts.

import type { Entity, EntityMembership, OrgSeed } from "@/lib/types/foundation";
import {
  classForSeedType,
  inventoryProposalClasses,
  type ProposalClassId,
  DANDELION_PROPOSAL_CLASSES,
} from "@/lib/work-os/dandelion-proposal-classes";
import { buildProposalHonestyView } from "@/lib/work-os/proposal-honesty";

const PENDING = new Set(["SEED_PROPOSED", "SEED_NEEDS_REVIEW"]);

/** Human category for admin review (not engine jargon). */
export type ReviewCategoryId =
  | ProposalClassId
  | "placement" // people without manager (structure gap, may not be a seed)
  | "activation"; // people pending activation

export interface OrgDiscoveryFinding {
  id: string;
  label: string;
  detail?: string;
  kind: "ok" | "review" | "missing";
}

export interface OrgReviewCategory {
  id: ReviewCategoryId;
  /** e.g. "14 manager relationships need confirmation" */
  label: string;
  /** Short noun: "Managers" */
  shortLabel: string;
  count: number;
  /** Deep link into full queue filtered by class */
  to: string;
  /** Plain why this bucket matters */
  plain: string;
}

/** One reviewable finding in plain language for inline confirm/reject. */
export interface OrgActionableItem {
  seedId: string;
  categoryId: ProposalClassId | "unknown";
  /** Headline: "Pratham may report to David" */
  title: string;
  /** Why Otzar thinks this */
  reason: string;
  /** Source line or honest missing */
  source: string | null;
  confidenceLabel: string;
  confidence: string;
  recommendedAction: string;
  seedType: string;
  subjectName: string | null;
  /** Primary confirm button label */
  confirmLabel: string;
}

export interface OrgDiscoveryView {
  available: boolean;
  peopleCount: number;
  activePeopleCount: number;
  managerLineCount: number;
  peopleWithoutManager: number;
  teamCount: number;
  openSeedCount: number;
  /** Per-class open proposal counts (Dandelion inventory). */
  classFindings: Array<{
    id: ProposalClassId;
    label: string;
    open: number;
  }>;
  /**
   * Actionable breakdown of everything that needs a human — categories with
   * counts that deep-link to exact records. Never one unexplained number alone.
   */
  reviewCategories: OrgReviewCategory[];
  /** Sample pending seeds for inline confirm/reject on Organization. */
  actionableItems: OrgActionableItem[];
  findings: OrgDiscoveryFinding[];
  reviewCta: {
    label: string;
    to: string;
    openCount: number;
  } | null;
  emptyNote: string | null;
}

function isActivePerson(p: Entity): boolean {
  const a = (p as { activation_status?: string }).activation_status;
  const s = (p as { status?: string }).status;
  if (s !== undefined && s !== "ACTIVE") return false;
  if (a === "active" || a === undefined || a === null) return true;
  return a === "active";
}

const SEED_TITLE: Record<string, (s: OrgSeed) => string> = {
  set_manager: (s) =>
    s.proposed_manager_name && s.subject_name
      ? `${s.subject_name} may report to ${s.proposed_manager_name}`
      : s.subject_name
        ? `${s.subject_name} needs a manager`
        : "Someone needs a manager",
  confirm_or_activate_person: (s) =>
    s.subject_name
      ? `${s.subject_name} is ready to activate`
      : "A person is ready to activate",
  resolve_identity: (s) =>
    s.subject_name
      ? `Confirm who ${s.subject_name} is`
      : "Confirm a person's identity",
  add_project_membership: (s) =>
    s.subject_name
      ? `${s.subject_name} needs a first project`
      : "Someone needs a first project",
  add_team_membership: (s) =>
    s.subject_name
      ? `${s.subject_name} may belong on a team`
      : "Team membership to confirm",
  review_external_party: (s) =>
    s.subject_name
      ? `${s.subject_name} may be an external collaborator`
      : "External collaborator to classify",
  grant_tool_access: (s) =>
    s.subject_name
      ? `${s.subject_name} may need tool access`
      : "Tool access to review",
  connector_setup: () => "A connection needs setup",
  confirm_support_role: (s) =>
    s.subject_name
      ? `Confirm ${s.subject_name}'s support role`
      : "Confirm a support role",
  add_work_owner_edge: (s) =>
    s.subject_name
      ? `Confirm ${s.subject_name} owns this work`
      : "Confirm work ownership",
};

function humanTitle(seed: OrgSeed): string {
  const fn = SEED_TITLE[seed.seed_type];
  if (fn) return fn(seed);
  if (seed.subject_name) return `${seed.subject_name} — needs a decision`;
  return seed.recommended_action || "Suggestion needs review";
}

function confirmLabel(seedType: string): string {
  switch (seedType) {
    case "set_manager":
      return "Confirm manager";
    case "confirm_or_activate_person":
      return "Activate";
    case "add_project_membership":
      return "Confirm placement";
    case "review_external_party":
      return "Classify external";
    case "add_team_membership":
      return "Confirm team";
    case "grant_tool_access":
    case "connector_setup":
      return "Approve setup";
    default:
      return "Confirm";
  }
}

const CATEGORY_PLAIN: Record<ProposalClassId, string> = {
  people: "People Otzar found who need activation or identity confirmation.",
  roles: "Support or ownership roles observed in real work.",
  managers: "Reporting lines Otzar inferred — confirm before they apply.",
  teams: "Team membership from collaboration patterns.",
  projects: "First project placement and membership.",
  externals: "Possible external collaborators — never auto-tracked.",
  tools: "Tool access and connector setup needs.",
};

/**
 * Derive calm "Otzar found" findings from live org projections + Dandelion seeds.
 * Never invents counts. Never hides open seeds. Categories always sum to open work.
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
      reviewCategories: [],
      actionableItems: [],
      findings: [],
      reviewCta: null,
      emptyNote: "Otzar could not load organization discoveries yet.",
    };
  }

  const peopleList = people ?? [];
  const peopleCount = peopleList.length;
  const activePeopleCount = peopleList.filter(isActivePerson).length;
  const pendingActivation = peopleCount - activePeopleCount;

  const mems = memberships ?? [];
  const orgId = input.orgEntityId ?? null;
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

  // ── Review categories (actionable breakdown) ──────────────────────────
  const reviewCategories: OrgReviewCategory[] = [];
  for (const row of inv.rows) {
    if (row.count <= 0) continue;
    const def = DANDELION_PROPOSAL_CLASSES.find((c) => c.id === row.id);
    reviewCategories.push({
      id: row.id,
      shortLabel: row.label,
      label:
        row.count === 1
          ? `1 ${row.label.toLowerCase().replace(/s$/, "")} needs review`
          : `${row.count} ${row.label.toLowerCase()} need review`,
      count: row.count,
      to: `/organization-seeding?class=${row.id}`,
      plain: CATEGORY_PLAIN[row.id] ?? def?.plain ?? row.plain,
    });
  }
  // Structure gaps that may not yet be seeds
  if (peopleWithoutManager > 0 && !reviewCategories.some((c) => c.id === "managers")) {
    reviewCategories.push({
      id: "placement",
      shortLabel: "Placement",
      label:
        peopleWithoutManager === 1
          ? "1 person needs a manager"
          : `${peopleWithoutManager} people need a manager`,
      count: peopleWithoutManager,
      to: "/organization-seeding?class=managers",
      plain: "People without a clear reporting line in live structure.",
    });
  }
  if (pendingActivation > 0 && !reviewCategories.some((c) => c.id === "people")) {
    reviewCategories.push({
      id: "activation",
      shortLabel: "Activation",
      label:
        pendingActivation === 1
          ? "1 person still needs activation"
          : `${pendingActivation} people still need activation`,
      count: pendingActivation,
      to: "/users",
      plain: "People in the directory who are not fully active yet.",
    });
  }

  // ── Actionable inline items (plain language) ──────────────────────────
  const actionableItems: OrgActionableItem[] = openSeeds
    .slice()
    .sort((a, b) => {
      // Prefer authority-affecting / hierarchy first
      const rank = (t: string) =>
        t === "set_manager"
          ? 0
          : t === "confirm_or_activate_person"
            ? 1
            : t === "add_project_membership"
              ? 2
              : 3;
      return rank(a.seed_type) - rank(b.seed_type);
    })
    .slice(0, 12)
    .map((s) => {
      const honesty = buildProposalHonestyView(s);
      const cls = classForSeedType(s.seed_type);
      return {
        seedId: s.seed_id,
        categoryId: cls ?? "unknown",
        title: humanTitle(s),
        reason: s.recommended_action || honesty.honesty_summary,
        source: honesty.source,
        confidenceLabel: honesty.confidence_label,
        confidence: honesty.confidence,
        recommendedAction: s.recommended_action,
        seedType: s.seed_type,
        subjectName: s.subject_name,
        confirmLabel: confirmLabel(s.seed_type),
      };
    });

  const findings: OrgDiscoveryFinding[] = [];
  if (people !== null) {
    const peopleFinding: OrgDiscoveryFinding = {
      id: "people",
      label: `${activePeopleCount} ${activePeopleCount === 1 ? "person" : "people"} ready to use Otzar`,
      kind: activePeopleCount > 0 ? "ok" : "missing",
    };
    if (pendingActivation > 0) {
      peopleFinding.detail = `${pendingActivation} still need activation`;
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
  if (findings.length === 0 && reviewCategories.length === 0) {
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
    reviewCategories,
    actionableItems,
    findings,
    reviewCta,
    emptyNote,
  };
}
