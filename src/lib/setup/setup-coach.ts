// FILE: setup-coach.ts
// PURPOSE: [GAP-U SLICE-5] The setup coach — Otzar noticing setup stalls
//          and guiding repair. DERIVED, NOT PERSISTED (the doctrine
//          decision): setup stalls need repair links, not approval, so the
//          Dandelion approve/reject lifecycle is the wrong shape for them —
//          "approving" an activation stall would change no truth. Deriving
//          from the SAME computeSetupFacts the journey and go-live gate use
//          makes every noise rule true by construction: exactly one
//          grouped recommendation per category (never per person), stable
//          keys, disappears the moment the issue is fixed, never re-mints,
//          never spams, zero writes, zero cross-org risk. Ingestion-driven
//          seeds with REAL approval semantics (activate-person, tool-grant,
//          external review) stay in the operational Dandelion lane — the
//          two are never mixed.
// CONNECTS TO: src/lib/setup/setup-journey.ts (computeSetupFacts),
//          src/pages/OrgSetup.tsx (the coaching card),
//          tests/unit/setup-coach.test.tsx.

import { computeSetupFacts, type SetupInputs } from "@/lib/setup/setup-journey";

export interface SetupCoachRecommendation {
  /** Stable dedupe key — one per category, never per row. */
  key:
    | "activation_stall"
    | "links_expired"
    | "invites_unfinished"
    | "roles_missing"
    | "managers_missing"
    | "twins_need_setup"
    | "first_workflow_pending"
    | "review_queue_waiting";
  /** What Otzar noticed — grouped human copy, never one item per person. */
  label: string;
  whyItMatters: string;
  repair: { label: string; to: string };
  /** Whether the go-live gate treats this as blocking (vs worth tidying). */
  blocksGoLive: boolean;
  /** Human source-of-truth label. */
  source: string;
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/** Priority-ordered, grouped, deterministic. Returns EVERY current
 *  recommendation; the UI shows the top few. Empty array = nothing to
 *  coach — the honest quiet state. */
export function deriveSetupCoach(inputs: SetupInputs): SetupCoachRecommendation[] {
  const f = computeSetupFacts(inputs);
  const out: SetupCoachRecommendation[] = [];
  if (!f.peopleLoaded) return out; // never coach from unloaded truth

  if (f.waiting > 0) {
    out.push({
      key: "activation_stall",
      label: `${plural(f.waiting, "invited person hasn't", "invited people haven't")} activated Otzar yet.`,
      whyItMatters: "They can't use Otzar until they activate — a quick nudge with their link usually fixes it.",
      repair: { label: "Open Users", to: "/users" },
      blocksGoLive: f.active.length === 0,
      source: "live member records",
    });
  }
  if (f.expired > 0) {
    out.push({
      key: "links_expired",
      label: `${plural(f.expired, "activation link has", "activation links have")} expired.`,
      whyItMatters: "Expired links are safe to replace — generate fresh ones from Users.",
      repair: { label: "Open Users", to: "/users" },
      blocksGoLive: false,
      source: "live member records",
    });
  }
  if (f.invitedOnly > 0) {
    out.push({
      key: "invites_unfinished",
      label: `${plural(f.invitedOnly, "person was", "people were")} added but never got an activation link.`,
      whyItMatters: "Finish their invite from Users so they can join.",
      repair: { label: "Open Users", to: "/users" },
      blocksGoLive: false,
      source: "live member records",
    });
  }
  if (f.twinsLoaded && f.missingRole > 0) {
    out.push({
      key: "roles_missing",
      label: `${plural(f.missingRole, "active person needs", "active people need")} a role assignment.`,
      whyItMatters: "Roles let Otzar route work confidently and tell each AI Teammate what to focus on.",
      repair: { label: "Open AI Teammates", to: "/ai-teammates" },
      blocksGoLive: false,
      source: "live role templates",
    });
  }
  if (f.missingManager > 0 && f.active.length > 1) {
    out.push({
      key: "managers_missing",
      label: `${plural(f.missingManager, "person is", "people are")} missing a manager relationship.`,
      whyItMatters: "Clarifications and escalations get less precise without managers mapped. Hierarchy is not permission.",
      repair: { label: "Open Users", to: "/users" },
      blocksGoLive: false,
      source: "live reporting structure",
    });
  }
  if (f.twinsLoaded && f.twinsNeedSetup + f.twinsNotConfigured > 0) {
    const n = f.twinsNeedSetup + f.twinsNotConfigured;
    out.push({
      key: "twins_need_setup",
      label: `${plural(n, "AI Teammate needs", "AI Teammates need")} roles or tools before they can support governed work.`,
      whyItMatters: "People can work without them — but ready teammates are where Otzar starts pulling weight.",
      repair: { label: "Open AI Teammates", to: "/ai-teammates" },
      blocksGoLive: false,
      source: "live teammate readiness",
    });
  }
  if (!f.workHasFlowed && f.active.length > 0) {
    out.push({
      key: "first_workflow_pending",
      label: "Setup context exists, but no work has flowed yet.",
      whyItMatters:
        "Paste a meeting transcript in Comms — Otzar turns it into owned commitments, follow-ups, and suggestions.",
      repair: { label: "Open Comms", to: "/app/comms" },
      blocksGoLive: false,
      source: "live work records",
    });
  }
  if (f.openSeeds > 0) {
    out.push({
      key: "review_queue_waiting",
      label: `${plural(f.openSeeds, "suggestion from your team's real work is", "suggestions from your team's real work are")} waiting for review.`,
      whyItMatters:
        "These are operational recommendations from ingested communication — nothing applies without your review.",
      repair: { label: "Open Organization Seeding", to: "/organization-seeding" },
      blocksGoLive: false,
      source: "live review queue",
    });
  }
  return out;
}
