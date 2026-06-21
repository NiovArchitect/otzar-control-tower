# AVP² Governed Access Connector (Otzar — OPTIONAL CLIENT DEMO)

> **Otzar is an OPTIONAL client of AVP², not part of the protocol.** The canonical
> machine-economy stack is **Foundation → AVP² Gateway/protocol → governed quote/accept/
> access/proof → evidence pack → Federation Cloud** (registry/evidence/control surface). That
> loop runs and is proven **without Otzar**. This connector is one example client that can
> *request* governed access and *display* a result; nothing in the protocol depends on it.
> See the canonical contract in `niov-federation-cloud/docs/avp2-canonical-integration.md`.

OTZAR-E2E-1 makes Otzar (one optional client) participate in the vertical AVP² / Foundation /
Federation Cloud loop. Otzar **creates** a governed-access intent and **displays** a result —
it performs no external writes, calls no hosted network, uses no real payment, and claims live
proof only when a result's provenance is `LIVE_LOCAL_RUN`.

> **AVP² = Agent Verification & Payment Protocol.**
>
> The agent does not scrape the website.
> The agent asks for a quote.
>
> For actions:
> The agent does not execute freely.
> The agent asks for a governed quote to call a bounded action.
>
> Foundation is the trust substrate.
> Publisher Gateway is the AVP² edge adapter.
> Foundation remains the source of governance truth in live mode.
>
> Otzar is the user/work interface.
> Federation Cloud is the governed machine-economy control surface.

## Roles

- **Otzar** (this repo) — user/work interface. Builds the `AVP2_END_TO_END_INTENT`,
  validates it, and renders the `AVP2_END_TO_END_RESULT` as a read-only work artifact/card.
- **niov-avp** — the executable AVP² runner (`npm run e2e:otzar-avp2`). Accepts the intent,
  runs the local live path when available, and emits the result + evidence.
- **Foundation** — trust substrate: identity, policy, access, proof, audit.
- **Federation Cloud** — evidence/registry/control surface (`/avp2/e2e`, `/avp2/evidence`,
  `/avp2/evidence/timeline`, `/avp2/registry`).

## Files

| File | Role |
| --- | --- |
| `src/lib/avp2/e2e-contracts.ts` | Intent/result types, `createAvp2GovernedAccessIntent`, `validateAvp2EndToEndIntent`, `validateAvp2EndToEndResult` |
| `src/lib/avp2/e2e-display.ts` | `mapAvp2ResultToOtzarArtifact` |
| `src/lib/connectors/avp2-governed-access.ts` | Connector stub: `buildAvp2GovernedAccessRequest`, `buildAvp2GovernedAccessDryRun`, `parseAvp2RunnerResult`, `mapAvp2RunnerResultToWorkArtifact`, demo result constants |
| `src/components/otzar/Avp2GovernedAccessCard.tsx` | Read-only "AVP² governed access" status card (mounted in `MarketplaceDiscovery`) |
| `src/fixtures/avp2-e2e-intent.demo.json` · `…result.local-live.example.json` · `…result.dry-run.example.json` | Safe fixtures (no secrets, no raw content) |

## Intent schema — `AVP2_END_TO_END_INTENT`

```json
{
  "intent_schema": "AVP2_END_TO_END_INTENT",
  "intent_schema_version": "0.1",
  "origin": "otzar",
  "intent_type": "REQUEST_GOVERNED_ACCESS",
  "requested_resource": { "gateway_id": "demo-publisher-gateway", "resource_id": "demo-content-fragment", "resource_type": "CONTENT_FRAGMENT", "selector": "paragraph_range:12-15" },
  "governance": { "foundation_backed": true, "quote_required": true, "proof_required": true, "real_payment": false, "public_listing": false, "production_data": false, "private_user_data": false }
}
```

`validateAvp2EndToEndIntent` requires foundation-backed + quote + proof and rejects
`real_payment` / `public_listing` / `production_data` / `private_user_data` true and any
secret marker.

## Result schema — `AVP2_END_TO_END_RESULT`

Matches the niov-avp runner and Federation Cloud `/avp2/e2e`. `validateAvp2EndToEndResult`
**refuses**: `proof_level` `PRODUCTION_LIVE`, any `production_live_pass` / `public_certification`
/ `real_payment` / `public_listing` / `production_data` / `private_user_data` set to `true`,
a `security.secrets_redacted: false`, unknown provenance, and secret markers
(`access_token`, `token_hash`, `private_key`, `Authorization`, `Bearer …`, raw content/proof
body, …). Results are **never trusted** — re-validated every time.

