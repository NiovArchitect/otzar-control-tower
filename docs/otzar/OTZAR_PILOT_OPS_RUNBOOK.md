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

**CODIFIED 2026-07-07:** the whole §2 sequence is one fail-closed script —
FND `scripts/migration-job-rail.mjs` (`--ddl <file> --verify <file>
[--execute]`; dry-run by default; needs `RENDER_API_KEY` in the operator
env). It aborts on a lying canary, on DDL without idempotence guards, and
on verify scripts that cannot fail. Manual curl is no longer the rail.

## 3. Smoke tenancy + residue policy

**Target state:** a dedicated smoke org so pilot data and smoke traffic
never share a tenant. **✅ ACHIEVED 2026-07-06:** `NIOV Smoke Org` exists
— org `ad9515e2-7a9a-4cbc-a6b9-ff1ec2ba4e54`, first admin
`smoke-admin@niovlabs.com`, created via founder-authorized Phase-0 dual
control (operator-1 source, operator-2 approver; the two dedicated
platform operators were bootstrapped the same day per the FND
admin-bootstrap runbook §5A/§7).

**✅ MIGRATION COMPLETE 2026-07-07 — the tenancy is now BINDING:**

- **The demo org is READ-ONLY smoke territory.** Every mutating live
  spec targets the NIOV Smoke Org.
- `tests/e2e/live-tenancy.ts` is the single tenancy contract: smoke
  creds come from `OTZAR_SMOKE_ADMIN_EMAIL` (default
  `smoke-admin@niovlabs.com`) + `OTZAR_SMOKE_ADMIN_PASSWORD` (required —
  mutating specs skip without it), and every mutating spec structurally
  verifies its token resolves to the smoke org (`GET /org/hierarchy` →
  `org_entity_id` must equal `OTZAR_SMOKE_ORG_ENTITY_ID`, default the
  Phase-0 id above) BEFORE any write. Wrong creds fail loudly instead
  of mutating the wrong tenant.
- Migrated to the smoke org (dynamic per-run identities, canonical
  cleanup): `onboard-activation`, `learn-loop`,
  `assign-active-target`, `assign-workspace` (the assign pair
  provisions a per-run dynamic member as its assignee via the live
  onboarding rails and suspends it in cleanup); `redwood-probe` /
  `redwood-corpus` were smoke-native from birth.
- **CAST PORT COMPLETE 2026-07-07:** the seven formerly demo-locked
  governed-action arcs run on the smoke org via the GOVERNANCE CAST
  (`provisionSmokeCast` in `live-tenancy.ts` — hybrid design: durable
  approver backbone = smoke-admin, the org's only admin, so the
  dual-control org-admin pool resolves to it deterministically;
  per-run dynamic actor + colleague with run-suffixed names via the
  live rails; optional manager edge via `POST /org/hierarchy/assign`;
  `cleanupSmokeCast` rejects leftover pending escalations sourced by
  the cast, cancels their follow-up rows, suspends both identities).
  Migrated & proven live: `approval-loop` (full approve→deliver→
  SUCCEEDED + reject-with-reason + idempotency), `arc-coherence` 4/4,
  `bugb-followup-durable`, `bugc-recipient-review`,
  `clarification-roundtrip` (self-contained fixture — the clarifier
  is a candidate by durable row data, CE-1.5 target role),
  `bugd-connectedness` S5 (real manager edge, still queues),
  `reject-reason` R2. Their read-only scenarios (bugd S1–S4,
  reject R1) still run on demo with `DEMO_SHARED_PASSWORD`.
- `collaboration-matrix` + `employee-flow`: `OTZAR_SMOKE_ALLOW_WRITES=1`
  now arms writes ONLY when the account structurally resolves to the
  smoke org; on a demo account the flag is ignored (read-only matrix
  still runs) with an explicit console note.

- Mutating smokes run ONLY with per-run dynamic identities
  (`pilot-smoke+<runid>@…`, `__niov_test__` prefixes) and MUST end with
  their canonical cleanup rail (reject / archive / suspend / CANCELLED).
- Every live-smoke closeout states plainly: did it mutate, and how was it
  cleaned. Read-only smokes state "reads only; counts byte-identical".
- No smoke may create irreversible state (corrections, permanent memory)
  against the demo org.
