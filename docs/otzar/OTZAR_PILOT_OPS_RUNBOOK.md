# Otzar Pilot Ops Runbook — the binding rail

**Status:** 2026-07-04 (Fable 5), authored in P0-OPS. This document is
BINDING for pilot operations: deploys, migrations, smokes, residue, rollback,
and secrets. When practice and this document disagree, one of them is wrong —
fix the divergence, never ignore it.
**Companion:** `OTZAR_ORG_READY_PILOT_READINESS_AUDIT.md` (P0 list),
FND `docs/operations/rollback-runbook.md`, FND ADR-0025 (schema-push
discipline).

---

## 1. Deploy rail (BINDING)

**One rail: manual verified deploys. autoDeploy is OFF on both Render
services** (set via API in P0-OPS and mirrored in both `render.yaml`s) — a
push to `main` deploys NOTHING by itself. This is deliberate: Render cannot
gate on GitHub CI, so auto-deploy could ship a red build; the audit's P0-3.

**FND (`otzar-api`, srv-d8t17sm7r5hc73ed5h6g):**
1. Work lands on a branch → PR → **all 5 CI checks green** (typecheck, unit,
   integration, Elixir, Python). Main is protected; no direct pushes.
2. Squash-merge → pull main → note the short SHA.
3. If the change needs schema: the migration MUST already be applied and
   verified on prod (Section 2) BEFORE this deploy.
4. `POST /v1/services/<id>/deploys {"commitId":"<sha>"}` with the Render API
   key.
5. Poll `GET /deploys?limit=1` until `live <sha>`. `update_in_progress` and
   `queued` are normal; `failed` = stop, diagnose, do not retry blindly.
6. Behavioral probe: hit the touched endpoint(s) or run the relevant live
   smoke (Section 4).

**CT (`otzar-app`, srv-d8t1qpj7uimc73db2il0):**
1. CT CI (`verify`: typecheck → lint → test → build) must be green on the
   commit. CT main allows direct pushes — the six local gates
   (typecheck 0 / lint 0 / tests / build / dev / install) are the
   pre-push bar; CI is the record.
2. Same API deploy with commitId → poll `live <sha>`.
3. Verify the LIVE BUNDLE HASH changed: `curl -s https://app.otzar.ai/ |
   grep -o 'index-[A-Za-z0-9_-]*\.js'` — a deploy that doesn't change the
   hash when src changed means Render built the wrong commit.
4. Run the relevant live smoke.

**Never claim CI-gated deploys.** Render deploys are gated by THIS rail
(human runs the API call only after green), not by GitHub. The GitHub
Actions "deploy-production/staging" workflows in FND are Azure/AWS echo
stubs — they are NOT the deploy path; do not be confused by them.

**Stale watcher rule:** every CI/deploy watcher runs in the background with
a hard timeout and is killed (`TaskStop`) the moment its question is
answered or its parse is doubted. A watcher may REPORT; it may merge only
when its success-parse is tab-anchored exact (the PR #552 watcher's loose
awk parse is the cautionary example). Never leave a watcher running across
slices; never trust a watcher that reports `None`.

## 2. Migration rail (BINDING — the P2022 rule)

**Code that reads a column/table may not deploy before the column/table
exists in prod.** The prior P0 outage (silently no-op migration job → code
deployed → P2022 → auth down) is the standing lesson.

For every additive schema change, in order, ALL BEFORE MERGING the code
that depends on it:
1. **Fail-capable canary:** submit a Render job that must fail
   (`sh -c exit 1`-equivalent). If the canary reports `succeeded`, the job
   rail is lying — STOP. (This catches silently-no-op job submission.)
2. **Idempotent DDL job:** base64-encoded node script over
   `prisma.$executeRawUnsafe` with `IF NOT EXISTS` / `duplicate_object`
   guards; runs with the service's own env. Poll to `succeeded`.
