// FILE: tests/unit/avp2-runner-bridge.test.ts
// PURPOSE: OTZAR-E2E-2 — lock the local runner bridge: fixed dry-run command (no
//          injection), config validation (live-local refused, unsafe paths refused),
//          stdout/stderr parsing with marker fail-closed, result-file consumption, and the
//          connector dry-run/result-file functions — all via INJECTED process runner /
//          file reader (no real niov-avp invocation, no real fs in unit tests).
// CONNECTS TO: src/lib/avp2/e2e-runner-bridge.ts, src/lib/connectors/avp2-governed-access.ts.

import { describe, expect, it } from "vitest";
import {
  buildAvp2RunnerCommand, validateAvp2RunnerConfig, parseAvp2RunnerStdout,
  loadAvp2RunnerResultFile, runAvp2RunnerDryRun, unsafeResultPath,
  AVP2_DRY_RUN_COMMAND, DRY_RUN_ARGS,
  type RunnerConfig, type ProcessOutput,
} from "@/lib/avp2/e2e-runner-bridge";
import {
  invokeAvp2GovernedAccessDryRun, consumeAvp2GovernedAccessResultFile, DEMO_LOCAL_LIVE_RESULT,
} from "@/lib/connectors/avp2-governed-access";

const REPO = "/Users/x/NIOV Labs/github/niov-avp";
const dryConfig: RunnerConfig = { avpRepoPath: REPO, mode: "dry-run" };
const passStdout = JSON.stringify(DEMO_LOCAL_LIVE_RESULT);
const fakeRunner = (out: Partial<ProcessOutput>) => async (): Promise<ProcessOutput> => ({ code: 0, stdout: "", stderr: "", ...out });