- **Residue sweep cadence:** before any pilot user arrives, and after any
  smoke failure mid-run, run the sweep in Section 5.

**Env contract (live configs):** `OTZAR_SMOKE_ADMIN_EMAIL`,
`OTZAR_SMOKE_ADMIN_PASSWORD` (operator env, never a file, never echoed),
`OTZAR_SMOKE_ORG_ENTITY_ID` (optional override; defaults to the Phase-0
org id), `OTZAR_SMOKE_DEFAULT_HIVE_ID` (informational), plus the
existing `OTZAR_SMOKE_API_URL` / `OTZAR_SMOKE_BASE_URL` and the
read-only demo vars (`OTZAR_SMOKE_EMAIL`, `DEMO_SHARED_PASSWORD`).

**Batteries:** `test:e2e:live:mutating` = the smoke-org mutating battery
(onboard + learn-loop + assign pair + redwood probe; arms
`OTZAR_ASSIGN_SMOKE_MUTATE`/`OTZAR_LEARN_SMOKE_MUTATE`, `--workers=1` —
the assign specs share org-wide growth-count baselines and must never
interleave). `test:e2e:live:demo-readonly` = the demo read-only battery
(external battery + ambient clarity + twin authority + wallet boundary +
org setup). `test:e2e:live:pilot-gate` = demo-readonly + onboarding
(needs BOTH `DEMO_SHARED_PASSWORD` and `OTZAR_SMOKE_ADMIN_PASSWORD`).

### 3.1 Phase-0 execution script (verified against the code, 2026-07-06)

Authority reality (re-verified live): the pilot operator account's
session clamps to `read/write/admin_org` — `admin_niov` is silently
dropped, so Phase 0 CANNOT run from it. It needs the NIOV root account
(TAR `can_admin_niov`) **plus a second NIOV approver** (dual control).

**[G1-DUAL-CONTROL, 2026-07-06] the org-creation approval is SINGLE-USE
and PAYLOAD-BOUND:** the escalation carries a canonical sha256 of the
exact request body (`admin_password` redacted — it never affects the hash
and never reaches escalation metadata or audit), the approval matches ONLY
that hash, and the 201 consumes it atomically inside executePhase0's
transaction (APPROVED → EXPIRED + `consumed_at` +
`DUAL_CONTROL_APPROVAL_CONSUMED` audit). Consequences for this script:
steps 2 and 4 MUST send the byte-identical JSON body (field order may
differ; values may not — except the password, which may differ); a
re-POST after the 201 does NOT create a second org — it opens a fresh
PENDING escalation (403), and a true concurrent replay 409s
`DUAL_CONTROL_APPROVAL_CONSUMED`.

1. Log in as the NIOV root account with
   `requested_operations: ["read","write","admin_niov"]` — confirm
   `allowed_operations` echoes `admin_niov` back.
2. `POST /api/v1/platform/orgs` with
   `{"company_name":"NIOV Smoke Org","admin_email":"smoke-admin@niovlabs.com","admin_password":"<one-time strong>","admin_first_name":"Smoke","admin_last_name":"Admin"}`.
   **The FIRST call is DESIGNED to 403** — it creates a PENDING
   `DUAL_CONTROL_REQUIRED` EscalationRequest stamped with the payload
   hash, and audits the request.
3. The SECOND NIOV approver approves that escalation (Review Center /
   escalation approve). Self-approval is blocked by design. The approval
   authorizes that one payload only.
4. RETRY the identical POST → `201 {org_entity_id, …}` — executePhase0
   consumes the approval and creates the org, the first admin, the
   default enterprise hive, and audits `DANDELION_PHASE_0_COMPLETE` +
   `DUAL_CONTROL_APPROVAL_CONSUMED`.
5. Post-create baseline + env switches per the checklist above; then run
   the §6 rollback rehearsal against the smoke org, and migrate mutating
   smoke specs.

**Stale-escalation note — ✅ RESOLVED 2026-07-06:** the two PENDING
`DUAL_CONTROL_REQUIRED` escalations from 2026-07-01
(`8fad318b…`, `ce8fca11…` — writeback-smoke
`ACTION_CREATE_INVOKE_CONNECTOR` residue, NOT Phase-0 attempts) were
rejected with reason by their designated target (the org-admin
account) in the Phase-0 session; the pending queue returned to 0.
Lesson recorded: deciding an escalation requires its TARGET, not
generic NIOV authority — the source can never self-resolve.

