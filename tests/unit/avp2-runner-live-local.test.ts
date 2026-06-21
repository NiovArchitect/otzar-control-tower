// FILE: tests/unit/avp2-runner-live-local.test.ts
// PURPOSE: OTZAR-E2E-3 — lock the operator-gated live-local bridge: strict gating
//          (allowLiveLocal + operatorConfirmed + /tmp outputs + safe paths), the fixed
//          --strict command, stdout-or-output-file result resolution, marker fail-closed,
//          production-proof refusal, and the connector live-local function — all via
//          INJECTED process runner / file reader (no real niov-avp invocation).
// CONNECTS TO: src/lib/avp2/e2e-runner-bridge.ts, src/lib/connectors/avp2-governed-access.ts.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAvp2RunnerLiveLocalCommand, validateAvp2RunnerLiveLocalConfig, runAvp2RunnerLiveLocal,
  AVP2_LIVE_LOCAL_COMMAND, LIVE_LOCAL_OUTPUT_PATH, LIVE_LOCAL_EVIDENCE_PATH,
  type LiveLocalConfig, type ProcessOutput,
} from "@/lib/avp2/e2e-runner-bridge";
import { invokeAvp2GovernedAccessLiveLocal, DEMO_LOCAL_LIVE_RESULT } from "@/lib/connectors/avp2-governed-access";

const REPO = "/Users/x/NIOV Labs/github/niov-avp";
const passStdout = JSON.stringify(DEMO_LOCAL_LIVE_RESULT);
const fullConfig: LiveLocalConfig = {
  avpRepoPath: REPO, mode: "live-local", allowLiveLocal: true, operatorConfirmed: true,
  outputPath: LIVE_LOCAL_OUTPUT_PATH, evidenceOutputPath: LIVE_LOCAL_EVIDENCE_PATH,
};
const fakeRunner = (out: Partial<ProcessOutput>) => async (): Promise<ProcessOutput> => ({ code: 0, stdout: "", stderr: "", ...out });

