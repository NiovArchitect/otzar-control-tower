#!/usr/bin/env node
// FILE: scripts/avp2-live-local.mjs
// PURPOSE: OTZAR-E2E-4 — the operator-run Node SIDECAR that executes the fixed niov-avp
//          strict live-local command outside the browser. This is the safe alternative to a
//          native Tauri command (adding native commands that bypass the Foundation API is
//          gated on Founder authorization — RULE 20 / ADR-0052). It is an explicit,
//          operator-invoked CLI: it requires --confirm + an absolute --avp-repo path,
//          builds a FIXED non-shell command (execFile, args array), writes only the fixed
//          /tmp result + evidence files, and prints a sanitized summary (never raw stderr,
//          never tokens). No hosted network, no production, no real payment, no fake proof.
//
// USAGE:
//   node scripts/avp2-live-local.mjs --avp-repo /abs/path/to/niov-avp --confirm \
//     [--foundation-repo /abs/path/to/niov-foundation] [--port 3941] [--intent /abs/path.json] [--dry]
//   (or: npm run avp2:live-local -- --avp-repo /abs/path/to/niov-avp --confirm)
//
// The canonical fixed command mirrors src/lib/avp2/e2e-runner-bridge.ts
// (AVP2_LIVE_LOCAL_COMMAND). Output files (local /tmp only):
//   /tmp/avp2-e2e-result.json   /tmp/avp-positive-evidence.json

import { execFile } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const OUTPUT_PATH = "/tmp/avp2-e2e-result.json";
const EVIDENCE_PATH = "/tmp/avp-positive-evidence.json";
const UNSAFE_PATH = /[;&|`$(){}<>\n\r*?]/;
const MARKERS = ["authorization:", "bearer ", "access_token", "token_hash", "private_key", "sk_live", "sk_test", "wallet_private_key"];

function fail(code) { console.error(`avp2-live-local: ${code}`); process.exit(1); }
function flag(argv, name) {
  const i = argv.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i < 0) return undefined;
  const a = argv[i];
  return a.includes("=") ? a.slice(a.indexOf("=") + 1) : argv[i + 1];
}
function isAbsoluteSafe(p) {
  return typeof p === "string" && p.startsWith("/") && !p.includes("..") && !UNSAFE_PATH.test(p)
    && !MARKERS.some((m) => p.toLowerCase().includes(m));
}
function isSafePort(n) { return Number.isInteger(n) && n >= 1024 && n <= 65535; }

const argv = process.argv.slice(2);
const confirmed = argv.includes("--confirm");
const dry = argv.includes("--dry");
const avpRepo = flag(argv, "--avp-repo");
const foundationRepo = flag(argv, "--foundation-repo");
const intentPath = flag(argv, "--intent");
const portRaw = flag(argv, "--port");
const port = portRaw === undefined ? undefined : Number.parseInt(portRaw, 10);

if (!isAbsoluteSafe(avpRepo)) fail("UNSAFE_OR_MISSING_AVP_REPO_PATH (use an absolute path)");
if (foundationRepo !== undefined && !isAbsoluteSafe(foundationRepo)) fail("UNSAFE_FOUNDATION_REPO_PATH");
if (intentPath !== undefined && !isAbsoluteSafe(intentPath)) fail("UNSAFE_INTENT_PATH");
if (port !== undefined && !isSafePort(port)) fail("UNSAFE_PORT");

// FIXED args — never an arbitrary shell string.
const args = [
  "run", "e2e:otzar-avp2", "--",
  "--strict", "--json",
  "--output", OUTPUT_PATH, "--force",
  "--evidence-output", EVIDENCE_PATH, "--force",
];
if (intentPath !== undefined) args.push("--intent", intentPath);
if (foundationRepo !== undefined) args.push("--foundation-repo", foundationRepo);
if (port !== undefined) args.push("--port", String(port));

const preview = `npm ${args.join(" ")}  (cwd: ${avpRepo})`;
console.log(`Fixed command:\n  ${preview}`);
console.log(`Outputs (local /tmp only): ${OUTPUT_PATH} , ${EVIDENCE_PATH}`);

if (dry) { console.log("Dry preview only (--dry). Not executed."); process.exit(0); }
if (!confirmed) fail("OPERATOR_NOT_CONFIRMED (pass --confirm to run; this boots a local Foundation and writes /tmp files)");

console.log("Running strict local live proof (this boots a local Foundation; may take minutes)…");
execFile("npm", args, { cwd: avpRepo, timeout: 600_000, maxBuffer: 8 * 1024 * 1024, windowsHide: true }, (err, _stdout, _stderr) => {
  // Never print raw stdout/stderr — read the sanitized /tmp result instead.
  if (!existsSync(OUTPUT_PATH)) fail(`NO_RESULT_FILE (runner exit ${err && typeof err.code === "number" ? err.code : "?"})`);
  let parsed;
  try { parsed = JSON.parse(readFileSync(OUTPUT_PATH, "utf8")); } catch { fail("RESULT_FILE_NOT_JSON"); }
  if (parsed.result_schema !== "AVP2_END_TO_END_RESULT") fail("RESULT_WRONG_SCHEMA");
  if (parsed.proof_level === "PRODUCTION_LIVE") fail("PRODUCTION_PROOF_REFUSED");
  console.log("\nResult (sanitized):");
  console.log(`  status:      ${parsed.status}`);
  console.log(`  provenance:  ${parsed.provenance}`);
  console.log(`  proof_level: ${parsed.proof_level}`);
  console.log(`\nLoad ${EVIDENCE_PATH} into Federation Cloud /avp2/load to view the proof.`);
  process.exit(parsed.status === "FAIL" ? 1 : 0);
});