## 4. Smoke gates (the pilot battery)

Run after every deploy that touches the area; ALL before any pilot
milestone. One command each (`npm run …` from CT):

| Gate | Spec(s) | Mutates? |
|---|---|---|
| Onboarding activation (SMOKE ORG, migrated 2026-07-07) | `test:e2e:live:onboard` (`otzar-live-onboard-activation.spec.ts`) | YES — smoke org only (tenancy-guarded); dynamic invitee, suspended in cleanup |
| External identity battery | `test:e2e:live:external` (context + promotion + chooser + team-external) | No — read-only, seed counts byte-checked |
| Clarity ambient | `otzar-live-ambient-clarity.spec.ts` + `otzar-live-clarity.spec.ts` | No |
| AI Teammates truth | `otzar-live-twin-authority.spec.ts` | No |
| Assignment/readiness | `otzar-live-assign-from-people.spec.ts` (read-only by design) / `assign-active-target` + `assign-workspace` (SMOKE ORG, migrated 2026-07-07) | Mixed — assign-from-people never writes; the armed pair is smoke-org only (tenancy-guarded), reversible loop, archived + member suspended in cleanup |
| Smoke-org mutating battery (SMOKE ORG ONLY) | `test:e2e:live:mutating` (onboard + learn-loop + assign pair + redwood probe, `--workers=1`) | YES — smoke org only, every spec tenancy-guarded + cleanup rails built in |
| Demo read-only battery | `test:e2e:live:demo-readonly` (externals + ambient clarity + twin authority + wallet boundary + org setup) | No — the demo org accepts read-only smokes only (BINDING 2026-07-07) |
| Customer Org Simulation v1 (MERIDIAN SIM ORG ONLY, ~9 min) | `test:e2e:live:customer-sim` (`otzar-live-customer-sim.spec.ts`; needs `OTZAR_CUSTSIM_ADMIN_PASSWORD`) | YES — Meridian sim org only (tenancy-guarded to org `69c07a00…`): 8-identity cast via rails, hierarchy + 3A rights + org timezone, dated docs w/ supersession pair, honest missing-Google state, truth-conflict arcs, employee boundaries, calendar proposal-only honesty; cleanup cancels rows + suspends identities (tenant persists clean). GREEN first-pass 2026-07-07 |
| Customer Org Simulation v2 (MERIDIAN SIM ORG ONLY, ~15 min) | `test:e2e:live:customer-sim:v2` (`otzar-live-customer-sim-v2.spec.ts`; needs `OTZAR_CUSTSIM_ADMIN_PASSWORD`) | YES — Meridian sim org only (tenancy-guarded): 16-identity cast + hierarchy + role titles + 3A rights + timezones; REAL Google (Drive doc import w/ external_source lineage + dedupe, Calendar free/busy read driving a scheduling proposal, honest Meet SCOPE_REAUTH_REQUIRED); REAL calendar create→delete inline (slot clear of free/busy → gated events.insert returns real event_id + google_calendar_event lineage, no token leak → delete → delete-again idempotent → zero residue; adaptive branch falls back to EVENT_WRITE_SCOPE_MISSING only on a scope-less tenant); deep truth engine (supersession-lead + sales-overreach-flag + memory/question/request-not-work + zero-invention); employee/Twin boundaries + non-party 404; cleanup cancels rows + suspends identities (tenant + Google connection persist clean). GREEN 2026-07-07 |
| Source integrity (MERIDIAN SIM ORG ONLY, ~40s) | `test:e2e:live:source-integrity` (`otzar-live-source-integrity.spec.ts`; needs `OTZAR_CUSTSIM_ADMIN_PASSWORD`) | YES — Meridian sim org only (tenancy-guarded): import ONE real Google Doc → revalidate unchanged upstream → state AVAILABLE, changed:false, no token leak → SOURCE_VERIFIED audit; cleanup sweeps every non-cancelled DOCUMENT_CONTEXT row (resilient to a timed-out-import orphan). Mutation branches (changed/deleted/revoked/corrupt) proven in FND integration via injected fetch seam — never live. GREEN 2026-07-07 |
| **Investor/customer demo rehearsal** (MERIDIAN ONLY) | Run `test:e2e:live:customer-sim:v2` then `test:e2e:live:source-integrity` **serially** (both touch DOCUMENT_CONTEXT rows). Script + talk track: `demo/MERIDIAN_INVESTOR_DEMO_SCRIPT.md`; proof appendix: `demo/MERIDIAN_TECHNICAL_PROOF_APPENDIX.md`. | YES — Meridian sim org only. Full org-harmonization story (five refusals), real Google Docs + Calendar create/delete, source integrity + audit, cleanup to zero residue. Rehearsed GREEN 2026-07-07 |
| Org autonomy loop (MERIDIAN SIM ORG ONLY, ~2 min) | `test:e2e:live:org-autonomy` (`otzar-live-org-autonomy.spec.ts`; needs `OTZAR_CUSTSIM_ADMIN_PASSWORD`) | YES — Meridian sim org only (tenancy-guarded): provisions an attendee + a non-party, gated real calendar create → `CALENDAR_EVENT_CREATED` notification to creator + resolved attendee, **non-party gets zero** (permission boundary), calm "no action needed" copy, no token leak → delete → `CALENDAR_EVENT_CANCELLED` to the party; cleanup dismisses notifications + cancels MEETING rows + suspends identities + deletes the event → zero residue. Requires FND PR #594 deployed |
| Source-health sweep (admin, bounded) | `POST /api/v1/drive/docs/health-sweep` (admin `can_admin_org`) — re-verifies ≤50 already-imported docs, emits `SOURCE_HEALTH_CHANGED` only for demoted sources; never crawls Drive; transient blips don't demote. Covered by FND integration; live returns an all-verified summary on an unchanged tenant. | YES — org-scoped; safe read/notify only |
| Wallet/data boundary | `otzar-live-wallet-boundary.spec.ts` | No |
| Pilot gate (all of the above) | `test:e2e:live:pilot-gate` | Mixed — per-spec rails |
| Redwood truth-weight probe (SMOKE ORG ONLY) | `test:e2e:live:redwood` (`otzar-live-redwood-probe.spec.ts`) | YES — smoke-org only: dynamic personas via invite/activate, conflict-pair ingest, supersession + calm correction + overreach + boundary-404 asserted; cleanup cancels its ledger rows (settled history per FND `b564da8`) + suspends personas; repeat-safe (proven back-to-back). Needs `OTZAR_SMOKE_ADMIN_PASSWORD`; skips without it — can never target the demo org |
| Redwood FULL corpus (SMOKE ORG ONLY, ~21 min) | `test:e2e:live:redwood:corpus` (`otzar-live-redwood-corpus.spec.ts`) | YES — smoke-org only: all 8 people.json personas via rails + 3A rights, ALL 48 corpus artifacts through governed ingest (36 conversations + 12 seeded docs, transient-5xx retry built in), honest zero-invented-owners at scale (LOCAL_FALLBACK), conflict-pair supersession/overreach/404 proofs, connector honesty, escalations stay 0; cleanup cancels every run row + suspends all personas (proven live 2026-07-06, 4 runs, zero residue). Same `OTZAR_SMOKE_ADMIN_PASSWORD` guard |

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
never reset, additive-schema-stays, destructive = Founder + PITR). CT
addendum: rollback = redeploy the previous good SHA via the same API rail
(`commitId: <previous>`), verify bundle hash reverted, re-run the touched
smoke gate. Keep the last-known-good SHA of both services in the deploy
notes at all times.

