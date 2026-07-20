// FILE: project-resolution.ts
// PURPOSE: J-03 — Conversation resolves to a Work Project safely; routine
//          project work is ONE hop (Talk → project heart), not a multi-page
//          maze. Pure matchers + deep-link builders; the orb executes
//          navigate + surface context; WorkProjects reads ?project=.
// CONNECTS TO: AmbientOtzarBar, pages/app/WorkProjects, FOUNDER J-03.

export interface ProjectCandidate {
  project_id: string;
  name: string;
}

export type ProjectResolutionKind =
  | "resolved"
  | "needs_choice"
  | "not_found"
  | "list_only"
  | "no_projects"
  | "not_project_intent";

export interface ProjectResolution {
  kind: ProjectResolutionKind;
  /** Extracted name fragment when the user named a project. */
  query?: string;
  project?: ProjectCandidate;
  candidates?: ProjectCandidate[];
  /** Employee deep link — open heart in one navigation. */
  href?: string;
  /** Calm, speakable outcome (no ids). */
  message: string;
}

const WORK_PROJECTS_PATH = "/app/work-projects";

/** Build deep link that auto-opens the project heart (anti-maze). */
export function projectHeartHref(projectId: string): string {
  const q = new URLSearchParams({
    project: projectId,
    open: "1",
  });
  return `${WORK_PROJECTS_PATH}?${q.toString()}`;
}

export function projectsListHref(): string {
  return WORK_PROJECTS_PATH;
}

/**
 * Detect whether the utterance wants project work / project context.
 * Named project phrases extract a query; bare "open projects" is list_only.
 */
export function detectProjectIntent(
  text: string,
): { mode: "named" | "list" | "status"; query?: string } | null {
  const t = text.trim();
  if (t.length === 0) return null;
  const lower = t.toLowerCase();

  // Bare list / open projects (no specific name).
  if (
    /\b(?:open|show|go to|take me to|bring up)\s+(?:my\s+)?projects?\b/.test(
      lower,
    ) ||
    /\b(?:list|see)\s+(?:my\s+)?projects?\b/.test(lower) ||
    /^projects?\.?$/.test(lower)
  ) {
    // If a name is also present ("open project Phoenix"), prefer named.
    const namedInList = extractNamedProjectQuery(t);
    if (namedInList !== null) return { mode: "named", query: namedInList };
    return { mode: "list" };
  }

  // Status / heart of a project.
  if (
    /\b(?:status|update|pulse|heart|context|spine)\b/.test(lower) &&
    /\bproject\b/.test(lower)
  ) {
    const q = extractNamedProjectQuery(t);
    if (q !== null) return { mode: "status", query: q };
    return { mode: "status" };
  }

  // Open / show / work on a named project.
  const named = extractNamedProjectQuery(t);
  if (named !== null) return { mode: "named", query: named };

  // "Open project" / "show the project" without a name → list / choose.
  if (
    /\b(?:open|show|view|go to|work on)\s+(?:the\s+|this\s+|my\s+)?project\b/.test(
      lower,
    )
  ) {
    return { mode: "list" };
  }

  return null;
}