describe("AVP² operator-gated live-local bridge", () => {
  // ── command ──
  it("1. builds the live-local command with fixed command/args", () => {
    const cmd = buildAvp2RunnerLiveLocalCommand(fullConfig);
    expect(cmd.command).toBe("npm");
    expect(cmd.args[0]).toBe("run");
    expect(cmd.args[1]).toBe("e2e:otzar-avp2");
    expect(cmd.cwd).toBe(REPO);
  });
  it("2. command includes --strict and --json", () => {
    const a = buildAvp2RunnerLiveLocalCommand(fullConfig).args;
    expect(a).toContain("--strict");
    expect(a).toContain("--json");
  });
  it("3. command includes --output <path> --force and --evidence-output <path> --force", () => {
    const a = buildAvp2RunnerLiveLocalCommand(fullConfig).args.join(" ");
    expect(a).toContain(`--output ${LIVE_LOCAL_OUTPUT_PATH} --force`);
    expect(a).toContain(`--evidence-output ${LIVE_LOCAL_EVIDENCE_PATH} --force`);
    expect(AVP2_LIVE_LOCAL_COMMAND).toContain("--strict --json --output /tmp/avp2-e2e-result.json --force --evidence-output /tmp/avp-positive-evidence.json --force");
  });
  it("4. optional intent / foundation-repo / port are appended safely", () => {
    const a = buildAvp2RunnerLiveLocalCommand({ ...fullConfig, intentPath: "/tmp/intent.json", foundationRepoPath: "/Users/x/niov-foundation", port: 3941 }).args;
    expect(a).toContain("--intent"); expect(a).toContain("/tmp/intent.json");
    expect(a).toContain("--foundation-repo"); expect(a).toContain("/Users/x/niov-foundation");
    expect(a).toContain("--port"); expect(a).toContain("3941");
  });

  // ── gating ──
  it("5. rejected without allowLiveLocal true", () => {
    expect(validateAvp2RunnerLiveLocalConfig({ ...fullConfig, allowLiveLocal: false as unknown as true }).errors).toContain("LIVE_LOCAL_NOT_ALLOWED");
  });
  it("6. rejected without operatorConfirmed true", () => {
    expect(validateAvp2RunnerLiveLocalConfig({ ...fullConfig, operatorConfirmed: false as unknown as true }).errors).toContain("OPERATOR_NOT_CONFIRMED");
  });
  it("7. rejected if outputPath not under /tmp", () => {
    expect(validateAvp2RunnerLiveLocalConfig({ ...fullConfig, outputPath: "/var/avp2-e2e-result.json" }).errors).toContain("OUTPUT_PATH_NOT_UNDER_TMP");
  });
  it("8. rejected if evidenceOutputPath not under /tmp", () => {
    expect(validateAvp2RunnerLiveLocalConfig({ ...fullConfig, evidenceOutputPath: "/home/evil.json" }).errors).toContain("EVIDENCE_PATH_NOT_UNDER_TMP");
  });
  it("9. rejects shell metacharacters in a path", () => {
    expect(validateAvp2RunnerLiveLocalConfig({ ...fullConfig, outputPath: "/tmp/x;rm -rf .json" }).errors).toContain("OUTPUT_PATH_NOT_UNDER_TMP");
    expect(validateAvp2RunnerLiveLocalConfig({ ...fullConfig, avpRepoPath: "/x/$(id)" }).errors).toContain("UNSAFE_AVP_REPO_PATH");
  });
  it("10. rejects secret markers / traversal in a path", () => {
    expect(validateAvp2RunnerLiveLocalConfig({ ...fullConfig, outputPath: "/tmp/../etc/x.json" }).errors).toContain("OUTPUT_PATH_NOT_UNDER_TMP");
    expect(validateAvp2RunnerLiveLocalConfig({ ...fullConfig, intentPath: "/tmp/access_token.json" }).errors).toContain("UNSAFE_INTENT_PATH");
  });
  it("11. rejects an unsafe port", () => {
    expect(validateAvp2RunnerLiveLocalConfig({ ...fullConfig, port: 70000 }).errors).toContain("UNSAFE_PORT");
  });
  it("11b. a fully gated config validates", () => expect(validateAvp2RunnerLiveLocalConfig(fullConfig).ok).toBe(true));
  it("11c. buildCommand throws on an ungated config", () => {
    expect(() => buildAvp2RunnerLiveLocalCommand({ ...fullConfig, operatorConfirmed: false as unknown as true })).toThrow();
  });

  // ── run (injected) ──
  it("12. run live-local with injected fake process returns a PASS artifact path", async () => {
    const out = await runAvp2RunnerLiveLocal(fullConfig, { runProcess: fakeRunner({ stdout: passStdout }) });
    expect(out.ok).toBe(true);
    expect(out.result?.status).toBe("PASS");
    expect(out.resultOutputPath).toBe(LIVE_LOCAL_OUTPUT_PATH);
    expect(out.evidenceOutputPath).toBe(LIVE_LOCAL_EVIDENCE_PATH);
  });
  it("13. reads the output file when stdout is not full JSON", async () => {
    const out = await runAvp2RunnerLiveLocal(fullConfig, { runProcess: fakeRunner({ stdout: "...progress text..." }), readFile: () => passStdout });
    expect(out.ok).toBe(true);
    expect(out.warnings).toContain("STDOUT_NOT_JSON_FELL_BACK_TO_OUTPUT_FILE");
    expect(out.result?.proof_level).toBe("LOCAL_LIVE");
  });
  it("14. fails closed on a stderr secret marker (never echoed)", async () => {
    const out = await runAvp2RunnerLiveLocal(fullConfig, { runProcess: fakeRunner({ stdout: passStdout, stderr: "Bearer sk_live_x" }) });
    expect(out.ok).toBe(false);
    expect(out.errors).toEqual(["SECRET_MARKER_IN_STDERR"]);
    expect(out.errors.join()).not.toContain("sk_live");
  });
  it("15. fails closed on a stdout secret marker", async () => {
    const out = await runAvp2RunnerLiveLocal(fullConfig, { runProcess: fakeRunner({ stdout: `${passStdout} token_hash=x` }) });
    expect(out.ok).toBe(false);
    expect(out.errors).toContain("SECRET_MARKER_IN_STDOUT");
  });
  it("16. fails closed on an invalid result file fallback", async () => {
    const out = await runAvp2RunnerLiveLocal(fullConfig, { runProcess: fakeRunner({ stdout: "progress" }), readFile: () => "{not json" });
    expect(out.ok).toBe(false);
  });
  it("17. an ungated run returns the gate errors (no spawn)", async () => {
    let spawned = false;
    const out = await runAvp2RunnerLiveLocal({ ...fullConfig, allowLiveLocal: false as unknown as true }, { runProcess: async () => { spawned = true; return { code: 0, stdout: passStdout, stderr: "" }; } });
    expect(out.ok).toBe(false);
    expect(spawned).toBe(false);
    expect(out.errors).toContain("LIVE_LOCAL_NOT_ALLOWED");
  });

  // ── connector + no production overclaim ──
  it("18. connector live-local maps a PASS result to an Otzar artifact", async () => {
    const out = await invokeAvp2GovernedAccessLiveLocal({ avpRepoPath: REPO, allowLiveLocal: true, operatorConfirmed: true }, { runProcess: fakeRunner({ stdout: passStdout }) });
    expect(out.ok).toBe(true);
    expect(out.artifact?.is_live).toBe(true);
    expect(out.resultOutputPath).toBe(LIVE_LOCAL_OUTPUT_PATH);
    expect(out.evidenceOutputPath).toBe(LIVE_LOCAL_EVIDENCE_PATH);
  });
  it("19. live-local cannot claim production proof", async () => {
    const prod = JSON.stringify({ ...DEMO_LOCAL_LIVE_RESULT, proof_level: "PRODUCTION_LIVE" });
    const out = await runAvp2RunnerLiveLocal(fullConfig, { runProcess: fakeRunner({ stdout: prod }) });
    expect(out.ok).toBe(false);
    expect(out.errors).toContain("PRODUCTION_PROOF_REFUSED");
  });

  it("20. docs mention the exact strict command, no browser spawn, and doctrine", () => {
    const doc = readFileSync(resolve(process.cwd(), "docs/avp2-governed-access-connector.md"), "utf8");
    expect(doc).toContain("npm run e2e:otzar-avp2 -- --strict --json --output /tmp/avp2-e2e-result.json --force --evidence-output /tmp/avp-positive-evidence.json --force");
    expect(doc).toMatch(/browser still does not spawn directly/i);
    expect(doc).toContain("Foundation is the trust substrate.");
    expect(doc).toContain("Foundation remains the source of governance truth in live mode.");
  });
});