**REHEARSED 2026-07-07 (founder GO, smoke org):** `b564da8` → `b26b397`
→ `b564da8` on `otzar-api` via the Render API rail. Pre-rollback
verify-chain snapshot taken (§2.3 discipline); window verified code-only
(zero migrations — §4.1 class); every checkpoint green on BOTH SHAs
(health/db, smoke-admin login + `admin_org`, pending escalations 0,
verify-chain `verified:true`, ledger reads, CT `/login` 200); the
Redwood 2-persona probe re-proved the restored SHA's supersession
semantics. Rollback deploy ~4 min to live; roll-forward ~4 min. History
row appended in the FND runbook §6. Deploy-rail rollback needs NO git
revert — revert commits are for real incidents where the bad code must
leave `main`.

## 6b. Activation email delivery (ACT-EMAIL, shipped 2026-07-05)

**✅ LIVE + VERIFIED 2026-07-07:** all three env vars are set on
`srv-d8t17sm7r5hc73ed5h6g` (verified by key-name listing, values never
read) and `GET /org/activation-email/status` returns `configured: true`.
The §6b.1 controlled live-send executed ONCE on the NIOV Smoke Org
(dynamic invitee): provider ACCEPTED (`status: "sent"`), exactly one
leak-clean `ACTIVATION_EMAIL_SENT` audit row, invitee stayed
activation_pending, response carried no token/URL. The email send
superseded the earlier copy-link token as designed (old token 410).
INBOX DELIVERY IS NOT CLAIMED — acceptance only (no inbox access).
Activation completion itself is separately proven via the copy-link
rail (activate 200 → login 200) in the same session. Original setup
notes below for reference:

