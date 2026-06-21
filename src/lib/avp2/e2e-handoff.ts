// FILE: src/lib/avp2/e2e-handoff.ts
// PURPOSE: OTZAR-E2E-6 — the operator result/evidence HANDOFF model. After the sidecar
//          writes /tmp/avp2-e2e-result.json + /tmp/avp-positive-evidence.json, Otzar
//          validates a pasted/loaded AVP2_END_TO_END_RESULT and produces a read-only
//          handoff summary: proof status/level, the quote→accept→access-receipt→proof
//          checklist, the "delivered=false is acceptable when proof resolved" note, and
//          the Federation Cloud load route for the evidence file. No upload, no network,
//          no execution. Production proof / payment / listing / secret markers are refused
//          (reuses validateAvp2EndToEndResult + the marker scan).
// CONNECTS TO: src/lib/avp2/e2e-contracts.ts, e2e-display.ts, e2e-runner-bridge.ts,
//          src/components/otzar/Avp2EvidenceHandoffPanel.tsx, docs/avp2-governed-access-connector.md.

import { validateAvp2EndToEndResult, e2eMarkerHits, type E2EResult } from "./e2e-contracts";
import { mapAvp2ResultToOtzarArtifact } from "./e2e-display";
import { LIVE_LOCAL_OUTPUT_PATH, LIVE_LOCAL_EVIDENCE_PATH } from "./e2e-runner-bridge";

export const HANDOFF_RESULT_PATH = LIVE_LOCAL_OUTPUT_PATH;
export const HANDOFF_EVIDENCE_PATH = LIVE_LOCAL_EVIDENCE_PATH;

// Proof levels that count as real (live) proof for the handoff. PRODUCTION_LIVE is never here.
const LIVE_PROOF_LEVELS = new Set(["LOCAL_LIVE", "HOSTED_STAGING_LIVE"]);

export interface HandoffFederationCloud {
  load_route: "/avp2/load";
  evidence_route: "/avp2/evidence";
  timeline_route: "/avp2/evidence/timeline";
  e2e_route: "/avp2/e2e";
}

export interface Avp2HandoffSummary {
  ok: boolean;
  status: "PASS" | "SKIP" | "FAIL";
  proof_level: string | null;
  is_live: boolean;
  result_summary: {
    discovered: boolean;
    quoted: boolean;
    accepted: boolean;
    accessed: boolean;
    proof_resolved: boolean;
    delivered: boolean | null;
    delivered_ok: boolean;
  };
  result_path?: string;
  evidence_path?: string;
  federation_cloud: HandoffFederationCloud;
  operator_next_action: string;
  warnings: string[];
  errors: string[];
}

const FC: HandoffFederationCloud = {
  load_route: "/avp2/load",
  evidence_route: "/avp2/evidence",
  timeline_route: "/avp2/evidence/timeline",
  e2e_route: "/avp2/e2e",
};

const EMPTY_SUMMARY: Avp2HandoffSummary["result_summary"] = {
  discovered: false, quoted: false, accepted: false, accessed: false, proof_resolved: false, delivered: null, delivered_ok: false,
};

function failSummary(errors: string[]): Avp2HandoffSummary {
  return {
    ok: false, status: "FAIL", proof_level: null, is_live: false, result_summary: { ...EMPTY_SUMMARY },
    federation_cloud: FC, operator_next_action: "Provide a valid AVP2_END_TO_END_RESULT (run the sidecar, then paste/load /tmp/avp2-e2e-result.json).",
    warnings: [], errors,
  };
}

export interface HandoffInput {
  result: E2EResult;
  resultPath?: string;
  evidencePath?: string;
}

// WHAT: build the read-only handoff summary from a VALIDATED result. is_live only for a
//       PASS + LIVE_LOCAL_RUN + LOCAL_LIVE/HOSTED_STAGING_LIVE result; delivered=false is
//       acceptable (delivered_ok) once proof resolved (a proof reference, not the content).
export function buildAvp2HandoffSummary(input: HandoffInput): Avp2HandoffSummary {
  const v = validateAvp2EndToEndResult(input.result);
  if (!v.ok) return failSummary(v.errors.map((e) => e.code));

  const r = input.result;
  const artifact = mapAvp2ResultToOtzarArtifact(r);
  const proofResolved = r.summary.proof_resolved === true;
  const deliveredRaw = r.summary.delivered;
  const delivered: boolean | null = typeof deliveredRaw === "boolean" ? deliveredRaw : null;
  const delivered_ok = proofResolved && delivered !== true;

  const is_live = r.status === "PASS" && r.provenance === "LIVE_LOCAL_RUN" && r.proof_level !== null && LIVE_PROOF_LEVELS.has(r.proof_level);

  const warnings: string[] = [];
  if (r.status === "PASS" && !is_live) warnings.push("PASS_BUT_NOT_LIVE_PROVENANCE");
  if (proofResolved && delivered === true) warnings.push("UNEXPECTED_CONTENT_DELIVERED");

  const operator_next_action = is_live
    ? `Load ${input.evidencePath ?? HANDOFF_EVIDENCE_PATH} into Federation Cloud ${FC.load_route}.`
    : `Run the sidecar to produce a LIVE_LOCAL_RUN proof, then load the evidence into Federation Cloud ${FC.load_route}.`;

  return {
    ok: true,
    status: artifact.status,
    proof_level: r.proof_level,
    is_live,
    result_summary: {
      discovered: r.summary.discovered === true,
      quoted: r.summary.quoted === true,
      accepted: r.summary.accepted === true,
      accessed: r.summary.accessed === true,
      proof_resolved: proofResolved,
      delivered,
      delivered_ok,
    },
    ...(input.resultPath !== undefined ? { result_path: input.resultPath } : {}),
    evidence_path: input.evidencePath ?? HANDOFF_EVIDENCE_PATH,
    federation_cloud: FC,
    operator_next_action,
    warnings,
    errors: [],
  };
}

export interface ValidateResultTextOutcome { ok: boolean; result?: E2EResult; errors: string[] }

// WHAT: parse + validate pasted result text (browser cannot read /tmp directly). Marker-
//       scans first (token / raw content / proof body), then JSON-parses + validates.
export function validateAvp2ResultFileText(text: unknown): ValidateResultTextOutcome {
  if (typeof text !== "string" || text.trim().length === 0) return { ok: false, errors: ["RESULT_TEXT_EMPTY"] };
  if (e2eMarkerHits(text).length > 0) return { ok: false, errors: ["SECRET_MARKER_IN_RESULT_TEXT"] };
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, errors: ["RESULT_TEXT_NOT_JSON"] }; }
  const v = validateAvp2EndToEndResult(parsed);
  if (!v.ok) return { ok: false, errors: v.errors.map((e) => e.code) };
  return { ok: true, result: parsed as E2EResult, errors: [] };
}

// WHAT: build the evidence-handoff summary directly from a validated result (+ optional
//       evidence path). Convenience over buildAvp2HandoffSummary with the default paths.
export function buildFederationCloudEvidenceHandoff(result: E2EResult, evidencePath: string = HANDOFF_EVIDENCE_PATH): Avp2HandoffSummary {
  return buildAvp2HandoffSummary({ result, resultPath: HANDOFF_RESULT_PATH, evidencePath });
}