3. **Independent verify job:** a SECOND job that SELECTs
   information_schema/pg_indexes, prints what it finds, and **exits
   non-zero if anything is missing**. Poll to `succeeded`.
4. Merge + deploy the code (Section 1).
5. Behavioral app probe on the new path.

Local `prisma db push` targets ONLY the test DB via the guarded scripts
(ADR-0025); the pre-commit hook enforces this. Destructive schema changes
require Founder authorization + the rollback runbook's restore posture —
none have been needed; keep it that way.

## 3. Smoke tenancy + residue policy

**Target state:** a dedicated smoke org so pilot data and smoke traffic
never share a tenant. **Current state (honest):** creating an org requires
`can_admin_niov` + dual control — a two-person NIOV operation the operator
account cannot perform (verified: login clamps to
`read/write/admin_org`). **Founder action required:** run Phase 0 for
`NIOV Smoke Org` (see checklist below). Until it exists, the interim rules
are binding:

- Mutating smokes run ONLY with per-run dynamic identities
  (`pilot-smoke+<runid>@…`, `__niov_test__` prefixes) and MUST end with
  their canonical cleanup rail (reject / archive / suspend / CANCELLED).
- Every live-smoke closeout states plainly: did it mutate, and how was it
  cleaned. Read-only smokes state "reads only; counts byte-identical".
- No smoke may create irreversible state (corrections, permanent memory)
  against the demo org.
- **Residue sweep cadence:** before any pilot user arrives, and after any
  smoke failure mid-run, run the sweep in Section 5.

**Smoke-org creation checklist (founder, once):** Phase 0 create
(`company_name: NIOV Smoke Org`) → first admin `smoke-admin@niovlabs.com` →
baseline OrgSettings (approval ON, audit ON, ceiling APPROVAL_REQUIRED) →
set `OTZAR_SMOKE_ADMIN_EMAIL`/`OTZAR_SMOKE_*` env for the live configs →
migrate the mutating specs' logins to the smoke org → the demo org then
accepts READ-ONLY smokes only.

## 4. Smoke gates (the pilot battery)

Run after every deploy that touches the area; ALL before any pilot
milestone. One command each (`npm run …` from CT):

| Gate | Spec(s) | Mutates? |
|---|---|---|
| Onboarding activation | `test:e2e:live:onboard` (`otzar-live-onboard-activation.spec.ts`) | YES — dynamic invitee, suspended in cleanup |
| External identity battery | `test:e2e:live:external` (context + promotion + chooser + team-external) | No — read-only, seed counts byte-checked |
| Clarity ambient | `otzar-live-ambient-clarity.spec.ts` + `otzar-live-clarity.spec.ts` | No |
| AI Teammates truth | `otzar-live-twin-authority.spec.ts` | No |
| Assignment/readiness | `otzar-live-assign-from-people.spec.ts` / `assign-workspace` | YES — reversible loop, archived in cleanup |
| Wallet/data boundary | `otzar-live-wallet-boundary.spec.ts` | No |
| Pilot gate (all of the above) | `test:e2e:live:pilot-gate` | Mixed — per-spec rails |

`DEMO_SHARED_PASSWORD` comes from the operator env, never from a file, and
is never echoed.

## 5. Residue sweep (read-only queries, admin token)

1. Persons: `GET /org/entities?type=PERSON&take=250` — flag
   `smoke|__niov|pilot-|fixture` names/emails and non-ACTIVE rows.
2. Seeds: `GET /org/dandelion/seeds` — flag smoke-named subjects.
3. Escalations: `GET /escalations/pending` — flag rows sourced from smoke
   runs (by actor + created_at).
4. Ledger: `GET /work-os/team-work` paged to `has_more:false` — flag
   smoke-titled rows.
5. Twins: `GET /org/ai-teammates` — flag twins owned by suspended smoke
   identities.
6. Externals: the read-only external battery already proves the wire.