Email delivery for activation links exists on the FND service and
required three env vars on `srv-d8t17sm7r5hc73ed5h6g`
(set via Render dashboard, then redeploy):

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

### 6b.1 Controlled live-send verification (run ONCE after env is set)

Pre-conditions (all must hold before any send):
1. FND health 200; record the live SHA (an env change redeploys the
   same commit).
2. Authenticated admin probe `GET /org/activation-email/status`
   returns `configured: true`. If false → stop; env not landed.
3. A SAFE smoke recipient exists: in-org, activation_pending, a
   test/demo-category address (never a real customer/employee unless
   explicitly designated), safe to receive exactly one email. Find via
   read-only `GET /org/entities?type=PERSON` (activation_status
   projection). If none exists → SKIP the send and report "provider
   configured; no safe recipient; product ready for controlled send" —
   do NOT create a member just to test.

The send (exactly one; never batch; never repeated):
- `POST /org/members/<id>/activation-email` (admin token).
- Expect `{ok: true, status: "sent"}` — provider ACCEPTED; nothing
  more is claimed.

Post-send verification (all read-only):
- Response contains NO token / activation URL.
- ONE `ACTIVATION_EMAIL_SENT` audit row for the target; details carry
  token_id + provider category only — never token/URL/body.
- Target's activation_status remains pending (nobody activated).
- Copy-link fallback still mints (do not click the emailed link unless
  explicitly testing activation completion).

Provider failure path: expect honest `PROVIDER_FAILED` + ONE
`ACTIVATION_EMAIL_FAILED` audit (ERROR outcome, no token/URL); UI
points to the copy-link fallback. Do not retry repeatedly — diagnose
the Resend dashboard/sender verification first.

## 6c. Starter-Twin guarantee (TWIN-BOOTSTRAP, shipped 2026-07-06)

Root cause it closes: members created via bulk-create + activation
EMAIL never pass Phase-3 invite (the Twin-minting step) — the live
smoke member activated successfully but had no Twin (`twin_not_found`).

The guarantee now: activation redemption (POST /auth/activate) ensures
a STARTER twin best-effort (same Phase-3 rail: twin + personal wallet +
TAR + default-Hive join; shell only — no tools, no authority, no role
template; audited STARTER_TWIN_PROVISIONED trigger "activation").

Repair for stranded active members (admin, idempotent):
`POST /org/members/<id>/ensure-twin` → `{ok, created, twin_id}` —
audited with trigger "admin_repair" when it creates. Employees 403;
unknown/cross-org 404. Requires the org's default enterprise hive
(Phase 0 creates it).

## 6d. Account access / password lifecycle (PASSWORD-LIFECYCLE, 2026-07-06)

The full lifecycle rides the ONE setup-token rail (PASSWORD_RESET
purpose: 1h TTL, one-time, supersedes priors, redeemed at /activate,
invalidates ALL sessions, audited). Admins can NEVER see or set a
password.

- **Employee, logged in:** /app/account-security → change password
  (current password required; every OTHER device signed out; audited
  PASSWORD_CHANGED).
- **Employee, logged out:** Login → "Forgot password?" →
  /forgot-password. ENUMERATION-SAFE: identical response whether the
  email exists or not; eligible ACTIVE members get a reset email
  (distinct template) when the provider is configured; no token is
  burned when it isn't.
- **Admin:** Users row → "Send password reset" (ACTIVE members;
  pending members keep "Send activation email" — the purposes never
  blur; the API refuses with 409 pointing at activation). Copy-link
  fallback remains. "Sent" = provider ACCEPTED, never delivered.
