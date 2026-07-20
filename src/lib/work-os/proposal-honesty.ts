// FILE: proposal-honesty.ts
// PURPOSE: E-02 — Dandelion / org proposals preserve source, confidence,
//          alternatives; authority-affecting changes require admin confirm.
//          Never silent-apply access, hierarchy, or identity authority.
// CONNECTS TO: OrganizationSeeding SeedCard, FOUNDER E-02.

/** Normalized confidence for display + ordering. */
export type ProposalConfidence = "high" | "medium" | "low" | "unknown";

export interface ProposalAlternative {
  id: string;
  label: string;
  kind: "primary" | "alternative" | "defer" | "dismiss";
}

export interface ProposalHonestyView {
  seed_id: string;
  seed_type: string;
  /** Source evidence / provenance line; never invented. */
  source: string | null;
  source_missing: boolean;
  confidence: ProposalConfidence;
  confidence_label: string;
  /** True when applying would change authority/access/hierarchy. */
  authority_affecting: boolean;
  /** Explicit admin confirm required before apply. */
  requires_admin_confirm: boolean;
  alternatives: ProposalAlternative[];
  honesty_summary: string;
}

/** Seed types that change org authority, access, or reporting structure. */
export const AUTHORITY_AFFECTING_SEED_TYPES: ReadonlySet<string> = new Set([
  "grant_tool_access",
  "connector_setup",
  "confirm_or_activate_person",
  "resolve_identity",
  "set_manager",
  "add_team_membership",
  "add_work_owner_edge",
  "review_external_party",
  "confirm_support_role",
  // project membership is operational structure; still needs confirm
  "add_project_membership",
]);

export function isAuthorityAffectingSeedType(seedType: string): boolean {
  return AUTHORITY_AFFECTING_SEED_TYPES.has(seedType);
}

export function normalizeProposalConfidence(
  raw: string | null | undefined,
): ProposalConfidence {
  if (raw === undefined || raw === null || raw.trim().length === 0) {
    return "unknown";
  }
  const c = raw.trim().toLowerCase();
  if (c === "high" || c === "h") return "high";
  if (c === "medium" || c === "med" || c === "m") return "medium";
  if (c === "low" || c === "l") return "low";
  // Foundation may send HIGH/MEDIUM/LOW
  if (c.includes("high")) return "high";
  if (c.includes("med")) return "medium";
  if (c.includes("low")) return "low";
  return "unknown";
}

export function confidenceLabel(c: ProposalConfidence): string {
  switch (c) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    case "unknown":
      return "Confidence not scored";
  }
}

export interface ProposalSeedInput {
  seed_id: string;
  seed_type: string;
  recommended_action?: string | null;
  source_evidence?: string | null;
  source_conversation_id?: string | null;
  confidence?: string | null;
  approval_required?: boolean;
  possible_matches?: ReadonlyArray<{
    external_collaborator_id: string;
    display_label: string;
    reason?: string;
  }>;
  proposed_manager_name?: string | null;
  proposed_manager_entity_id?: string | null;
  status?: string;
}

/**
 * Build alternatives always available on a pending proposal:
 * primary recommended action, any explicit matches, defer, dismiss.
 */
export function buildProposalAlternatives(
  seed: ProposalSeedInput,
): ProposalAlternative[] {
  const alts: ProposalAlternative[] = [];
  const primary =
    (seed.recommended_action ?? "").trim() ||
    "Approve the suggested next step";
  alts.push({
    id: "primary",
    label: primary,
    kind: "primary",
  });

  if (seed.seed_type === "set_manager") {
    if (seed.proposed_manager_name) {
      alts.push({
        id: "confirm-proposed-manager",
        label: `Confirm manager: ${seed.proposed_manager_name}`,
        kind: "primary",
      });
    }
    alts.push({
      id: "choose-other-manager",
      label: "Choose a different manager",
      kind: "alternative",
    });
  }

  if (seed.possible_matches && seed.possible_matches.length > 0) {
    for (const m of seed.possible_matches) {
      alts.push({
        id: `match:${m.external_collaborator_id}`,
        label: `Link to existing: ${m.display_label}${m.reason ? ` — ${m.reason}` : ""}`,
        kind: "alternative",
      });
    }
    alts.push({
      id: "track-new",
      label: "Track as a new collaborator (do not merge)",
      kind: "alternative",
    });
  }

  alts.push({
    id: "hold",
    label: "Keep for later (do not apply)",
    kind: "defer",
  });
  alts.push({
    id: "reject",
    label: "Ignore this suggestion",
    kind: "dismiss",
  });

  return alts;
}

export function buildProposalHonestyView(
  seed: ProposalSeedInput,
): ProposalHonestyView {
  const sourceRaw = (seed.source_evidence ?? "").trim();
  const source =
    sourceRaw.length > 0
      ? sourceRaw
      : seed.source_conversation_id
        ? "From a conversation Otzar already has (excerpt not provided)."
        : null;
  const confidence = normalizeProposalConfidence(seed.confidence);
  const authority_affecting = isAuthorityAffectingSeedType(seed.seed_type);
  const requires_admin_confirm =
    authority_affecting || seed.approval_required === true;
  const alternatives = buildProposalAlternatives(seed);

  let honesty_summary: string;
  if (source === null) {
    honesty_summary =
      "Source evidence is missing — review carefully before approving.";
  } else if (requires_admin_confirm) {
    honesty_summary =
      "Authority-affecting suggestion: admin must confirm. Nothing applies automatically.";
  } else {
    honesty_summary =
      "Suggestion only until you choose an action. Alternatives include hold and ignore.";
  }

  return {
    seed_id: seed.seed_id,
    seed_type: seed.seed_type,
    source,
    source_missing: source === null,
    confidence,
    confidence_label: confidenceLabel(confidence),
    authority_affecting,
    requires_admin_confirm,
    alternatives,
    honesty_summary,
  };
}

/** Guard: pending authority seeds must not auto-apply. */
export function mayAutoApplyProposal(seed: ProposalSeedInput): boolean {
  const v = buildProposalHonestyView(seed);
  if (v.requires_admin_confirm) return false;
  const st = (seed.status ?? "").toUpperCase();
  if (st === "SEED_APPLIED" || st === "SEED_APPROVED") return false;
  return false; // Dandelion queue is always human-gated
}
