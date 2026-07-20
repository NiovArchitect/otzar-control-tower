// FILE: comms-lineage.ts
// PURPOSE: K-03 — Communication lineage: conversation → decisions /
//          commitments / obligations / truth candidates as one continuous
//          chain (not scattered cards without a spine). Pure projection from
//          CommsExtractionResult (+ optional ingest work items).
// CONNECTS TO: pages/app/Comms ExtractionView, FOUNDER K-01/K-03.

import type {
  CommsExtractionResult,
  CommsIngestResult,
  CommsSuggestedAction,
} from "@/lib/types/foundation";

export type CommsLineageFacetKind =
  | "decision"
  | "commitment"
  | "blocker"
  | "truth_candidate"
  | "obligation"
  | "follow_up";

export interface CommsLineageItem {
  text: string;
  /** Optional owner / target for obligations and follow-ups. */
  owner?: string;
  status?: string;
}

export interface CommsLineageFacet {
  id: string;
  kind: CommsLineageFacetKind;
  label: string;
  /** Why this facet exists in the lineage (role of the signal). */
  why: string;
  items: CommsLineageItem[];
  empty: boolean;
}

export interface CommsLineage {
  /** Ordered facets for the continuous spine. */
  facets: CommsLineageFacet[];
  counts: {
    decisions: number;
    commitments: number;
    blockers: number;
    truthCandidates: number;
    obligations: number;
    followUps: number;
  };
  /** True when governed work was created or follow-ups drafted. */
  hasGovernedWork: boolean;
  /** One-line human spine summary. */
  spineSummary: string;
}

function facet(
  id: string,
  kind: CommsLineageFacetKind,
  label: string,
  why: string,
  items: CommsLineageItem[],
): CommsLineageFacet {
  return {
    id,
    kind,
    label,
    why,
    items,
    empty: items.length === 0,
  };
}

/**
 * Project extraction (+ optional ingest) into a continuous lineage spine.
 * Empty facets stay present with empty=true so the chain is never “missing”.
 */
export function buildCommsLineage(
  extraction: CommsExtractionResult,
  ingest: CommsIngestResult | null = null,
): CommsLineage {
  const decisions = extraction.decisions.map((text) => ({ text }));
  const commitments = extraction.commitments.map((text) => ({ text }));
  const blockers = extraction.risks_or_blockers.map((text) => ({ text }));

  // Truth candidates = decisions + blockers (what the org may treat as fact).
  const truthItems: CommsLineageItem[] = [
    ...decisions.map((d) => ({
      text: d.text,
      status: "decision",
    })),
    ...blockers.map((b) => ({
      text: b.text,
      status: "blocker",
    })),
  ];

  // Obligations: prefer durable ingest work items; else commitments as pending.
  let obligations: CommsLineageItem[] = [];
  if (ingest !== null && ingest.work_items.length > 0) {
    obligations = ingest.work_items.map((w) => ({
      text: w.title,
      owner: w.owner_name,
      status: w.status,
    }));
  } else {
    obligations = commitments.map((c) => ({
      text: c.text,
      status: "pending_obligation",
    }));
  }

  const followUps: CommsLineageItem[] = extraction.suggested_actions.map(
    (a: CommsSuggestedAction) => ({
      text: a.draft_text.slice(0, 160),
      owner: a.target.display_name,
      status: a.resolution_status,
    }),
  );

  const facets: CommsLineageFacet[] = [
    facet(
      "decisions",
      "decision",
      "Decisions",
      "What the group decided — source of org truth candidates.",
      decisions,
    ),
    facet(
      "commitments",
      "commitment",
      "Commitments",
      "Who committed to what — feeds obligations.",
      commitments,
    ),
    facet(
      "blockers",
      "blocker",
      "Blockers & risks",
      "What is stuck — also truth candidates when unresolved.",
      blockers,
    ),
    facet(
      "truth",
      "truth_candidate",
      "Truth candidates",
      "Decisions and blockers Otzar can treat as candidate org truth.",
      truthItems,
    ),
    facet(
      "obligations",
      "obligation",
      "Obligations",
      "Tracked work from commitments / governed ingest.",
      obligations,
    ),
    facet(
      "follow_ups",
      "follow_up",
      "Governed follow-ups",
      "Draft actions under approval — never silent sends.",
      followUps,
    ),
  ];

  const counts = {
    decisions: decisions.length,
    commitments: commitments.length,
    blockers: blockers.length,
    truthCandidates: truthItems.length,
    obligations: obligations.length,
    followUps: followUps.length,
  };

  const hasGovernedWork =
    followUps.length > 0 ||
    (ingest !== null &&
      (ingest.counts.owned > 0 || ingest.work_items.length > 0));

  const parts: string[] = [];
  if (counts.decisions > 0) parts.push(`${counts.decisions} decision${counts.decisions === 1 ? "" : "s"}`);
  if (counts.commitments > 0)
    parts.push(`${counts.commitments} commitment${counts.commitments === 1 ? "" : "s"}`);
  if (counts.followUps > 0)
    parts.push(`${counts.followUps} follow-up${counts.followUps === 1 ? "" : "s"}`);
  if (counts.obligations > 0 && ingest !== null)
    parts.push(`${counts.obligations} obligation${counts.obligations === 1 ? "" : "s"}`);

  const spineSummary =
    parts.length > 0
      ? `Lineage: ${parts.join(" → ")}.`
      : "Lineage: conversation organized — no decisions, commitments, or follow-ups extracted yet.";

  return {
    facets,
    counts,
    hasGovernedWork,
    spineSummary,
  };
}

/** Fingerprint for tests — ordered non-empty facet kinds. */
export function commsLineageFingerprint(lineage: CommsLineage): string {
  return lineage.facets
    .filter((f) => !f.empty)
    .map((f) => f.kind)
    .join(",");
}
