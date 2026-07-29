// FILE: useful-memory.ts
// PURPOSE: Slice 4 — pure projection of preferences / candidates into
//          Helping you now, Recently learned, Needs your decision cards.
//          Storage counts are secondary only.
// CONNECTS TO: MyMemory, workStyle APIs, portable-core.

import {
  classifyPreferenceSummary,
  type PreferenceOwnership,
} from "@/lib/work-os/portable-core";

export interface PreferenceRow {
  correction_id: string;
  safe_summary: string;
  correction_type?: string;
  created_at?: string | null;
}

export interface CandidateRow {
  candidate_id: string;
  plain_language: string;
  category?: string;
  evidence_count?: number;
  confidence?: string;
  portability_proposal?: string;
}

export interface ActivePatternCard {
  id: string;
  title: string;
  description: string;
  ownership: PreferenceOwnership;
  last_used_label: string;
  can_stop: boolean;
}

export interface RecentLearningCard {
  id: string;
  what_changed: string;
  where_applies: string;
  active: boolean;
}

export interface DecisionCard {
  id: string;
  question: string;
  plain: string;
}

/**
 * WHAT: Detect internal / non-user preference noise that must never surface.
 * INPUT: raw safe_summary string.
 * OUTPUT: true when this is coach/storage machinery, not a taught preference.
 * WHY: Three-second comprehension fails when keys like
 *      otzar_first_use_walkthrough:v4:step:6 appear as "Recently learned".
 */
export function isInternalMemoryNoise(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  if (t.length === 0) return true;
  if (t.startsWith("otzar_first_use_walkthrough")) return true;
  if (t.includes("walkthrough:") && t.includes(":step:")) return true;
  if (/^otzar_[a-z0-9_]+:/.test(t)) return true;
  if (/localstorage|sessionstorage|uuid:|entity_id=/.test(t)) return true;
  return false;
}

/** Map a preference summary into a short title + description. */
export function humanizePreference(raw: string): {
  title: string;
  description: string;
  ownership: PreferenceOwnership;
} {
  const { plain, ownership } = classifyPreferenceSummary(raw);
  const p = plain.trim();
  const lower = p.toLowerCase();

  if (isInternalMemoryNoise(p)) {
    return {
      title: "Personal learning",
      description: "A stored preference is being refined.",
      ownership,
    };
  }

  if (/concise|short|brief|answer first/.test(lower)) {
    return {
      title: "Concise answers",
      description:
        "Otzar gives you the direct answer before supporting detail.",
      ownership,
    };
  }
  if (/risk before|recommendation before|decision first|executive/.test(lower)) {
    return {
      title: "Decision briefs",
      description:
        "Otzar shows the recommendation, evidence, open risk, and next decision in that order.",
      ownership,
    };
  }
  if (/follow-?up|meeting/.test(lower)) {
    return {
      title: "Meeting follow-ups",
      description:
        "Otzar groups related follow-ups before adding them to your work.",
      ownership,
    };
  }
  if (/external meeting|schedule|calendar/.test(lower)) {
    return {
      title: "Scheduling caution",
      description:
        "Otzar asks before scheduling external meetings when you have taught it to.",
      ownership,
    };
  }
  // Generic
  const title =
    p.length > 48 ? `${p.slice(0, 45)}…` : p.length > 0 ? p : "Work preference";
  return {
    title,
    description: p.length > 0 ? p : "A personal preference Otzar can apply.",
    ownership,
  };
}

/**
 * WHAT: Build ≤5 active personal patterns for Helping you now.
 * INPUT: preference rows from work-style API.
 * OUTPUT: ActivePatternCard[] (portable first).
 */
export function buildActivePatterns(
  prefs: ReadonlyArray<PreferenceRow>,
  max = 5,
): ActivePatternCard[] {
  const cleaned = prefs.filter((p) => !isInternalMemoryNoise(p.safe_summary));
  const portable = cleaned.filter((p) => {
    const { ownership } = classifyPreferenceSummary(p.safe_summary);
    return ownership === "portable" || ownership === "unknown";
  });
  const source = portable.length > 0 ? portable : cleaned;
  return source.slice(0, max).map((p) => {
    const h = humanizePreference(p.safe_summary);
    return {
      id: p.correction_id,
      title: h.title,
      description: h.description,
      ownership: h.ownership,
      last_used_label: "Active for your Talk and work",
      can_stop: true,
    };
  });
}

/**
 * WHAT: Recently learned cards from preferences (newest first when dated).
 */
export function buildRecentLearning(
  prefs: ReadonlyArray<PreferenceRow>,
  max = 5,
): RecentLearningCard[] {
  const cleaned = prefs.filter((p) => !isInternalMemoryNoise(p.safe_summary));
  const sorted = [...cleaned].sort((a, b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
  });
  return sorted.slice(0, max).map((p) => {
    const h = humanizePreference(p.safe_summary);
    return {
      id: p.correction_id,
      what_changed: h.description,
      where_applies:
        h.ownership === "org_bound"
          ? "Organization-scoped learning"
          : "Your future Talk responses and matching work",
      active: true,
    };
  });
}

/**
 * WHAT: Decision cards from work-style candidates (human intent only).
 */
export function buildDecisionCards(
  candidates: ReadonlyArray<CandidateRow>,
  max = 3,
): DecisionCard[] {
  return candidates.slice(0, max).map((c) => ({
    id: c.candidate_id,
    question: `Otzar noticed: ${c.plain_language}. Should this apply going forward?`,
    plain: c.plain_language,
  }));
}

/** Portable profile can-move / stays lists (plain language). */
export const PORTABLE_CAN_MOVE = [
  "Personal response preferences",
  "Reusable planning methods",
  "Writing and summary preferences",
  "Role-neutral skills you taught",
  "Personal workflows",
  "Approved AI Teammate behaviors",
] as const;

export const PORTABLE_STAYS_WITH_ORG = [
  "Company conversations and meeting transcripts",
  "Documents, decisions, and projects",
  "People, hierarchy, customers, and vendors",
  "Company policies, reports, and proof",
  "Organization-specific collaboration",
] as const;

export type PortableRequestStatus =
  | "none"
  | "requested"
  | "under_review"
  | "ready"
  | "denied"
  | "cancelled"
  | "expired";

export const PORTABLE_REQUEST_KEY = "otzar.portable_profile.request";

export interface PortableRequestRecord {
  status: PortableRequestStatus;
  requested_at: string;
  note?: string;
}

export function loadPortableRequest(): PortableRequestRecord | null {
  try {
    const raw = localStorage.getItem(PORTABLE_REQUEST_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PortableRequestRecord;
    if (p.status === "ready") {
      // Never claim Ready from local storage alone.
      return { ...p, status: "under_review", note: "Review in progress" };
    }
    return p;
  } catch {
    return null;
  }
}

export function savePortableRequest(rec: PortableRequestRecord): void {
  try {
    // Hard ban: local client may never mark Ready (export not shipped).
    if (rec.status === "ready") {
      rec = { ...rec, status: "under_review" };
    }
    localStorage.setItem(PORTABLE_REQUEST_KEY, JSON.stringify(rec));
  } catch {
    // ignore
  }
}

export function portableStatusLabel(s: PortableRequestStatus): string {
  switch (s) {
    case "none":
      return "Not requested";
    case "requested":
      return "Requested";
    case "under_review":
      return "Under review";
    case "ready":
      return "Ready";
    case "denied":
      return "Denied";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
  }
}
