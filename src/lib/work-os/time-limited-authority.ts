// FILE: time-limited-authority.ts
// PURPOSE: M-02 — one-time / session / project / time-limited authority
//          classes; revocation; transparent purpose reason.
// CONNECTS TO: AuthorityGrants, FOUNDER M-02, TwinAuthorityDurationClass.

export type DurationClass =
  | "ONE_TIME"
  | "SESSION"
  | "SHORT_TERM"
  | "PROJECT_SCOPED"
  | "LONG_TERM"
  | "INDEFINITE"
  | "UNTIL_REVOKED"
  | "SENSITIVE_CASE_BY_CASE";

export type DurationFamily =
  | "one_shot"
  | "session"
  | "project"
  | "time_boxed"
  | "open_ended"
  | "sensitive";

export interface DurationClassInfo {
  id: DurationClass;
  label: string;
  family: DurationFamily;
  /** True when the grant is designed to end without indefinite open run. */
  time_limited: boolean;
  plain: string;
}

export const DURATION_CLASS_CATALOG: ReadonlyArray<DurationClassInfo> = [
  {
    id: "ONE_TIME",
    label: "One time",
    family: "one_shot",
    time_limited: true,
    plain: "Single use, then spent.",
  },
  {
    id: "SESSION",
    label: "Session",
    family: "session",
    time_limited: true,
    plain: "Lasts for this work session only.",
  },
  {
    id: "SHORT_TERM",
    label: "Short term",
    family: "time_boxed",
    time_limited: true,
    plain: "Hours to a few days, then expires.",
  },
  {
    id: "PROJECT_SCOPED",
    label: "Project scoped",
    family: "project",
    time_limited: true,
    plain: "Tied to a project boundary.",
  },
  {
    id: "LONG_TERM",
    label: "Long term",
    family: "time_boxed",
    time_limited: true,
    plain: "Longer window, still not unlimited.",
  },
  {
    id: "INDEFINITE",
    label: "Indefinite",
    family: "open_ended",
    time_limited: false,
    plain: "No fixed end — still revocable and policy-capped.",
  },
  {
    id: "UNTIL_REVOKED",
    label: "Until revoked",
    family: "open_ended",
    time_limited: false,
    plain: "Stays until you revoke it.",
  },
  {
    id: "SENSITIVE_CASE_BY_CASE",
    label: "Sensitive — case by case",
    family: "sensitive",
    time_limited: true,
    plain: "High sensitivity; each use is deliberate.",
  },
] as const;

export const TRANSPARENT_REASON_COPY =
  "Every grant needs a plain-language purpose. The reason is always visible " +
  "so you know why authority exists — and so you can revoke it with confidence.";

export const REVOCATION_COPY =
  "Revocable grants can be withdrawn anytime. Org policy, memory scope, " +
  "audit, and approvals still apply even while a grant is active.";

export const INDEFINITE_NOT_UNLIMITED =
  "Indefinite and until-revoked do not mean unlimited. They remain capped by " +
  "org policy and your other boundaries.";

export function durationInfo(
  id: string | null | undefined,
): DurationClassInfo | null {
  const t = (id ?? "").toUpperCase();
  return DURATION_CLASS_CATALOG.find((d) => d.id === t) ?? null;
}

export function durationLabel(id: string | null | undefined): string {
  return durationInfo(id)?.label ?? "Not set";
}

export function isTimeLimitedDuration(id: string | null | undefined): boolean {
  const info = durationInfo(id);
  return info ? info.time_limited : true; // unknown → treat carefully as limited
}

export interface GrantInventorySummary {
  total: number;
  time_limited_count: number;
  open_ended_count: number;
  revocable_count: number;
  duration_classes_present: string[];
  families_present: DurationFamily[];
  purposes_present: number;
}

export function summarizeGrants(
  grants: Array<{
    duration_class?: string | null;
    revocable?: boolean;
    purpose_summary?: string | null;
  }>,
): GrantInventorySummary {
  const classes = new Set<string>();
  const families = new Set<DurationFamily>();
  let timeLimited = 0;
  let openEnded = 0;
  let revocable = 0;
  let purposes = 0;
  for (const g of grants) {
    const info = durationInfo(g.duration_class);
    if (info) {
      classes.add(info.id);
      families.add(info.family);
      if (info.time_limited) timeLimited += 1;
      else openEnded += 1;
    }
    if (g.revocable) revocable += 1;
    if ((g.purpose_summary ?? "").trim().length > 0) purposes += 1;
  }
  return {
    total: grants.length,
    time_limited_count: timeLimited,
    open_ended_count: openEnded,
    revocable_count: revocable,
    duration_classes_present: Array.from(classes),
    families_present: Array.from(families),
    purposes_present: purposes,
  };
}

/** Purpose is the transparent reason — empty is not acceptable for create. */
export function isTransparentPurpose(purpose: string | null | undefined): boolean {
  return (purpose ?? "").trim().length >= 3;
}

/** Families required for multi-class proof (at least one of each when possible). */
export const M02_CORE_FAMILIES: DurationFamily[] = [
  "one_shot",
  "session",
  "project",
  "time_boxed",
];