`mapAvp2ResultToOtzarArtifact` produces the card model: title, status, proof level,
provenance, the step checklist, `delivered` (false is correct once proof resolved — a proof
reference, not the content body), next action, and the Federation Cloud routes. `is_live` is
true **only** for a `LIVE_LOCAL_RUN` PASS.

## Dry-run vs live-local

- **Dry-run (default):** `buildAvp2GovernedAccessDryRun()` returns a descriptor with the
  command `npm run e2e:otzar-avp2 -- --dry-run --json`. It validates the intent and shows
  the intended sequence; it is **not live proof**.
- **Live-local (explicit, future):** `buildAvp2GovernedAccessRequest(input, { mode: "live-local" })`
  carries `npm run e2e:otzar-avp2 -- --strict --json`. **This phase never invokes it.**

## How the connector avoids external writes

The connector **builds descriptors and parses/maps results only** — it spawns no process,
opens no socket, and writes nothing externally. There are no send/execute controls in the
card. The actual local runner invocation is deferred to **OTZAR-E2E-2** (a safe local
bridge that runs `--dry-run --json` or consumes a provided result file).

## Local runner bridge (OTZAR-E2E-2)

`src/lib/avp2/e2e-runner-bridge.ts` is a **pure, dependency-injected** bridge that runs the
niov-avp runner in **dry-run** mode or consumes a result file it already wrote. It imports
**no** node built-ins, so it never leaks `child_process`/`fs` into the browser bundle; the
real node implementations live in `src/lib/avp2/e2e-runner-node.ts` (`nodeProcessRunner`,
`nodeFileReader`) and are imported only by a Node/Tauri sidecar or a CLI — never by React.

### Dry-run command

The bridge builds a **fixed** command — never an arbitrary shell string:

```
npm run e2e:otzar-avp2 -- --dry-run --json     # cwd = <avpRepoPath>
```

`buildAvp2RunnerCommand` returns `{ command: "npm", args: [...fixed], cwd }` for execution
with `execFile` (no shell). `runAvp2RunnerDryRun(config, { runProcess })` runs it via the
injected runner and parses stdout through `parseAvp2RunnerStdout`
(`validateAvp2EndToEndResult` + marker scan).

### Result-file mode

`loadAvp2RunnerResultFile(path, { readFile })` / `consumeAvp2GovernedAccessResultFile` read a
result file niov-avp wrote (e.g. `/tmp/avp2-e2e-result.json`), **read-only**: never deletes
or modifies it, refuses protected paths (`.git/`, `package.json`, `package-lock.json`,
`.env`, `.ssh/`) and unsafe paths, then parses + re-validates it.

### Why live-local invocation is not default

Live-local (`--strict`) is **refused** by this bridge (`LIVE_LOCAL_NOT_ALLOWED`). A real
local Foundation run is operator-gated and deferred to **OTZAR-E2E-3** (a secure local
bridge). The card shows "Runner bridge ready: dry-run command available" and that live-local
needs an explicit operator bridge.

### Safety rules

- Dry-run only; fixed command + args; no arbitrary command/shell string.
- `execFile` (no shell), fixed `cwd`, hard timeout, bounded buffer.
- Config guarded against shell metacharacters / secret markers in repo/intent/result paths.
- Marker scan over stdout **and** stderr; raw stderr is **never** echoed (a token in stderr
  fails closed with a code only).
- Result-file consumption is read-only and refuses protected/unsafe paths.
- **No external writes, no hosted network, no production, no real payment, no secrets.**

### How this connects to niov-avp

The bridge targets niov-avp's `npm run e2e:otzar-avp2` (`apps/publisher-gateway/src/avp2-e2e-runner.ts`).
Otzar later invokes it through a **secure local bridge** (Tauri sidecar / CLI providing
`nodeProcessRunner`); the browser never spawns a process directly.

## Secure local live runner invocation (OTZAR-E2E-3)

