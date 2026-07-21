// FILE: project-graph.ts
// PURPOSE: J-04 — canonical project graph coherence: inventory linked objects
//          and detect disconnects (orphan obligations, empty docs, etc.).
// CONNECTS TO: WorkProjects ProjectContextPanel, FOUNDER J-04.

export type ProjectGraphFacetId =
  | "objective"
  | "owners"
  | "people"
  | "open_work"
  | "blockers"
  | "meetings"
  | "docs"
  | "obligations"
  | "ai"
  | "next_best";

export type ProjectGraphInventory = {
  project_id: string;
  name: string;
  facets: Record<
    ProjectGraphFacetId,
    { present: boolean; count: number; samples: string[] }
  >;
};

export type ProjectGraphDisconnect = {
  code: string;
  severity: "P0" | "P1" | "P2";
  plain: string;
};

export const J04_DOCTRINE =
  "A project is the mission heart of Otzar work: people, open work, blockers, " +
  "meetings, docs, obligations, AI activity, and next-best action must stay " +
  "connected to one project_id. Disconnected stages fail the graph.";

export const PROJECT_GRAPH_FACETS: ReadonlyArray<{
  id: ProjectGraphFacetId;
  label: string;
}> = [
  { id: "objective", label: "Objective / mission" },
  { id: "owners", label: "Owners" },
  { id: "people", label: "People" },
  { id: "open_work", label: "Open work" },
  { id: "blockers", label: "Blockers" },
  { id: "meetings", label: "Meetings" },
  { id: "docs", label: "Documents" },
  { id: "obligations", label: "Obligations" },
  { id: "ai", label: "AI Teammate activity" },
  { id: "next_best", label: "Next-best action" },
];

export function buildProjectGraphInventory(input: {
  project_id: string;
  name: string;
  objective?: string | null;
  owner_names?: string[];
  member_names?: string[];
  open_work_titles?: string[];
  blocker_titles?: string[];
  meeting_titles?: string[];
  doc_titles?: string[];
  obligation_titles?: string[];
  ai_notes?: string[];
  next_best?: string | null;
}): ProjectGraphInventory {
  const facet = (
    present: boolean,
    samples: string[],
  ): { present: boolean; count: number; samples: string[] } => ({
    present,
    count: samples.length,
    samples: samples.slice(0, 5),
  });

  const owners = input.owner_names ?? [];
  const members = input.member_names ?? [];
  const open = input.open_work_titles ?? [];
  const blockers = input.blocker_titles ?? [];
  const meetings = input.meeting_titles ?? [];
  const docs = input.doc_titles ?? [];
  const obligations = input.obligation_titles ?? [];
  const ai = input.ai_notes ?? [];
  const objective = (input.objective ?? input.name ?? "").trim();
  const next = (input.next_best ?? "").trim();

  return {
    project_id: input.project_id,
    name: input.name,
    facets: {
      objective: facet(objective.length > 0, objective ? [objective] : []),
      owners: facet(owners.length > 0, owners),
      people: facet(members.length > 0 || owners.length > 0, [
        ...owners,
        ...members,
      ]),
      open_work: facet(open.length > 0, open),
      blockers: facet(blockers.length > 0, blockers),
      meetings: facet(meetings.length > 0, meetings),
      docs: facet(docs.length > 0, docs),
      obligations: facet(obligations.length > 0, obligations),
      ai: facet(ai.length > 0, ai),
      next_best: facet(next.length > 0, next ? [next] : []),
    },
  };
}

/** Detect coherence failures for a project inventory. */
export function detectProjectGraphDisconnects(
  inv: ProjectGraphInventory,
): ProjectGraphDisconnect[] {
  const out: ProjectGraphDisconnect[] = [];
  if (!inv.facets.objective.present) {
    out.push({
      code: "missing_objective",
      severity: "P1",
      plain: "Project has no mission/objective label",
    });
  }
  if (!inv.facets.owners.present && !inv.facets.people.present) {
    out.push({
      code: "no_people",
      severity: "P0",
      plain: "Project has no owners or members",
    });
  }
  // Obligations without open work / people is a disconnect risk
  if (inv.facets.obligations.present && !inv.facets.people.present) {
    out.push({
      code: "orphan_obligations",
      severity: "P0",
      plain: "Obligations exist without project people",
    });
  }
  // Open work without project id is impossible here — flag empty mission heart
  if (
    !inv.facets.open_work.present &&
    !inv.facets.blockers.present &&
    !inv.facets.meetings.present &&
    !inv.facets.docs.present
  ) {
    out.push({
      code: "empty_heart",
      severity: "P2",
      plain: "No open work, blockers, meetings, or docs on the project heart",
    });
  }
  return out;
}

export function projectGraphHealth(
  inv: ProjectGraphInventory,
): { score: number; disconnects: ProjectGraphDisconnect[]; ok: boolean } {
  const disconnects = detectProjectGraphDisconnects(inv);
  const present = PROJECT_GRAPH_FACETS.filter((f) => inv.facets[f.id].present)
    .length;
  const score = Math.round((present / PROJECT_GRAPH_FACETS.length) * 100) / 100;
  const p0 = disconnects.some((d) => d.severity === "P0");
  return { score, disconnects, ok: !p0 && score >= 0.3 };
}
