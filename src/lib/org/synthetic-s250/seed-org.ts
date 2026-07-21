// FILE: seed-org.ts
// PURPOSE: R-03 S250 — deterministic synthetic enterprise graph (~250 humans + twins).

import { mulberry32, pick } from "./prng";
import type {
  PersonKind,
  SyntheticOrg,
  SyntheticPerson,
  SyntheticProject,
  SyntheticTeam,
} from "./types";

const FIRST = [
  "Ava", "Ben", "Cara", "Diego", "Elena", "Finn", "Gia", "Hugo", "Ivy", "Jade",
  "Kai", "Lena", "Milo", "Nora", "Omar", "Pia", "Quinn", "Rio", "Sara", "Theo",
  "Uma", "Vera", "Wade", "Xena", "Yuri", "Zara", "Alex", "Blair", "Casey", "Drew",
] as const;

const LAST = [
  "Nguyen", "Patel", "Kim", "Garcia", "Chen", "Ali", "Brooks", "Singh", "Lopez",
  "Martinez", "Wright", "Hill", "Scott", "Green", "Adams", "Baker", "Nelson",
  "Carter", "Mitchell", "Perez", "Roberts", "Turner", "Phillips", "Campbell",
] as const;

const TEAM_NAMES = [
  "Platform", "Growth", "Field Ops", "Customer Success", "Finance", "Legal",
  "Design", "Data", "Security", "Sales West", "Sales East", "Support",
  "Partnerships", "Enablement", "Infrastructure", "Mobile", "Web", "AI Lab",
  "Compliance", "RevOps", "People Ops", "Marketing", "Product Core", "QA",
] as const;

const ROLE_TEMPLATES: Record<PersonKind, string[]> = {
  executive: ["CEO", "VP Ops", "VP Product", "CFO"],
  manager: ["Engineering Manager", "CS Manager", "Sales Manager", "Ops Manager"],
  employee: ["IC Engineer", "IC Designer", "IC Analyst", "IC CSM"],
  contractor: ["Contract Engineer", "Contract Writer"],
  consultant: ["External Consultant"],
  external: ["Client Contact", "Vendor Contact"],
};

/**
 * Generate S250 org. Defaults: 250 people, 24 teams, 36 projects.
 * Pure + deterministic for seed.
 */
export function generateS250Org(seed = 250_001): SyntheticOrg {
  const rng = mulberry32(seed);
  const org_id = `syn-org-${seed}`;
  const nPeople = 250;
  const nTeams = 24;
  const nProjects = 36;

  // Executives first
  const people: SyntheticPerson[] = [];
  const makePerson = (
    i: number,
    kind: PersonKind,
    team_id: string | null,
    manager_id: string | null,
  ): SyntheticPerson => {
    const id = `p-${seed}-${i}`;
    const twin_id = `twin-${seed}-${i}`;
    const name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    const role_template = pick(rng, ROLE_TEMPLATES[kind]);
    const autonomy_ceiling =
      kind === "executive"
        ? "execute"
        : kind === "manager"
          ? "confirm"
          : kind === "employee"
            ? "draft"
            : "observe";
    const decision_rights =
      kind === "executive"
        ? ["strategic", "finance"]
        : kind === "manager"
          ? ["execution", "deadline"]
          : kind === "employee"
            ? ["technical"]
            : [];
    return {
      id,
      name,
      kind,
      team_id,
      manager_id,
      sponsor_id: null,
      role_template,
      twin_id,
      decision_rights,
      autonomy_ceiling,
    };
  };

  // CEO
  people.push(makePerson(0, "executive", null, null));
  // VPs
  for (let i = 1; i <= 3; i++) {
    people.push(makePerson(i, "executive", null, people[0]!.id));
  }

  const teams: SyntheticTeam[] = [];
  for (let t = 0; t < nTeams; t++) {
    const leadIdx = 4 + t; // managers start at 4
    const team_id = `team-${seed}-${t}`;
    const lead = makePerson(
      leadIdx,
      "manager",
      team_id,
      people[1 + (t % 3)]!.id, // report to a VP
    );
    people.push(lead);
    teams.push({
      id: team_id,
      name: TEAM_NAMES[t % TEAM_NAMES.length]! + (t >= TEAM_NAMES.length ? ` ${Math.floor(t / TEAM_NAMES.length) + 1}` : ""),
      lead_id: lead.id,
    });
  }

  // Fill remaining people across kinds
  let i = people.length;
  const kindCycle: PersonKind[] = [
    "employee",
    "employee",
    "employee",
    "contractor",
    "employee",
    "consultant",
    "employee",
    "external",
  ];
  while (people.length < nPeople) {
    const team = teams[people.length % teams.length]!;
    const kind = kindCycle[people.length % kindCycle.length]!;
    const manager_id =
      kind === "external" ? null : team.lead_id;
    const p = makePerson(i, kind, kind === "external" ? null : team.id, manager_id);
    // Matrix sponsor for some contractors
    if (kind === "contractor" && rng() > 0.4) {
      p.sponsor_id = team.lead_id;
    }
    people.push(p);
    i++;
  }

  const hierarchy_edges = people.map((p) => ({
    person_id: p.id,
    manager_id: p.manager_id,
  }));

  const matrix_edges = people
    .filter((p) => p.sponsor_id)
    .map((p) => ({
      person_id: p.id,
      sponsor_id: p.sponsor_id!,
      kind: "sponsor",
    }));

  const projects: SyntheticProject[] = [];
  const ics = people.filter((p) => p.kind === "employee" || p.kind === "manager");
  for (let p = 0; p < nProjects; p++) {
    const owner = pick(rng, ics);
    const member_ids = [owner.id];
    const extra = Math.floor(3 + rng() * 8);
    for (let m = 0; m < extra; m++) {
      const cand = pick(rng, ics);
      if (!member_ids.includes(cand.id)) member_ids.push(cand.id);
    }
    const team_ids = [
      ...new Set(
        member_ids
          .map((id) => people.find((x) => x.id === id)?.team_id)
          .filter((x): x is string => !!x),
      ),
    ].slice(0, 3);
    projects.push({
      id: `proj-${seed}-${p}`,
      name: `Initiative ${p + 1}: ${pick(rng, ["Launch", "Migrate", "Harden", "Expand", "Repair"])} ${pick(rng, ["Atlas", "Harbor", "Nimbus", "Forge", "Cedar"])}`,
      owner_id: owner.id,
      member_ids,
      team_ids,
      status: rng() > 0.85 ? "blocked" : "active",
    });
  }

  const twins = people.map((p) => ({
    id: p.twin_id,
    human_id: p.id,
    org_bound: true as const,
  }));

  return {
    seed,
    level: "S250",
    org_id,
    name: `Synthetic Meridian Scale ${seed}`,
    people,
    twins,
    teams,
    projects,
    hierarchy_edges,
    matrix_edges,
  };
}

export function orgStats(org: SyntheticOrg): Record<string, number> {
  const byKind: Record<string, number> = {};
  for (const p of org.people) {
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
  }
  return {
    people: org.people.length,
    twins: org.twins.length,
    teams: org.teams.length,
    projects: org.projects.length,
    matrix_edges: org.matrix_edges.length,
    managers: byKind.manager ?? 0,
    employees: byKind.employee ?? 0,
    contractors: byKind.contractor ?? 0,
    externals: byKind.external ?? 0,
    executives: byKind.executive ?? 0,
  };
}