- **Lockout:** 5 failed logins → ENTITY SUSPENDED (audited). A reset
  alone does NOT unsuspend (deliberate: reset must not bypass an
  intentional admin suspension) — reactivate the member first, then
  reset. An org admin reactivates via Users / `PATCH /org/entities/:id`.
- **Sole-admin lockout (LOCKOUT-RECOVERY, shipped 2026-07-07, FND
  `20e99f4`):** when the locked-out member IS the org's only admin, the
  org has no self-service path — a NIOV platform operator recovers via
  `POST /platform/entities/:entityId/clear-lockout` (`can_admin_niov`;
  `:entityId` accepts the UUID or the account email; mandatory human
  reason). NOT a general unsuspend rail: it refuses (409) unless the
  suspension is PROVABLY the auth layer's lockout — entity SUSPENDED +
  `failed_auth_attempts` at threshold + the newest ENTITY_SUSPENDED
  audit row being the actorless "5 failed attempts" record. It touches
  ONLY entity status + the failed counter (never TAR / memberships /
  passwords) and writes ENTITY_REACTIVATED
  (`PLATFORM_LOCKOUT_CLEARED`, actor/target/reason/prior-state).
  First live use 2026-07-07: the founder locked the demo-org sole
  admin out by retrying a pre-rotation password 5× (the concurrent
  Render key deletion was unrelated — auth never touches Render);
  operator-1 cleared it, login verified with all six operations.
- Audit: PASSWORD_CHANGED · PASSWORD_RESET_EMAIL_SENT/FAILED (+
  existing PASSWORD_RESET_LINK_CREATED / PASSWORD_RESET_COMPLETED) —
  never a password, token, URL, or body.

## 6e. Domain decision rights (BLOCK-3A, 2026-07-06)

Plane 3 of the org operating substrate: who OWNS, can APPROVE, or can
only RECOMMEND per decision domain (Strategy / Technical / Product /
Design / Security / Legal / Finance / People / Customers / Execution /
Architecture / Timelines). Distinct by construction from reporting
hierarchy (Members) and approval authority (Review Center / policy).
Rights grant NO tools, NO permissions, NO admin authority — they only
inform how Otzar weighs and routes decisions.

- **Admin:** /setup/company-profile → "Decision rights" card — pick a
  person, set a posture per domain, save. Audited
  DECISION_RIGHTS_UPDATED (ids + domain lists only).
- **Employee:** /app/work-schedule → "Your decision rights" —
  read-only posture + escalation guidance. AI Twins follow their
  person's boundaries; rights never widen what a twin can do.
- **Engine truth:** with rights set, the domain owner outweighs a
  meeting lead / executive floor-holder in that domain; a
  recommend-only person can never finalize; policy still outranks
  everything. With NO rights set, Otzar honestly falls back to
  reading decision signals from conversations.
- **Schema:** entity_decision_rights (additive-only; applied to prod
  via scripts/activate-decision-rights-prod-schema.ts — approval-gated,
  idempotent, never DROP/ALTER, no backfill). Absence of a row = no
  structured rights.
- **Lineage at ingest (Block 3B):** every conversation-derived work
  row / follow-up is stamped with `details.communication_lineage`
  (speech act from the 16-act vocabulary, speaker + role, source
  artifact, authority basis/status via decision rights, currentness).
  Deterministic, fail-open, zero admin work — nobody classifies
  messages.
- **Truth-weight retrieval (Block 3C):** the clarity/background answer
  rail now weighs that lineage. A within-authority decision beats a
  newer proposal; memory references and open questions are never
  current truth; recommend-only informs but never finalizes;
  exceeds-authority commitments are flagged, never approved truth;
  policy constraints outrank preference; superseded rows lose to their
  successor. Supersession links ONLY on explicit language + a unique
  older match — ambiguity links nothing. When someone works from an
  older plan, Otzar answers with a brief calm correction plus the
  current source (never a dump, never "you are wrong"). Twins retrieve
  strictly through their human's session and inherit no authority —
  test-locked.

## 6f. Google Workspace OAuth setup (GOOGLE-ARC, authored 2026-07-07)

