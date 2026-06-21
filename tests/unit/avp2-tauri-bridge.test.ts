// FILE: tests/unit/avp2-tauri-bridge.test.ts
// PURPOSE: OTZAR-E2E-4 — lock the browser-side Tauri live bridge wrapper: availability
//          detection, operator-confirmation gating, unsafe-path refusal, narrow payload
//          (no arbitrary command/args/output), mocked-invoke success → validated artifact,
//          production-proof refusal, secret-marker refusal, and safe error codes (never raw
//          stderr). All via injected isTauri/invoke — no real Tauri, no real process.
// CONNECTS TO: src/lib/avp2/e2e-tauri-bridge.ts.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isAvp2TauriLiveBridgeAvailable, runAvp2LiveLocalViaTauri, buildNativeLivePayload,
  NATIVE_LIVE_LOCAL_COMMAND_NAME, type InvokeFn,
} from "@/lib/avp2/e2e-tauri-bridge";
import { DEMO_LOCAL_LIVE_RESULT } from "@/lib/connectors/avp2-governed-access";

const REPO = "/Users/x/NIOV Labs/github/niov-avp";
const tauri = { isTauri: (): boolean => true };
const invokeReturning = (val: unknown): InvokeFn => async () => val;
const invokeThrowing = (msg: string): InvokeFn => async () => { throw new Error(msg); };

describe("AVP² Tauri live bridge wrapper", () => {
  it("1. unavailable outside Tauri (web)", () => {
    expect(isAvp2TauriLiveBridgeAvailable({ isTauri: () => false })).toBe(false);
  });
  it("1b. unavailable in Tauri without an invoke fn", () => {
    expect(isAvp2TauriLiveBridgeAvailable({ isTauri: () => true, invoke: null })).toBe(false);
  });
  it("1c. available in Tauri with an invoke fn", () => {
    expect(isAvp2TauriLiveBridgeAvailable({ isTauri: () => true, invoke: invokeReturning(null) })).toBe(true);
  });

  it("2. requires operator confirmation", async () => {
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: REPO, operatorConfirmed: false }, { ...tauri, invoke: invokeReturning(DEMO_LOCAL_LIVE_RESULT) });
    expect(out.ok).toBe(false);
    expect(out.errors).toContain("OPERATOR_NOT_CONFIRMED");
  });
  it("3. rejects an unsafe avpRepoPath (no spawn)", async () => {
    let invoked = false;
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: "/x/$(id)", operatorConfirmed: true }, { ...tauri, invoke: async () => { invoked = true; return DEMO_LOCAL_LIVE_RESULT; } });
    expect(out.ok).toBe(false);
    expect(out.errors).toContain("UNSAFE_AVP_REPO_PATH");
    expect(invoked).toBe(false);
  });
  it("4. builds a narrow payload (no command/args/output/evidence/url/token)", () => {
    const p = buildNativeLivePayload({ avpRepoPath: REPO, operatorConfirmed: true, foundationRepoPath: "/Users/x/niov-foundation", port: 3941 });
    expect(p).toEqual({ avp_repo_path: REPO, operator_confirmed: true, foundation_repo_path: "/Users/x/niov-foundation", port: 3941 });
    expect(Object.keys(p)).not.toContain("command");
    expect(Object.keys(p)).not.toContain("output_path");
  });
  it("5. a successful mocked Tauri response validates + maps to an artifact", async () => {
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: REPO, operatorConfirmed: true }, { ...tauri, invoke: invokeReturning(DEMO_LOCAL_LIVE_RESULT) });
    expect(out.ok).toBe(true);
    expect(out.artifact?.is_live).toBe(true);
    expect(out.resultOutputPath).toBe("/tmp/avp2-e2e-result.json");
    expect(out.evidenceOutputPath).toBe("/tmp/avp-positive-evidence.json");
  });
  it("5b. accepts a { result } wrapper response", async () => {
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: REPO, operatorConfirmed: true }, { ...tauri, invoke: invokeReturning({ result: DEMO_LOCAL_LIVE_RESULT }) });
    expect(out.ok).toBe(true);
  });
  it("5c. accepts a JSON-string response", async () => {
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: REPO, operatorConfirmed: true }, { ...tauri, invoke: invokeReturning(JSON.stringify(DEMO_LOCAL_LIVE_RESULT)) });
    expect(out.ok).toBe(true);
  });
  it("6. a PRODUCTION_LIVE mocked response is rejected", async () => {
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: REPO, operatorConfirmed: true }, { ...tauri, invoke: invokeReturning({ ...DEMO_LOCAL_LIVE_RESULT, proof_level: "PRODUCTION_LIVE" }) });
    expect(out.ok).toBe(false);
    expect(out.errors).toContain("PRODUCTION_PROOF_REFUSED");
  });
  it("7. a response with an access_token marker is rejected", async () => {
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: REPO, operatorConfirmed: true }, { ...tauri, invoke: invokeReturning(`${JSON.stringify(DEMO_LOCAL_LIVE_RESULT)} access_token=x`) });
    expect(out.ok).toBe(false);
    expect(out.errors).toContain("SECRET_MARKER_IN_NATIVE_RESPONSE");
  });
  it("8. an error response surfaces a safe code, never raw stderr", async () => {
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: REPO, operatorConfirmed: true }, { ...tauri, invoke: invokeThrowing("Bearer sk_live_secret boom") });
    expect(out.ok).toBe(false);
    expect(out.errors).toEqual(["NATIVE_INVOCATION_FAILED"]);
    expect(out.errors.join()).not.toContain("sk_live");
  });
  it("8b. an unregistered native command yields NATIVE_COMMAND_NOT_REGISTERED", async () => {
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: REPO, operatorConfirmed: true }, { ...tauri, invoke: invokeThrowing("command run_avp2_e2e_live_local not found") });
    expect(out.errors).toContain("NATIVE_COMMAND_NOT_REGISTERED");
  });
  it("9. no invoke available → bridge unavailable (no fake run)", async () => {
    const out = await runAvp2LiveLocalViaTauri({ avpRepoPath: REPO, operatorConfirmed: true }, { isTauri: () => true, invoke: null });
    expect(out.ok).toBe(false);
    expect(out.available).toBe(false);
    expect(out.errors).toContain("TAURI_BRIDGE_UNAVAILABLE");
  });
  it("10. the native command name is the fixed scoped command", () => {
    expect(NATIVE_LIVE_LOCAL_COMMAND_NAME).toBe("run_avp2_e2e_live_local");
  });
  it("11. docs mention the native command, the Founder-auth blocker, and no browser spawn", () => {
    const doc = readFileSync(resolve(process.cwd(), "docs/avp2-governed-access-connector.md"), "utf8");
    expect(doc).toContain("run_avp2_e2e_live_local");
    expect(doc).toMatch(/Founder authorization/i);
    expect(doc).toContain("RULE 20");
    expect(doc).toMatch(/without a browser spawn|never a fake run|no browser/i);
  });
});