/** Pull a free-text project name from common phrasings. */
export function extractNamedProjectQuery(text: string): string | null {
  const patterns: RegExp[] = [
    /\b(?:open|show|view|go to|bring up|take me to|work on)\s+(?:the\s+|my\s+)?project\s+["“]?([^"”?.!,]+)["”]?/i,
    /\bproject\s+["“]([^"”]+)["”]/i,
    /\b(?:about|for|on)\s+project\s+["“]?([^"”?.!,]+)["”]?/i,
    /\b(?:status|update|pulse|context)\s+(?:of|for|on)\s+(?:the\s+)?project\s+["“]?([^"”?.!,]+)["”]?/i,
    /\b(?:status|update|pulse)\s+(?:of|for|on)\s+["“]?([^"”?.!,]+)["”]?\s+project\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1] !== undefined) {
      const q = m[1].trim().replace(/\s+/g, " ");
      // Drop trailing filler
      const cleaned = q
        .replace(/\b(please|now|here|for me)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (cleaned.length >= 2 && cleaned.length <= 80) return cleaned;
    }
  }
  return null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Match a query against candidate projects.
 * Exact (normalized) > starts-with > includes. Multiple includes → needs_choice.
 */
export function matchProjects(
  query: string,
  projects: ReadonlyArray<ProjectCandidate>,
): { matches: ProjectCandidate[]; mode: "exact" | "partial" | "none" } {
  const q = normalize(query);
  if (q.length === 0 || projects.length === 0) {
    return { matches: [], mode: "none" };
  }
  const exact = projects.filter((p) => normalize(p.name) === q);
  if (exact.length === 1) return { matches: exact, mode: "exact" };
  if (exact.length > 1) return { matches: exact, mode: "partial" };

  const starts = projects.filter((p) => normalize(p.name).startsWith(q));
  if (starts.length === 1) return { matches: starts, mode: "exact" };
  if (starts.length > 1) return { matches: starts, mode: "partial" };

  const includes = projects.filter((p) => normalize(p.name).includes(q));
  if (includes.length === 1) return { matches: includes, mode: "exact" };
  if (includes.length > 1) return { matches: includes, mode: "partial" };

  // Query contains project name (user said long phrase with short project name)
  const reverse = projects.filter((p) => q.includes(normalize(p.name)));
  if (reverse.length === 1) return { matches: reverse, mode: "exact" };
  if (reverse.length > 1) return { matches: reverse, mode: "partial" };

  return { matches: [], mode: "none" };
}

/**
 * Full resolution for Talk: given utterance + projects, produce kind + message + href.
 */
export function resolveProjectFromConversation(
  text: string,
  projects: ReadonlyArray<ProjectCandidate>,
): ProjectResolution {
  const intent = detectProjectIntent(text);
  if (intent === null) {
    return {
      kind: "not_project_intent",
      message: "",
    };
  }

  if (projects.length === 0) {
    return {
      kind: "no_projects",
      href: projectsListHref(),
      message:
        "You're not on any project yet. Open Projects to create one — Otzar groups work around a mission.",
    };
  }

  if (intent.mode === "list" && intent.query === undefined) {
    return {
      kind: "list_only",
      href: projectsListHref(),
      message:
        projects.length === 1
          ? `Opening Projects. You have one mission: ${projects[0]!.name}.`
          : `Opening Projects — ${projects.length} active missions. Open one heart to see people, work, and next steps.`,
    };
  }

  const query = intent.query?.trim() ?? "";
  if (query.length === 0) {
    // Status without a name → if single project, open it; else list.
    if (intent.mode === "status" && projects.length === 1) {
      const only = projects[0]!;
      return {
        kind: "resolved",
        project: only,
        href: projectHeartHref(only.project_id),
        message: `Opening ${only.name} — mission heart in one place.`,
      };
    }
    return {
      kind: "needs_choice",
      candidates: projects.slice(0, 8),
      href: projectsListHref(),
      message:
        "Which project? Open Projects and pick one, or name it — for example, “Open project Phoenix.”",
    };
  }

  const { matches, mode } = matchProjects(query, projects);
  if (mode === "exact" && matches.length === 1) {
    const p = matches[0]!;
    return {
      kind: "resolved",
      query,
      project: p,
      href: projectHeartHref(p.project_id),
      message: `Opening ${p.name} — people, open work, and next steps in one place.`,
    };
  }
  if (mode === "partial" && matches.length > 1) {
    const names = matches
      .slice(0, 4)
      .map((m) => m.name)
      .join(", ");
    return {
      kind: "needs_choice",
      query,
      candidates: matches,
      href: projectsListHref(),
      message: `A few projects match “${query}”: ${names}. Which one?`,
    };
  }

  return {
    kind: "not_found",
    query,
    href: projectsListHref(),
    message: `I couldn't find a project named “${query}”. Open Projects to pick one, or create it.`,
  };
}

/** Whether this resolution should short-circuit the orb (vs fall through). */
export function isProjectResolutionHandled(r: ProjectResolution): boolean {
  return r.kind !== "not_project_intent";
}
