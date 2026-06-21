// FILE: src/lib/avp2/e2e-tauri-bridge.ts
// PURPOSE: OTZAR-E2E-4 — the browser-side wrapper that would invoke a secure NATIVE Tauri
//          command (`run_avp2_e2e_live_local`) to run the operator-gated niov-avp strict
//          live-local proof and return an AVP2_END_TO_END_RESULT. It is browser-safe: it
//          imports NO node/Tauri SDK package (the SDK is not a dependency) and resolves the
//          Tauri `invoke` from the global at runtime, or accepts an injected invoke for
//          tests. It validates the result (production proof refused), marker-scans the
//          native response, and never trusts raw output.
//
//          IMPORTANT — the native command is NOT registered yet: the repo's Rust shell
//          (src-tauri/src/{lib,main}.rs) documents that adding native commands that bypass
//          the Foundation API is gated on explicit Founder authorization (RULE 20 /
//          ADR-0052 / FOUNDER-AUTH). Until that command is authorized + registered, this
//          wrapper reports the bridge as unavailable / not-registered — it never fakes a run.
// CONNECTS TO: src/lib/avp2/e2e-runner-bridge.ts, e2e-contracts.ts, e2e-display.ts,
//          src/components/otzar/Avp2GovernedAccessCard.tsx, scripts/avp2-live-local.mjs.

import { detectShellMode } from "@/lib/voice/diagnostics";
import { validateAvp2EndToEndResult, e2eMarkerHits, type E2EResult } from "./e2e-contracts";
import { mapAvp2ResultToOtzarArtifact, type OtzarAvp2Artifact } from "./e2e-display";
import {
  validateAvp2RunnerLiveLocalConfig, LIVE_LOCAL_OUTPUT_PATH, LIVE_LOCAL_EVIDENCE_PATH,
  type LiveLocalConfig,
} from "./e2e-runner-bridge";

export const NATIVE_LIVE_LOCAL_COMMAND_NAME = "run_avp2_e2e_live_local";

export interface TauriLiveConfig {
  avpRepoPath: string;
  operatorConfirmed: boolean;
  foundationRepoPath?: string;
  intentPath?: string;
  port?: number;
}

export type InvokeFn = (cmd: string, payload?: Record<string, unknown>) => Promise<unknown>;
export interface TauriBridgeDeps { invoke?: InvokeFn | null; isTauri?: () => boolean }

interface TauriGlobal {
  __TAURI__?: { core?: { invoke?: unknown } };
  __TAURI_INTERNALS__?: { invoke?: unknown };
}

function resolveInvoke(): InvokeFn | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as TauriGlobal;
  const inv = w.__TAURI__?.core?.invoke ?? w.__TAURI_INTERNALS__?.invoke;
  return typeof inv === "function" ? (inv as InvokeFn) : null;
}

// WHAT: true only when running inside a Tauri webview AND an invoke fn is present. (A real
//       run can still fail with NATIVE_COMMAND_NOT_REGISTERED until the command is authorized.)
export function isAvp2TauriLiveBridgeAvailable(deps: TauriBridgeDeps = {}): boolean {
  const isTauri = deps.isTauri ?? ((): boolean => detectShellMode() === "tauri_webview");
  if (!isTauri()) return false;
  const invoke = deps.invoke !== undefined ? deps.invoke : resolveInvoke();
  return typeof invoke === "function";
}

export interface TauriRunOutcome {
  ok: boolean;
  available: boolean;
  result?: E2EResult;
  artifact?: OtzarAvp2Artifact;
  resultOutputPath: string;
  evidenceOutputPath: string;
  errors: string[];
}