describe("AVP² local runner bridge", () => {
  // ── command ──
  it("1. builds the dry-run command with fixed args", () => {
    const cmd = buildAvp2RunnerCommand(dryConfig);
    expect(cmd.command).toBe("npm");
    expect(cmd.args).toEqual([...DRY_RUN_ARGS]);
    expect(cmd.cwd).toBe(REPO);
    expect(AVP2_DRY_RUN_COMMAND).toBe("npm run e2e:avp2-intent -- --dry-run --json");
  });
  it("2. rejects arbitrary command injection in the repo path", () => {
    const v = validateAvp2RunnerConfig({ avpRepoPath: "/x; rm -rf /", mode: "dry-run" });
    expect(v.ok).toBe(false);
    expect(v.errors).toContain("UNSAFE_AVP_REPO_PATH");
  });
  it("3. validates the niov-avp repo path is present", () => {
    expect(validateAvp2RunnerConfig({ avpRepoPath: "", mode: "dry-run" }).ok).toBe(false);
  });
  it("4. dry-run mode is allowed", () => expect(validateAvp2RunnerConfig(dryConfig).ok).toBe(true));
  it("5. live-local mode is rejected by default", () => {
    expect(validateAvp2RunnerConfig({ avpRepoPath: REPO, mode: "live-local" as unknown as "dry-run" }).errors).toContain("LIVE_LOCAL_NOT_ALLOWED");
    expect(validateAvp2RunnerConfig({ avpRepoPath: REPO, mode: "dry-run", allowLiveLocal: true as unknown as false }).errors).toContain("LIVE_LOCAL_NOT_ALLOWED");
  });
  it("5b. buildCommand throws on a live-local attempt", () => {
    expect(() => buildAvp2RunnerCommand({ avpRepoPath: REPO, mode: "result-file" })).toThrow();
  });
  it("5c. a safe --intent path is appended; an unsafe one is refused", () => {
    expect(buildAvp2RunnerCommand({ ...dryConfig, intentPath: "/tmp/intent.json" }).args).toContain("--intent");
    expect(validateAvp2RunnerConfig({ ...dryConfig, intentPath: "/tmp/$(whoami).json" }).errors).toContain("UNSAFE_INTENT_PATH");
  });

  // ── stdout parsing ──
  it("6. parses valid dry-run stdout", () => {
    const dry = JSON.stringify({ ...DEMO_LOCAL_LIVE_RESULT, status: "SKIP", provenance: "DRY_RUN", proof_level: null });
    expect(parseAvp2RunnerStdout(dry).ok).toBe(true);
  });
  it("7. parses valid PASS stdout", () => {
    const p = parseAvp2RunnerStdout(passStdout);
    expect(p.ok).toBe(true);
    expect(p.result?.status).toBe("PASS");
  });
  it("8. malformed stdout fails safely", () => {
    expect(parseAvp2RunnerStdout("not json").errors).toContain("STDOUT_NOT_JSON");
    expect(parseAvp2RunnerStdout("").ok).toBe(false);
  });
  it("9. stdout with an access_token marker fails", () => {
    expect(parseAvp2RunnerStdout(`${passStdout} access_token=abc`).errors).toContain("SECRET_MARKER_IN_STDOUT");
  });

  // ── run (injected runner) ──
  it("10. stderr with a private_key marker fails closed (never echoed)", async () => {
    const out = await runAvp2RunnerDryRun(dryConfig, { runProcess: fakeRunner({ stdout: passStdout, stderr: "private_key=leak" }) });
    expect(out.ok).toBe(false);
    expect(out.errors).toEqual(["SECRET_MARKER_IN_STDERR"]);
    expect(out.errors.join()).not.toContain("leak");
  });
  it("10b. a clean dry-run run parses to a result", async () => {
    const out = await runAvp2RunnerDryRun(dryConfig, { runProcess: fakeRunner({ stdout: passStdout }) });
    expect(out.ok).toBe(true);
    expect(out.result?.provenance).toBe("LIVE_LOCAL_RUN");
  });
  it("10c. a timeout is surfaced safely", async () => {
    const out = await runAvp2RunnerDryRun(dryConfig, { runProcess: fakeRunner({ timedOut: true, code: null }) });
    expect(out.errors).toContain("RUNNER_TIMED_OUT");
  });

  // ── result-file mode ──
  it("11. result-file mode loads a valid fixture (injected reader)", () => {
    const out = loadAvp2RunnerResultFile("/tmp/avp2-e2e-result.json", { readFile: () => passStdout });
    expect(out.ok).toBe(true);
    expect(out.result?.proof_level).toBe("LOCAL_LIVE");
  });
  it("12. result-file mode rejects an unsafe (production) fixture", () => {
    const bad = JSON.stringify({ ...DEMO_LOCAL_LIVE_RESULT, proof_level: "PRODUCTION_LIVE" });
    expect(loadAvp2RunnerResultFile("/tmp/x.json", { readFile: () => bad }).ok).toBe(false);
  });
  it("12b. result-file refuses protected paths and never reads them", () => {
    let read = false;
    const out = loadAvp2RunnerResultFile("/repo/package.json", { readFile: () => { read = true; return passStdout; } });
    expect(out.errors).toContain("PROTECTED_PATH");
    expect(read).toBe(false);
    expect(unsafeResultPath("/x/.git/config")).toBe("PROTECTED_PATH");
  });
  it("12c. result-file with a marker in the file fails closed", () => {
    expect(loadAvp2RunnerResultFile("/tmp/x.json", { readFile: () => `${passStdout} Bearer abc` }).errors).toContain("SECRET_MARKER_IN_FILE");
  });

  // ── connector bridge functions ──
  it("13. connector dry-run uses the injected runner and maps to an artifact", async () => {
    const out = await invokeAvp2GovernedAccessDryRun({ avpRepoPath: REPO }, { runProcess: fakeRunner({ stdout: passStdout }) });
    expect(out.ok).toBe(true);
    expect(out.artifact?.is_live).toBe(true);
  });
  it("14. connector result-file validates + maps to an artifact", () => {
    const out = consumeAvp2GovernedAccessResultFile("/tmp/avp2-e2e-result.json", { readFile: () => passStdout });
    expect(out.ok).toBe(true);
    expect(out.artifact?.proof_level).toBe("LOCAL_LIVE");
  });
  it("14b. connector result-file refuses an unsafe result", () => {
    const bad = JSON.stringify({ ...DEMO_LOCAL_LIVE_RESULT, otzar_display: { ...DEMO_LOCAL_LIVE_RESULT.otzar_display, message: "proof body leak" } });
    expect(consumeAvp2GovernedAccessResultFile("/tmp/x.json", { readFile: () => bad }).ok).toBe(false);
  });
});