The Docs/Meet/Calendar read bridges shipped at FND `ff801cf` and stay
honestly OFF (`BLOCKED_BY_CREDENTIAL` / `NOT_CONNECTED`) until the
founder completes this dashboard-only setup. Nothing here can be done
by the API; nothing below requires pasting a secret into chat.

**Env vars required on `otzar-api` (srv-d8t17sm7r5hc73ed5h6g):**
1. `GOOGLE_OAUTH_CLIENT_ID` — from the OAuth client created below.
2. `GOOGLE_OAUTH_CLIENT_SECRET` — same client (sync: false).
3. `OAUTH_REDIRECT_BASE_URL=https://api.otzar.ai` — **currently MISSING
   and required**: without it the callback derives from the
   `http://localhost:3000` dev default and every consent round-trip
   fails in production.

**The exact redirect URI to register (verbatim):**
`https://api.otzar.ai/api/v1/connectors/oauth/callback/google`

**The scopes the consent screen must list (all READ-ONLY; the code
requests exactly these — `connector-oauth.service.ts` GOOGLE profile):**
- `https://www.googleapis.com/auth/calendar.readonly` (sensitive)
- `https://www.googleapis.com/auth/calendar.freebusy`
- `https://www.googleapis.com/auth/calendar.events.freebusy`
- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
- `https://www.googleapis.com/auth/calendar.settings.readonly`
- `https://www.googleapis.com/auth/gmail.readonly` (**restricted** —
  requested for the read-first provider surface; Gmail is NOT ingested
  by any product flow; dropping it is the single biggest review-burden
  reduction if ever needed)
- `https://www.googleapis.com/auth/drive.metadata.readonly` (sensitive)
- `https://www.googleapis.com/auth/drive.readonly` (**restricted** —
  the selected-doc import)
- `https://www.googleapis.com/auth/meetings.space.readonly` (sensitive —
  post-meeting Meet records/transcripts)

**Google Cloud Console steps (founder, ~15 min):**
1. console.cloud.google.com → create (or select) project, e.g.
   `otzar-workspace-connector`, under the niovlabs.com organization.
2. APIs & Services → **enable**: Google Calendar API, Google Drive API,
   Google Meet REST API, Gmail API.
3. APIs & Services → OAuth consent screen:
   - **User type: INTERNAL** (STRONGLY RECOMMENDED — niovlabs.com is a
     Google Workspace domain, so Internal skips Google app review AND
     the restricted-scope CASA security assessment entirely, has no
     7-day refresh-token expiry, and limits consent to niovlabs.com
     accounts — exactly the pilot posture). If External is ever needed
     for customer domains: publish status "Testing" allows up to 100
     named test users WITHOUT review, but refresh tokens then expire
     every 7 days (weekly re-consent) until verification + CASA pass
     (~6 weeks for restricted scopes).
   - App name: `Otzar`; support email: sadeil@niovlabs.com;
     authorized domain: `otzar.ai`; developer contact:
     sadeil@niovlabs.com.
   - Add ALL nine scopes above on the scopes step.
4. APIs & Services → Credentials → Create credentials → **OAuth client
   ID** → type **Web application** → name `otzar-api` → Authorized
   redirect URIs: the exact URI above (no trailing slash). Create.
5. Put the client id + secret + `OAUTH_REDIRECT_BASE_URL` into the
   Render env for `otzar-api` (never in chat, never in a repo file),
   then redeploy the same live SHA so the process re-reads env.

**✅ VERIFIED LIVE 2026-07-07 (Meridian sim org):** env landed on
`otzar-api` (a same-SHA redeploy was needed to re-read it — a value-only
env edit did not auto-trigger one, and note `GOOGLE_OAUTH_CLIENT_SECRET`
had first saved empty), adapter flipped `BLOCKED_BY_CREDENTIAL` →
`BLOCKED_BY_APP_REVIEW`, OAuth `APP_CREDENTIALS_MISSING` →
`READY_FOR_CONSENT`; the authorize URL carried the exact redirect_uri +
all 9 read-only scopes; after the founder's browser consent
(sadeil@niovlabs.com) the callback stored the token → `CONNECTED_UNVERIFIED`
→ verify probe `VERIFIED`. **By use:** Calendar free/busy read = 200
(google provider, intervals returned, no event titles, no token leak);
Drive docs list = 200 (real docs, no export URLs/tokens); one selected
doc imported end-to-end (real text export + sha256 content hash + full
external_source lineage — proven by the identical re-import refusing
`ALREADY_IMPORTED`, which matches exactly on stored file_id + hash — then
CANCELLED so the sim tenant kept zero residue); Meet records =
`SCOPE_REAUTH_REQUIRED` (honest — the Meet REST API path is not available
for this account; NO transcript was fabricated); Calendar create = 409
`NEEDS_SELECTED_TIME`, blocked, no fake-creation language. Connection
persists VERIFIED; escalations 0; demo org untouched. **First-consent
gotcha:** the signed OAuth `state` has a 10-minute TTL — a slow round-trip
expires it and the callback stores nothing (status stays
READY_FOR_CONSENT); just re-mint and complete promptly.