**Cleanup is canonical-rail-only:** suspend (persons), reject-with-reason
(seeds, escalations), archive (workspaces/projects), CANCELLED (follow-ups).
NO raw DB deletes; anything without a rail is documented as leave-alone and
becomes a P1 rail request. Pre-existing rows not created by the current
session require explicit founder sign-off before resolution (permission
boundary — enforced in practice by the tooling).

**Sweep result 2026-07-04:** 11 persons (1 smoke identity, already
SUSPENDED — its twin lingers: leave-alone, no twin-deactivation rail
exists, known P1); 97 seeds all organic; 404 ledger rows zero smoke-titled;
**2 PENDING dual-control escalations from the 2026-07-01 writeback smoke
(ids 8fad318b…, ce8fca11…) — removable via the reject rail, awaiting
founder authorization**; externals clean.

## 6. Rollback (pointer + CT addendum)

FND: `docs/operations/rollback-runbook.md` is authoritative (git revert
never reset, additive-schema-stays, destructive = Founder + PITR). Note its
§6 history is EMPTY — schedule one rollback rehearsal on the smoke org
before pilot. CT addendum: rollback = redeploy the previous good SHA via
the same API rail (`commitId: <previous>`), verify bundle hash reverted,
re-run the touched smoke gate. Keep the last-known-good SHA of both
services in the deploy notes at all times.

## 6b. Activation email delivery (ACT-EMAIL, shipped 2026-07-05)

Email delivery for activation links exists on the FND service but is
OFF until three env vars are set on `srv-d8t17sm7r5hc73ed5h6g`
(founder action; set via Render dashboard, then redeploy):

- `ACTIVATION_EMAIL_USE_REAL=1` — master switch (repo `*_USE_REAL` pattern)
- `RESEND_API_KEY` — Resend API key (never committed, never logged)
- `ACTIVATION_EMAIL_FROM` — verified sender, e.g. `Otzar <onboarding@otzar.ai>`
- (`CONTROL_TOWER_URL` already set — used as the activation-link base)

Semantics: "sent" = provider ACCEPTED the message (no delivery/open
tracking exists or is claimed). Sending mints a fresh one-time token on
the existing rail (superseding priors); the token exists only inside
the emailed link — never in logs, audit, or API responses. Honest
check: `GET /org/activation-email/status` (admin) returns
`configured: false` until the env is present. Copy-link fallback
always remains.

## 7. Secrets & key rotation

- No secret is ever committed, echoed, logged, or pasted into a doc. Render
  env uses `sync: false`; provider keys are backend-only.
- **RENDER_API_KEY rotation plan (founder action — keys are
  dashboard-managed, not rotatable via API):**
  1. Create a NEW key in the Render dashboard (Account → API Keys).
  2. Update the operator env with the new key (never echo it).
  3. Verify the new key can: read service status, trigger a deploy on the
     smoke-safe service, read jobs. (Render keys are account-scoped —
     verify by USE, not by claimed scope.)
  4. DELETE the old key in the dashboard (invalidation = deletion; verify
     the old key now 401s on `GET /v1/services`).
  5. Record the rotation date here. Rotations: [pending first rotation —
     current key verified working 2026-07-04].
- `DEMO_SHARED_PASSWORD` rotates when the pilot starts (the demo org
  becomes read-only-smoke territory).

## 8. Known ops risks (open, honest)

1. Smoke org does not exist yet (founder Phase-0 action) — until then,
   mutating smokes share the demo org behind per-run identities + rails.
2. Rollback never rehearsed (runbook §6 empty).
3. RENDER_API_KEY not yet rotated (plan above; current key works).
4. CT main allows direct pushes — the local six-gate bar is the control;
   CI is a record, not a gate.
5. No twin-deactivation rail (suspended smoke user's twin lingers).
6. The 2 stale smoke escalations await founder-authorized rejection.
7. Migration rail is procedure, not code — a future slice should codify the
   canary→DDL→verify sequence as a script.
