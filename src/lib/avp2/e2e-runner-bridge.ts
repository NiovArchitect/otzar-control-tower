// FILE: src/lib/avp2/e2e-runner-bridge.ts
// PURPOSE: OTZAR-E2E-2 — the LOCAL runner bridge. It builds the fixed niov-avp runner
//          command (dry-run by default), validates the bridge config, runs the runner
//          via an INJECTED process runner, and parses/validates the emitted
//          AVP2_END_TO_END_RESULT — or loads a result file niov-avp already wrote. It is
//          PURE + dependency-injected: it imports NO node built-ins, so it never leaks
//          `child_process`/`fs` into the browser bundle. The real node implementations
//          live in e2e-runner-node.ts (never imported by browser code).
//
//          SAFETY: dry-run only (live-local is refused here — deferred to OTZAR-E2E-3);
//          fixed command + args (no shell string, no arbitrary command); config is
//          guarded against shell metacharacters; a marker scan over stdout/stderr/result
//          fails closed and never echoes raw stderr that could contain a token. No hosted
//          network, no production, no real payment, no external writes (read-only file
//          consumption), no secrets.
//          Foundation is the trust substrate. The agent asks for a quote.
// CONNECTS TO: src/lib/avp2/e2e-contracts.ts, src/lib/avp2/e2e-runner-node.ts (node deps),
//          src/lib/connectors/avp2-governed-access.ts, docs/avp2-governed-access-connector.md.

import { validateAvp2EndToEndResult, e2eMarkerHits, type E2EResult } from "./e2e-contracts";

export const RUNNER_NPM_SCRIPT = "e2e:otzar-avp2";
export const DRY_RUN_ARGS: readonly string[] = ["run", RUNNER_NPM_SCRIPT, "--", "--dry-run", "--json"];
export const AVP2_DRY_RUN_COMMAND = "npm run e2e:otzar-avp2 -- --dry-run --json";
export const DEFAULT_TIMEOUT_MS = 60_000;

export type BridgeMode = "dry-run" | "result-file";

export interface RunnerConfig {
  avpRepoPath: string;
  mode: BridgeMode;
  allowLiveLocal?: false;
  intentPath?: string;
  resultFile?: string;
}

export interface BuiltCommand { command: "npm"; args: string[]; cwd: string }