Dry-run remains the **default**. Live-local is **operator-gated** and never runs from the
browser. `validateAvp2RunnerLiveLocalConfig` requires **all** of: `mode: "live-local"`,
`allowLiveLocal: true`, `operatorConfirmed: true`, `outputPath`/`evidenceOutputPath` under
`/tmp`, a safe absolute `avpRepoPath`, and safe optional `intentPath` / `foundationRepoPath`
/ `port` (no shell metacharacters, no traversal, no secret markers).

### Exact strict command

`buildAvp2RunnerLiveLocalCommand` produces a **fixed**, non-shell command:

```
npm run e2e:otzar-avp2 -- --strict --json --output /tmp/avp2-e2e-result.json --force --evidence-output /tmp/avp-positive-evidence.json --force
```

(optional, validated: `--intent <path>`, `--foundation-repo <path>`, `--port <number>`). Run
with `execFile` (no shell), fixed cwd, hard timeout, bounded buffer.

### Output files (local /tmp only)

- Result: `/tmp/avp2-e2e-result.json`
- Evidence: `/tmp/avp-positive-evidence.json`

`runAvp2RunnerLiveLocal` prefers the JSON result on **stdout**; if stdout is not parseable
JSON and a file reader is injected, it falls back to reading the **outputPath** (read-only,
validated). The evidence path is returned as **metadata only** — Otzar does not upload it.

### Why the browser still does not spawn directly

React/browser cannot safely spawn a local Node process. The bridge is pure + dependency-
injected (no node imports); the real `nodeProcessRunner` (`execFile`) lives in
`e2e-runner-node.ts` and is invoked only by a **Node/Tauri sidecar or CLI** — never the
browser. The Tauri shell currently has `tauri_plugin_shell` initialized but **no custom
command handler**, so native execution is intentionally not wired here.

### How Otzar validates the result before display

`runAvp2RunnerLiveLocal` → `parseAvp2RunnerStdout` / `loadAvp2RunnerResultFile` →
`validateAvp2EndToEndResult` (refuses `PRODUCTION_LIVE`, real payment, public listing,
production/private data, unredacted secrets, and token/raw markers) → `mapAvp2ResultToOtzarArtifact`.
stderr is marker-scanned but **never echoed**.

### How Federation Cloud consumes the outputs

Load `/tmp/avp-positive-evidence.json` into Federation Cloud at `/avp2/load` (classified +
re-verified) → it appears at `/avp2/evidence`, `/avp2/evidence/timeline`, and feeds `/avp2`
and `/avp2/e2e`. The result mirrors what `/avp2/e2e` derives.

## Secure Tauri / local command bridge (OTZAR-E2E-4)

This phase adds the **operator-gated invocation path** for the strict live-local proof,
**without** a browser spawn and **without** an unauthorized native command.

### Native Tauri command — deferred (exact blocker)

A native `run_avp2_e2e_live_local` Tauri command was **not** added. The repo's Rust shell
(`src-tauri/src/lib.rs`, `main.rs`) documents a hard governance rule:

> Adding native commands here is gated on **Founder authorization** per **RULE 20** (RULES +
> ADRs only the Founder may modify). "We deliberately do NOT add native commands that bypass
> the Foundation API." (**ADR-0052 / FOUNDER-AUTH**.)

A command that execs a local process bypasses the Foundation API, so registering it requires
explicit Founder authorization. Until then the native command stays unregistered.

### Frontend Tauri wrapper (`e2e-tauri-bridge.ts`)

`isAvp2TauriLiveBridgeAvailable()` is true only inside a Tauri webview with an `invoke`
function present. `runAvp2LiveLocalViaTauri(config, deps?)` gates on `operatorConfirmed`, runs
the same path-safety validation as the live-local config, builds a **narrow** payload
(`avp_repo_path`, `operator_confirmed`, optional `foundation_repo_path`/`intent_path`/`port`
— **no** command/args/output/evidence/url/token), invokes `run_avp2_e2e_live_local`,
marker-scans the response, validates it (`PRODUCTION_LIVE` refused), and maps it to an Otzar
artifact. It imports **no** `@tauri-apps/api` package (not a dependency) — it resolves
`invoke` from the global or an injected one (for tests). With no invoke / unregistered command
it returns `TAURI_BRIDGE_UNAVAILABLE` / `NATIVE_COMMAND_NOT_REGISTERED` — never a fake run.

### Operator Node sidecar (`scripts/avp2-live-local.mjs`)

The safe, available-today execution path outside the browser:

