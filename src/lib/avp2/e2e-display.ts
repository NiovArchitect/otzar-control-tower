// FILE: src/lib/avp2/e2e-display.ts
// PURPOSE: OTZAR-E2E-1 — map a validated AVP2_END_TO_END_RESULT into an Otzar-friendly
//          artifact/card model (title, status, summary, proof level, provenance, a step
//          checklist, next action, and Federation Cloud deep links). It claims LIVE proof
//          ONLY when provenance is LIVE_LOCAL_RUN and status is PASS — otherwise it is
//          explicitly not-live. `delivered: false` is acceptable (and correct) once proof
//          resolved — the loop returns a proof reference, not the content body. Read-only.
// CONNECTS TO: src/lib/avp2/e2e-contracts.ts, src/components/otzar/Avp2GovernedAccessCard.tsx.

import {
  FC_DEFAULT_ROUTES, clientDisplayOf, type E2EResult, type E2EFederationCloud, type StepStatus,
} from "./e2e-contracts";

export interface OtzarStepItem { key: string; label: string; status: StepStatus }
export interface OtzarAvp2Artifact {
  kind: "AVP2_GOVERNED_ACCESS";
  title: string;
  status: "PASS" | "SKIP" | "FAIL";
  is_live: boolean;
  provenance: string;
  proof_level: string;
  summary: string;
  steps: OtzarStepItem[];
  proof_resolved: boolean;
  delivered: boolean;
  delivered_ok: boolean;
  next_action: string;
  federation_cloud_links: E2EFederationCloud;
}

const STEP_LABELS: ReadonlyArray<readonly [keyof E2EResult["steps"], string]> = [
  ["intent_created", "Otzar intent created"],
  ["foundation_seed_or_existing_listing", "Foundation seed / existing listing"],
  ["discover", "Discover"],
  ["quote", "Quote"],
  ["accept", "Accept"],
  ["access_receipt", "Access receipt"],
  ["proof", "Proof"],
  ["evidence_pack", "Evidence pack"],
  ["federation_cloud_visible", "Federation Cloud visible"],
];

// WHAT: turn a validated result into an Otzar artifact. is_live is true ONLY for a
//       LIVE_LOCAL_RUN PASS — never claims live proof on a dry-run/derived/skip result.
export function mapAvp2ResultToOtzarArtifact(result: E2EResult): OtzarAvp2Artifact {
  const steps: OtzarStepItem[] = STEP_LABELS.map(([key, label]) => ({
    key, label, status: result.steps[key] ?? "SKIP",
  }));
  const is_live = result.provenance === "LIVE_LOCAL_RUN" && result.status === "PASS";
  const proof_resolved = result.summary.proof_resolved === true;
  const delivered = result.summary.delivered === true;
  // Prefer the canonical client_display; fall back to the deprecated otzar_display alias.
  const display = clientDisplayOf(result) as Partial<ReturnType<typeof clientDisplayOf>> | undefined;

  return {
    kind: "AVP2_GOVERNED_ACCESS",
    title: display?.title ?? "AVP² governed access",
    status: result.status,
    is_live,
    provenance: result.provenance,
    proof_level: result.proof_level ?? "—",
    summary: display?.message ?? "",
    steps,
    proof_resolved,
    delivered,
    // delivered=false is acceptable (correct) once proof resolved — proof reference, not content.
    delivered_ok: proof_resolved && !delivered,
    next_action: display?.next_action ?? "Review evidence in Federation Cloud.",
    federation_cloud_links: result.federation_cloud ?? FC_DEFAULT_ROUTES,
  };
}