// Shell metacharacters / control chars — refused defensively even though we use execFile.
const UNSAFE_PATH = /[;&|`$(){}<>\n\r*?]/;

function pathIsSafe(p: string): boolean {
  return typeof p === "string" && p.length > 0 && !UNSAFE_PATH.test(p) && e2eMarkerHits(p).length === 0;
}

export interface ConfigValidation { ok: boolean; errors: string[] }

// WHAT: validate the bridge config. Refuses live-local, unknown modes, unsafe paths, and
//       any shell-metacharacter / secret-marker injection in repo/intent/result paths.
export function validateAvp2RunnerConfig(input: unknown): ConfigValidation {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null) return { ok: false, errors: ["CONFIG_NOT_OBJECT"] };
  const c = input as Partial<RunnerConfig>;
  if (typeof c.avpRepoPath !== "string" || !pathIsSafe(c.avpRepoPath)) errors.push("UNSAFE_AVP_REPO_PATH");
  if (c.mode !== "dry-run" && c.mode !== "result-file") errors.push("UNSUPPORTED_MODE");
  // Live-local is never allowed through this bridge (deferred to OTZAR-E2E-3).
  const raw = c as Record<string, unknown>;
  if (raw.allowLiveLocal === true) errors.push("LIVE_LOCAL_NOT_ALLOWED");
  if (raw.mode === "live-local") errors.push("LIVE_LOCAL_NOT_ALLOWED");
  if (c.intentPath !== undefined && !pathIsSafe(c.intentPath)) errors.push("UNSAFE_INTENT_PATH");
  if (c.mode === "result-file") {
    if (typeof c.resultFile !== "string" || !pathIsSafe(c.resultFile)) errors.push("UNSAFE_RESULT_FILE_PATH");
  }
  return { ok: errors.length === 0, errors };
}

// WHAT: build the fixed dry-run command. Never accepts an arbitrary command/args; only
//       the pinned npm script + optional validated --intent path. Throws on unsafe config.
export function buildAvp2RunnerCommand(config: RunnerConfig): BuiltCommand {
  const v = validateAvp2RunnerConfig(config);
  if (!v.ok) throw new Error(`INVALID_RUNNER_CONFIG:${v.errors.join(",")}`);
  if (config.mode !== "dry-run") throw new Error("ONLY_DRY_RUN_IS_EXECUTABLE");
  const args = [...DRY_RUN_ARGS];
  if (config.intentPath !== undefined && pathIsSafe(config.intentPath)) args.push("--intent", config.intentPath);
  return { command: "npm", args, cwd: config.avpRepoPath };
}

export interface ParsedResult { ok: boolean; result?: E2EResult; errors: string[] }

// WHAT: marker-scan + parse + validate runner stdout into a trusted-shape result.
export function parseAvp2RunnerStdout(stdout: unknown): ParsedResult {
  if (typeof stdout !== "string" || stdout.trim().length === 0) return { ok: false, errors: ["STDOUT_EMPTY"] };
  if (e2eMarkerHits(stdout).length > 0) return { ok: false, errors: ["SECRET_MARKER_IN_STDOUT"] };
  let parsed: unknown;
  try { parsed = JSON.parse(stdout); } catch { return { ok: false, errors: ["STDOUT_NOT_JSON"] }; }
  const val = validateAvp2EndToEndResult(parsed);
  if (!val.ok) return { ok: false, errors: val.errors.map((e) => e.code) };
  return { ok: true, result: parsed as E2EResult, errors: [] };
}

// ── Injected process runner ──────────────────────────────────────────────────

export interface ProcessOutput { code: number | null; stdout: string; stderr: string; timedOut?: boolean }
export type ProcessRunner = (cmd: BuiltCommand, opts: { timeoutMs: number }) => Promise<ProcessOutput>;

export interface RunDeps { runProcess: ProcessRunner; timeoutMs?: number }

// WHAT: run the dry-run command via the injected process runner, then parse the result.
//       stderr is marker-scanned but NEVER echoed raw (a token in stderr fails closed with
//       a code only). Forces mode=dry-run regardless of input.
export async function runAvp2RunnerDryRun(config: RunnerConfig, deps: RunDeps): Promise<ParsedResult> {
  const dryConfig: RunnerConfig = { ...config, mode: "dry-run", allowLiveLocal: false };
  const v = validateAvp2RunnerConfig(dryConfig);
  if (!v.ok) return { ok: false, errors: v.errors };
  let cmd: BuiltCommand;
  try { cmd = buildAvp2RunnerCommand(dryConfig); } catch (e) { return { ok: false, errors: [e instanceof Error ? e.message : "BUILD_COMMAND_FAILED"] }; }

  let out: ProcessOutput;
  try { out = await deps.runProcess(cmd, { timeoutMs: deps.timeoutMs ?? DEFAULT_TIMEOUT_MS }); }
  catch { return { ok: false, errors: ["RUNNER_SPAWN_FAILED"] }; }

  if (out.timedOut === true) return { ok: false, errors: ["RUNNER_TIMED_OUT"] };
  // Never include raw stderr in errors — only flag a marker leak by code.
  if (typeof out.stderr === "string" && e2eMarkerHits(out.stderr).length > 0) return { ok: false, errors: ["SECRET_MARKER_IN_STDERR"] };
  if (out.code !== 0 && out.code !== null && (typeof out.stdout !== "string" || out.stdout.trim().length === 0)) return { ok: false, errors: [`RUNNER_EXIT_${out.code}`] };
  return parseAvp2RunnerStdout(out.stdout);
}

// ── Result-file mode (read-only, injected reader) ────────────────────────────

export type FileReader = (path: string) => string;
export interface ReadDeps { readFile: FileReader }

// Refuse obviously protected paths (repo config, VCS, package manifests, lockfiles).
export function unsafeResultPath(path: string): string | null {
  if (!pathIsSafe(path)) return "UNSAFE_PATH";
  const p = path.replace(/\\/g, "/");
  if (/\/\.git\//.test(p) || p.endsWith("package.json") || p.endsWith("package-lock.json") || p.endsWith(".env") || p.includes("/.ssh/")) return "PROTECTED_PATH";
  return null;
}

// WHAT: load a result file niov-avp already wrote (read-only; never deletes/modifies it).
//       Refuses protected paths, marker-scans, parses, and validates the result.
export function loadAvp2RunnerResultFile(path: string, deps: ReadDeps): ParsedResult {
  const unsafe = unsafeResultPath(path);
  if (unsafe !== null) return { ok: false, errors: [unsafe] };
  let text: string;
  try { text = deps.readFile(path); } catch { return { ok: false, errors: ["RESULT_FILE_UNREADABLE"] }; }
  if (typeof text !== "string" || text.trim().length === 0) return { ok: false, errors: ["RESULT_FILE_EMPTY"] };
  if (e2eMarkerHits(text).length > 0) return { ok: false, errors: ["SECRET_MARKER_IN_FILE"] };
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, errors: ["RESULT_FILE_NOT_JSON"] }; }
  const val = validateAvp2EndToEndResult(parsed);
  if (!val.ok) return { ok: false, errors: val.errors.map((e) => e.code) };
  return { ok: true, result: parsed as E2EResult, errors: [] };
}
