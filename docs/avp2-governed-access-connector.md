# AVP² Governed Access Connector (Otzar)

OTZAR-E2E-1 makes Otzar participate in the vertical AVP² / Foundation / Federation Cloud
loop. Otzar **creates** a governed-access intent and **displays** a result — it performs no
external writes, calls no hosted network, uses no real payment, and claims live proof only
when a result's provenance is `LIVE_LOCAL_RUN`.

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

### What remains for OTZAR-E2E-4

Wire a **secure Tauri command / local sidecar** that, on an explicit operator action,
provides `nodeProcessRunner` to `invokeAvp2GovernedAccessLiveLocal` and streams the result
status back to Otzar. Explicit, local-only, no hosted, no production, no secrets, no fake proof.

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