```
npm run avp2:live-local -- --avp-repo /abs/path/to/niov-avp --confirm
#   optional: --foundation-repo <abs> --port <1024-65535> --intent <abs> --dry
```

It requires `--confirm` + an absolute `--avp-repo`, validates paths (no shell metachars /
traversal / markers), builds the **fixed** non-shell command (`execFile`, args array), writes
only the fixed `/tmp` result + evidence files, and prints a **sanitized** summary (status /
provenance / proof_level read back from the result file) — never raw stdout/stderr, never
tokens, `PRODUCTION_LIVE` refused.

### UI (guarded, Tauri-only)

`Avp2GovernedAccessCard` shows a "Run local live proof" section: in web it shows
"requires the Otzar desktop / Tauri shell … native command pending Founder authorization"
and **no button**; in Tauri it shows a repo-path input, a required confirmation checkbox, and
a button (disabled until confirmed) that runs via the wrapper. Success shows the validated
artifact + "Load `/tmp/avp-positive-evidence.json` into Federation Cloud `/avp2/load`";
failure shows **safe error codes only** (no raw stderr, no tokens). No auto-run.

### How a future authorized command would wire it

Once Founder-authorized, a tightly-scoped `#[tauri::command] run_avp2_e2e_live_local` (or a
`tauri-plugin-shell` allowlist) would validate the narrow payload in Rust, construct the same
fixed args, `std::process::Command` (no shell) in `avp_repo_path`, and return the sanitized
result — the frontend wrapper already targets it by name.

### What remains for OTZAR-E2E-5

Run the bridge/sidecar against the **real** niov-avp runner locally and confirm Otzar
receives/displays a `LIVE_LOCAL_RUN` PASS while Federation Cloud consumes the evidence file.

## Desktop result import and evidence handoff (OTZAR-E2E-6)

After the operator sidecar runs, niov-avp writes two local files:

- Result: `/tmp/avp2-e2e-result.json` (`AVP2_END_TO_END_RESULT`)
- Evidence: `/tmp/avp-positive-evidence.json` (`AVP_POSITIVE_EVIDENCE_PACK`)

`src/lib/avp2/e2e-handoff.ts` + the read-only `Avp2EvidenceHandoffPanel` give the operator a
UX to use them **without** the terminal. Because the browser cannot read `/tmp` directly, the
operator **pastes** the result JSON; Otzar validates it (`validateAvp2ResultFileText` →
`validateAvp2EndToEndResult`) and `buildAvp2HandoffSummary` renders:

- proof **status** + **proof level**, with live proof shown only for a `PASS` +
  `LIVE_LOCAL_RUN` + `LOCAL_LIVE`/`HOSTED_STAGING_LIVE` result;
- the **checklist** — discovered, quote, accept, access receipt, proof;
- the **delivered=false** note: *"Delivered false is acceptable when proof resolved. Raw
  content was not delivered; the governed proof reference was."*;
- the **evidence file path** and the operator next action:
  *"Load `/tmp/avp-positive-evidence.json` into Federation Cloud `/avp2/load`."*;
- the Federation Cloud routes: `/avp2/load`, `/avp2/evidence`, `/avp2/evidence/timeline`,
  `/avp2/e2e`.

### Safety

- No upload, no network, no persistence — Otzar never sends the result/evidence anywhere; the
  operator loads the evidence into Federation Cloud via `/avp2/load` themselves.
- **No production proof** (`PRODUCTION_LIVE` refused), no real payment, no public listing, no
  secrets — a pasted result carrying a token / raw content body / proof body, or production /
  payment / listing claims, is refused with safe codes (never echoed back).
- No native command registration (still pending Founder authorization), no browser shell
  execution. The result/evidence are local operator artifacts.

## What is real now

- Otzar can build + validate a safe `AVP2_END_TO_END_INTENT`.
- Otzar can parse + re-validate an `AVP2_END_TO_END_RESULT` and refuse unsafe ones.
- Otzar renders a read-only governed-access card (mounted in Marketplace) from the safe
  local-live demo result, with Federation Cloud deep-link routes.

## What remains

- **OTZAR-E2E-2:** wire a safe local bridge to invoke `npm run e2e:otzar-avp2 -- --dry-run
  --json` (or load a result file the niov-avp runner wrote), then feed it through
  `parseAvp2RunnerResult` → `mapAvp2RunnerResultToWorkArtifact` → the card. No hosted
  network, no real payment, no fake proof.