**✅ CALENDAR WRITE VERIFIED LIVE 2026-07-07:** after the founder added
`calendar.events` to the Google consent screen and re-consented, the
connection carries 10 scopes (VERIFIED). Real event lifecycle proven by
use on the Meridian sim org: free/busy read → pick a slot clear of real
busy → `POST /calendar/events/create` (all human gates: approval +
caller-confirm) returned **200 with a real google_calendar_event**
(event id + calendar `primary` + start/end + html_link, leak-clean) →
`POST /calendar/events/delete` removed it (200) → delete-again 200
(idempotent already-gone). ZERO calendar residue. Calendar write is now
a real, approval-gated, cleanup-capable capability — never silent, never
fabricated (a create is claimed only when Google returns an event id).

**Post-env verification (Claude runs all of it; say "GO google verify"):**
1. `GET /connectors/adapters` → GOOGLE_WORKSPACE flips
   `BLOCKED_BY_CREDENTIAL` → `BLOCKED_BY_APP_REVIEW` (the registry's
   conservative label — accurate for External; for Internal apps review
   is not applicable and the OAuth flow below is the real proof).
2. `GET /connectors/oauth/status` → google `APP_CREDENTIALS_MISSING` →
   `READY_FOR_CONSENT`.
3. `POST /connectors/oauth/google/start` (org admin — recommend the
   MERIDIAN sim org so real imports land in the customer-sim tenant)
   returns the authorize URL → **founder browser step**: open it,
   consent with the designated niovlabs.com Google account → callback →
   status `CONNECTED_UNVERIFIED` → `POST /connectors/oauth/google/verify`
   probes a real calendarList read → `VERIFIED`.
4. Claude then verifies by USE, read-only + one selected import each:
   - `GET /calendar/freebusy` → real busy intervals (no titles);
   - `GET /drive/docs` → real list; `POST /drive/docs/ingest` on ONE
     founder-designated doc → DOCUMENT_CONTEXT row with full lineage;
   - `GET /meet/conference-records` → if a post-meeting transcript
     exists, ONE `POST /meet/transcripts/ingest`; if none,
     `NO_TRANSCRIPT` is reported honestly — never fabricated.
5. Calendar WRITE is LIVE and approval-gated (the founder consented the
   `calendar.events` scope on Meridian). `POST /calendar/events/create`
   requires the full gate ladder (selected time → participants →
   confirmation → approval → caller-confirm → connected → write-scope);
   only then does it run a real Google `events.insert` and return a real
   `event_id` + `google_calendar_event` lineage, with `events.delete`
   idempotent. On any tenant WITHOUT the write scope it still answers
   `EVENT_WRITE_SCOPE_MISSING` honestly — no fabricated event, ever.

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
  5. Record the rotation date here. Rotations: **2026-07-07** — first
     rotation executed per this exact rail: new key verified by use
     (services read + otzar-api deploy list, no deploy triggered) BEFORE
     the old key was deleted; old key verified 401 after deletion; new
     key re-verified 200 after. Distinct-key proof held throughout (the
     old and new keys were confirmed different credentials before
     deletion).
- **Account-password rotations (all via the shipped
  `POST /auth/change-password` rail, old password verified dead 401,
  new grants verified by login):** 2026-07-07 — operator-1, operator-2,
  smoke-admin (post-exposure of the bootstrap secrets file), sadeil@
  (post-exposure in chat), operator-1 again (second in-session exposure
  during a secure-file inspection; the lesson is BINDING — secure-file
  inspection may only print line numbers/lengths/label classifications,
  never content-matching grep/sed output).
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
