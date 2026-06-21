// FILE: src/lib/connectors/avp2-governed-access.ts
// PURPOSE: OTZAR-E2E-1 — the Otzar AVP² governed-access connector STUB. It builds a
//          governed-access request descriptor (intent + the niov-avp runner command),
//          parses/validates a runner result, and maps it to an Otzar work artifact. It
//          performs NO external writes and invokes NO shell command in this phase — the
//          actual local runner invocation is wired in OTZAR-E2E-2. Default mode is
//          dry-run; a live-local run must be requested explicitly. No tokens, no hosted
//          network, no real payment, no fake proof.
//
//          The agent does not execute freely. The agent asks for a governed quote to call
//          a bounded action. Foundation is the trust substrate; Publisher Gateway is the
//          AVP² edge adapter; Foundation remains the source of governance truth in live mode.
// CONNECTS TO: src/lib/avp2/e2e-contracts.ts, src/lib/avp2/e2e-display.ts,
//          niov-avp `npm run e2e:otzar-avp2`, src/components/otzar/Avp2GovernedAccessCard.tsx.

import {
  createAvp2GovernedAccessIntent, validateAvp2EndToEndIntent, validateAvp2EndToEndResult,
  type CreateIntentInput, type E2EIntent, type E2EResult, type Issue,
} from "@/lib/avp2/e2e-contracts";
import { mapAvp2ResultToOtzarArtifact, type OtzarAvp2Artifact } from "@/lib/avp2/e2e-display";

export type RunnerMode = "dry-run" | "live-local";

export const RUNNER_COMMANDS: Record<RunnerMode, string> = {
  "dry-run": "npm run e2e:otzar-avp2 -- --dry-run --json",
  "live-local": "npm run e2e:otzar-avp2 -- --strict --json",
};

export interface GovernedAccessRequest {
  intent: E2EIntent;
  mode: RunnerMode;
  command: string;
  // True only when the operator explicitly opts into a live-local run.
  executes_live: boolean;
  // Honest note: this phase never invokes the command — it is a descriptor only.
  runtime_note: string;
}

// WHAT: build a governed-access request descriptor. Default mode is the safe dry-run;
//       a live-local run must be requested explicitly. Never invokes the command.
export function buildAvp2GovernedAccessRequest(
  input: CreateIntentInput = {},
  opts: { mode?: RunnerMode } = {},
): GovernedAccessRequest {
  const mode: RunnerMode = opts.mode ?? "dry-run";
  return {
    intent: createAvp2GovernedAccessIntent(input),
    mode,
    command: RUNNER_COMMANDS[mode],
    executes_live: mode === "live-local",
    runtime_note: "Descriptor only — Otzar does not invoke the runner in this phase (OTZAR-E2E-2 wires a safe local invocation). No external write, no hosted network.",
  };
}

// WHAT: build the safe default (dry-run) governed-access request descriptor.
export function buildAvp2GovernedAccessDryRun(input: CreateIntentInput = {}): GovernedAccessRequest {
  return buildAvp2GovernedAccessRequest(input, { mode: "dry-run" });
}

export interface ParseResultOutcome { ok: boolean; result?: E2EResult; errors: Issue[] }

// WHAT: parse + validate a runner result (JSON text or already-parsed object). Never
//       trusts it — re-validates every time; refuses production proof / payment / secrets.
export function parseAvp2RunnerResult(input: string | unknown): ParseResultOutcome {
  let parsed: unknown = input;
  if (typeof input === "string") {
    try { parsed = JSON.parse(input); } catch { return { ok: false, errors: [{ code: "RESULT_NOT_JSON", message: "Result is not valid JSON." }] }; }
  }
  const v = validateAvp2EndToEndResult(parsed);
  if (!v.ok) return { ok: false, errors: v.errors };
  return { ok: true, result: parsed as E2EResult, errors: [] };
}

export interface WorkArtifactOutcome { ok: boolean; artifact?: OtzarAvp2Artifact; errors: Issue[] }

// WHAT: validate a runner result and map it to an Otzar work artifact. Live proof is
//       claimed only when the result's provenance is LIVE_LOCAL_RUN (enforced by the mapper).
export function mapAvp2RunnerResultToWorkArtifact(input: string | unknown): WorkArtifactOutcome {
  const parsed = parseAvp2RunnerResult(input);
  if (!parsed.ok || parsed.result === undefined) return { ok: false, errors: parsed.errors };
  return { ok: true, artifact: mapAvp2ResultToOtzarArtifact(parsed.result), errors: [] };
}

// Re-export for convenience to surfaces that only need the intent helpers.
export { createAvp2GovernedAccessIntent, validateAvp2EndToEndIntent };

// ── Safe demo constants (mirror the niov-avp fixtures; no secrets, no raw content) ──

export const DEMO_LOCAL_LIVE_RESULT: E2EResult = {
  result_schema: "AVP2_END_TO_END_RESULT",
  result_schema_version: "0.1",
  origin: "otzar",
  status: "PASS",
  provenance: "LIVE_LOCAL_RUN",
  proof_level: "LOCAL_LIVE",
  steps: {
    intent_created: "PASS", foundation_seed_or_existing_listing: "PASS",
    discover: "PASS", quote: "PASS", accept: "PASS", access_receipt: "PASS", proof: "PASS",
    evidence_pack: "PASS", federation_cloud_visible: "SKIP",
  },
  summary: { discovered: true, quoted: true, accepted: true, accessed: true, proof_resolved: true, delivered: false },
  federation_cloud: { evidence_route: "/avp2/evidence", timeline_route: "/avp2/evidence/timeline", registry_route: "/avp2/registry", e2e_route: "/avp2/e2e" },
  otzar_display: {
    title: "Governed access completed",
    message: "AVP² quote, accept, access receipt, and proof resolved through Foundation. The content itself was not delivered — only a proof reference.",
    next_action: "Review evidence in Federation Cloud.",
  },
};

export const DEMO_DRY_RUN_RESULT: E2EResult = {
  result_schema: "AVP2_END_TO_END_RESULT",
  result_schema_version: "0.1",
  origin: "otzar",
  status: "SKIP",
  provenance: "DRY_RUN",
  proof_level: null,
  steps: {
    intent_created: "PASS", foundation_seed_or_existing_listing: "SKIP",
    discover: "SKIP", quote: "SKIP", accept: "SKIP", access_receipt: "SKIP", proof: "SKIP",
    evidence_pack: "SKIP", federation_cloud_visible: "SKIP",
  },
  summary: { discovered: false, quoted: false, accepted: false, accessed: false, proof_resolved: false, delivered: false },
  federation_cloud: { evidence_route: "/avp2/evidence", timeline_route: "/avp2/evidence/timeline", registry_route: "/avp2/registry", e2e_route: "/avp2/e2e" },
  otzar_display: {
    title: "Governed access rehearsed (dry-run)",
    message: "Intent is valid. This is a dry-run — NOT live proof. No Foundation call was made.",
    next_action: "Run without --dry-run against a local Foundation to produce proof.",
  },
};