function fullConfig(config: TauriLiveConfig): LiveLocalConfig {
  return {
    avpRepoPath: config.avpRepoPath,
    mode: "live-local",
    allowLiveLocal: true,
    operatorConfirmed: true,
    outputPath: LIVE_LOCAL_OUTPUT_PATH,
    evidenceOutputPath: LIVE_LOCAL_EVIDENCE_PATH,
    ...(config.intentPath !== undefined ? { intentPath: config.intentPath } : {}),
    ...(config.foundationRepoPath !== undefined ? { foundationRepoPath: config.foundationRepoPath } : {}),
    ...(config.port !== undefined ? { port: config.port } : {}),
  };
}

// WHAT: build the NARROW native payload (no command/args/output/evidence/url/token).
export function buildNativeLivePayload(config: TauriLiveConfig): Record<string, unknown> {
  return {
    avp_repo_path: config.avpRepoPath,
    operator_confirmed: true,
    ...(config.foundationRepoPath !== undefined ? { foundation_repo_path: config.foundationRepoPath } : {}),
    ...(config.intentPath !== undefined ? { intent_path: config.intentPath } : {}),
    ...(config.port !== undefined ? { port: config.port } : {}),
  };
}

// WHAT: invoke the secure native command (when authorized) and validate/map the result.
//       Gated on operatorConfirmed + the same path safety as the live-local config. Never
//       trusts raw native output (stringify + marker scan); never echoes raw stderr; returns
//       safe error codes only. With no invoke available → available:false (no fake run).
export async function runAvp2LiveLocalViaTauri(config: TauriLiveConfig, deps: TauriBridgeDeps = {}): Promise<TauriRunOutcome> {
  const base = { resultOutputPath: LIVE_LOCAL_OUTPUT_PATH, evidenceOutputPath: LIVE_LOCAL_EVIDENCE_PATH };
  if (config.operatorConfirmed !== true) return { ok: false, available: true, errors: ["OPERATOR_NOT_CONFIRMED"], ...base };

  const v = validateAvp2RunnerLiveLocalConfig(fullConfig(config));
  if (!v.ok) return { ok: false, available: true, errors: v.errors, ...base };

  const payload = buildNativeLivePayload(config);
  if (e2eMarkerHits(JSON.stringify(payload)).length > 0) return { ok: false, available: true, errors: ["UNSAFE_MARKER_IN_PAYLOAD"], ...base };

  const invoke = deps.invoke !== undefined ? deps.invoke : resolveInvoke();
  if (typeof invoke !== "function") return { ok: false, available: false, errors: ["TAURI_BRIDGE_UNAVAILABLE"], ...base };

  let raw: unknown;
  try { raw = await invoke(NATIVE_LIVE_LOCAL_COMMAND_NAME, payload); }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const notRegistered = /not\s*(found|registered|allowed)|unknown command|command .* not/i.test(msg);
    return { ok: false, available: true, errors: [notRegistered ? "NATIVE_COMMAND_NOT_REGISTERED" : "NATIVE_INVOCATION_FAILED"], ...base };
  }

  // Never trust raw native output — stringify + marker-scan before parsing.
  let text: string;
  if (typeof raw === "string") text = raw;
  else { try { text = JSON.stringify(raw); } catch { text = ""; } }
  if (e2eMarkerHits(text).length > 0) return { ok: false, available: true, errors: ["SECRET_MARKER_IN_NATIVE_RESPONSE"], ...base };

  let candidate: unknown = raw;
  if (typeof raw === "string") { try { candidate = JSON.parse(raw); } catch { return { ok: false, available: true, errors: ["NATIVE_RESPONSE_NOT_JSON"], ...base }; } }
  if (candidate !== null && typeof candidate === "object" && "result" in (candidate as Record<string, unknown>)) {
    candidate = (candidate as Record<string, unknown>).result;
  }
  const val = validateAvp2EndToEndResult(candidate);
  if (!val.ok) return { ok: false, available: true, errors: val.errors.map((e) => e.code), ...base };
  const result = candidate as E2EResult;
  return { ok: true, available: true, result, artifact: mapAvp2ResultToOtzarArtifact(result), errors: [], ...base };
}
