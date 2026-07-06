# Otzar Control Tower — Section 12B context

## How to read this file (added 2026-05-28)

This file is **untracked** by repo policy — operator-tier continuity
context. Update discipline (newest-first):

1. **Newest content lives at the top.** Each closeout / status update
   is appended immediately below the Founder Directive section, above
   the previous closeout. The two-track disclaimer directly below this
   subsection + the Founder Directive are stable preamble and are not
   moved.
2. **Legacy sections are preserved verbatim** for continuity + audit;
   sections without an explicit "STILL CURRENT" stamp **must be
   treated as historical**. The legacy Section 12B operator journal
   around lines ~304 onward (cross-repo state table, architectural
   inventory pre-Wave-1, 12C-NEXT queued items) is explicitly stale
   for `main` per the two-track disclaimer below; it remains for
   reference but is **not** authoritative current state.
3. **Rule 0 — Documentation-First / No-Guessing.** When this file's
   text disagrees with Foundation or Control Tower code at the
   current HEADs, code with file:line evidence is current behavior;
   this file is architectural intent until reconciled. Do not
   silently merge the two — surface the conflict per RULE 13.
4. **Cross-repo HEADs** (current as of last closeout):
   - Foundation `main`: see top closeout sections for current HEAD
   - Control Tower `main`: see top closeout sections for current HEAD

Future Claude Code sessions: load the top three sections (this
subsection + the two-track disclaimer + the Founder Directive)
first, then the most recent closeout, then the Foundation 12C.0
status update, before reading anything below.

---

> **TWO TRACKS LIVE IN THIS REPO — read this first.**
> The sections further below (12A → 12C) document the **org-admin Control
> Tower** surface (Section 12B; `can_admin_org`). Their cross-repo table /
> HEADs predate the second track and are **stale** for `main`.
> A separate **Employee Otzar** track is what currently tops `main`
> (`can_read_capsules`, employee `/app` shell): Phase-1 shell → approvals →
> My Twin/Conversations → Wave 1 transparency → Wave 2A role-scope →
> trust-chain/CI → Wave 2B look-back → **Wave 2C correction signals**. The
> "Wave Closeout" sections immediately below are the authoritative state
> for that track (newest first). **This is NOT an MVP — see the Founder
> Directive immediately below.**

---

## 🚨 FOUNDER DIRECTIVE (2026-05-28) — production-grade, not MVP

**This is not an MVP path.** The target is a premium, production-grade
enterprise client launch. No required production section may be dismissed
as "later" merely because it is large. The correct response to complexity
is to **chunk more coherently**, not to defer.

**Method going forward:**

- Bigger but precise Claude Code prompts (QLOCKs).
- Full substrate verification before any plan recommendation (cross-repo,
  read-only grep + read of Foundation contracts, ADRs, and existing
  Control Tower surfaces).
- Clear ADRs where needed (and named).
- Exact backend contracts (route, body, response, error codes).
- Exact frontend surfaces (files, components, props, copy).
- Exact schema requirements (Prisma additions, indices, constraints).
- Exact tests (unit + integration + safety greps + scope check).
- Explicit safety / no-leak boundaries (forbidden tokens, forbidden UI).
- Branch / PR discipline (one feature branch → CI → review-status → squash
  merge → housekeeping → CONTEXT.md closeout).
- CONTEXT.md updated after every major close (newest first).

**Required production sections — none deferrable as "optional later":**

1. **Employee Intelligence Core** — observe / correction / safe context
   priority within scope. Wave 2B (look-back) + Wave 2C (correction
   signals) are the first two real-content surfaces of this core.
2. **Autonomous Execution Core** — bounded, governed, audit-aware.
3. **Hives / Team Intelligence** — multi-twin coordination under explicit
   permission bridges.
4. **MCP / Connectors** — external-tool integration under policy.
5. **Agent Playground** — safe simulation and dry-run surface.
6. **Enterprise Analytics** — read-only aggregates within sovereignty
   boundaries.
7. **Full Audit Viewer** — complete audit chain visibility for admins
   (not just clickable links from Stage-4 toasts).
8. **Billing / Entitlements** — capability gating + metered usage.
9. **Admin / Governance Control Tower** — reconcile the stale Section
   12B org-admin track table below against the current Employee track;
   land the org-admin surface as production-grade not MVP.
10. **Deployment / Security / Go-Live Operations** — environments,
    secrets, observability, IR, DR, compliance posture.

**Do NOT** describe hives, Agent Playground, MCP/connectors, billing,
enterprise analytics, full audit viewer, or autonomous execution as
"later optional features." They are required production sections.
Sequencing may be staged; the architecture must account for all of them.

**Recommended next authorization:**

> **`[OTZAR-PRODUCTION-GO-LIVE-MASTER-GAP-AUDIT-QLOCK]`**

A read-only cross-repo audit (`niov-foundation` + `otzar-control-tower`)
that determines, per required production section:

- what is implemented (commit hashes)
- what is documentation-only (ADRs without code)
- what is mocked (MSW fixtures only, no Foundation contract)
- what is missing entirely
- what is unsafe to claim today
- what is required before enterprise go-live
- missing ADRs
- missing backend contracts (route + body + response + errors)
- missing frontend surfaces (files + components + copy)
- missing schema / audit / security / testing gaps
- what can run in parallel vs what must be sequential
- the exact production build order

---

## ✅ BLOCK-3C · Truth-weight retrieval + supersession + Twin-boundary lock · LIVE (2026-07-06, Fable 5)

**HEADs:** FND `main` = `7f6f8d4` (PR #578 squash on green 5/5, deployed
`dep-d962jnu8bjmc73cmuph0`, live — read-only smoke only) · CT `main` =
this commit (docs-only — no UI by design; deployed CT code stays
`77db133`). **The org-substrate arc 3A→3B→3C is CLOSED end to end.**

- **The composition law is executable:** truth weight = decision rights
  + communication act + source lineage + authority lineage + agreement
  lineage + currentness + permissions. `truth-weight.service.ts` (pure,
  8 classes): policy_constraint > authorized_decision >
  unverified_decision > work_signal > recommendation > reference_only >
  exceeds_authority > superseded. Recency breaks ties ONLY within a
  class — a newer proposal can never outrank an authorized decision; a
  memory reference / open question is never current truth;
  recommend-only informs, never finalizes; exceeds-authority is
  flagged, never approved truth; policy outranks preference; superseded
  loses to its successor.
- **Deterministic supersession linking at ingest:** explicit
  superseding language + same decision domain + ≥2 shared CONTENT
  tokens (title + statement quote; participant-name tokens excluded so
  generic "Follow-up owned by X" titles can never degenerate-match) +
  EXACTLY ONE older stamped candidate → fills supersedes/superseded_by
  + currentness=superseded (additive JSON only). Zero or many
  candidates → nothing links; unresolved beats guessed; fail-open;
  seeded history never supersedes live work.
- **Calm correction on the clarity rail:** asking about a superseded
  row leads with ONE sentence ("You may be looking at an older plan —
  … was superseded. The current decision is …") + the successor title
  ONLY when the caller passes the same party-or-manager gate for that
  row; quiet one-line flags for exceeds-authority / recommend-only /
  recollection rows. Never a source dump, never "you are wrong", never
  raw ranking mechanics (test-locked).
- **Twin-boundary LOCKED at retrieval:** AI_AGENT caller → NOT_FOUND on
  its human's rows (a twin reaches work only through its human's
  authenticated session); cross-org NOT_FOUND (enumeration-safe);
  rights load through the HUMAN roster only (force-created twin rights
  rows never surface); no caller can turn a recommend-only posture into
  finality. Permissions gate BEFORE ranking, unchanged.
- Tests: truth-weight-retrieval 4/4 (ten ranking rules · supersession
  e2e through real ingest + calm correction · ambiguity links nothing ·
  permission/Twin probes); unit tier 2989/2989; targeted integration
  44/44 (clarity-answer 5/5 unchanged). ZERO schema; no
  customer-facing regression; no production mutation (read-only
  probes).
- **Redwood Atlas status:** the doctrine's conflict patterns now hold
  END TO END at runtime — a future SMOKE-org corpus load is
  structurally possible (own GO; never prod/demo). Remaining (future
  GOs): ambient/named-subject surfaces consume truth-weight ·
  supersession chains >2 hops · per-domain thresholds.
- Ops: repos relocated to `~/dev/NIOV Labs/github` (out of iCloud)
  before this block — ZERO " 2" corruption artifacts appeared during
  3C (first clean slice since the hazard was identified).

## ✅ BLOCK-3B · Communication lineage at ingest · LIVE (2026-07-06, Fable 5)

**HEADs:** FND `main` = `0ef2fce` (PR #577 squash on green 5/5, deployed
`dep-d961tovaqgkc73ab0ei0`, live — health 200, all existing surfaces
answer unchanged; read-only smoke only) · CT `main` = this commit
(docs-only — NO UI built by design; deployed CT code stays `77db133`).

- **Speech acts create organizational reality.** Every conversation-
  derived COMMITMENT/FOLLOW_UP row is stamped at ingest with
  `details.communication_lineage` (AIX-2 additive-JSON precedent, ZERO
  schema): speaker + entity + role-at-time · source artifact/title/
  date/participants · communication_act (the Redwood Atlas 16-act
  vocabulary adopted EXACTLY, test-locked against corpus.json) ·
  decision_domain · authority_basis/authority_status (via the 3A rights
  store) · decision_makers_present · required_approvers_present ·
  agreement_participants · supersedes/superseded_by (persisted, LEFT
  NULL — deterministic linking is 3C; unresolved beats guessed) ·
  currentness · confidence · permission_scope (follows row visibility).
  MEETING row carries artifact-level lineage; ORG_SEEDING rows
  deliberately unstamped (Otzar's own suggestions are not speech acts).
- **Doctrine locked mechanically (7 examples in tests):** a memory
  reference ("I think the old date was July 24") can NEVER become a
  decision; a request never becomes policy; unresolved questions stay
  unresolved; "we agreed …" outranks an embedded report of dissent; a
  recommend-only speaker claiming finality (sales "full automation") is
  marked exceeds_authority — never approved truth; the domain owner's
  objection stays a within-authority signal; the CEO's "let's do it" on
  a finance item still respects the finance approval holder; no
  structured rights → honest "unknown", ingestion never blocked
  (fail-open).
- Deterministic-first honestly: explicit linguistic markers only, no
  LLM claim; classifier ordered so weak-claim acts are recognized
  before decision markers. Zero customer-facing behavior change
  (comms-ingest suite unchanged 10/10); no tools/TAR/approval/
  permission contact; no admin classification work ever.
- Tests: communication-lineage 5/5 (vocabulary lock 16/16 · doctrine
  examples · real-DB stamping with rights + TAR byte-identical ·
  no-rights fallback · FOLLOW_UP stamps); unit tier 2989/2989; targeted
  integration 52/52. Docs: runbook §6e lineage note · gap ledger X
  (3B shipped, 3C remaining) · Redwood README real-vs-simulated · AIX
  model doc Part 5b.
- **No production mutation** (deploy + read-only GET probes only).
  **Next (own GO): Block 3C — truth-weight retrieval composing rights +
  act + lineage + currentness + permissions, deterministic supersession
  linking, Twin-boundary lock probes on live surfaces.**

## ✅ BLOCK-3A · Decision-rights truth (org substrate plane 3) · LIVE-VERIFIED (2026-07-06, Fable 5)

**HEADs:** FND `main` = `912318e` (PR #576 squash on green 5/5, deployed
`dep-d961a828qa3s73dplrpg`, live — all 3 routes 401 unauth, not 404) ·
CT `main` = `77db133` (direct-push + API deploy `dep-d961bdks728c73e7ahu0`,
live — bundle `index-cbuAuRtw.js` → `index-BRdgP2Yb.js` carries all 5
content probes incl. "Decision rights do not grant tool access").

- **Founder-approved Option A schema (the ONE additive migration):**
  `entity_decision_rights` — per (org, person) owns / can_approve /
  recommend_only as service-validated String[] against the
  DecisionDomain vocabulary ("unknown" never assignable); unique
  (org, entity); NO backfill; NO existing row/object touched; absence
  of a row = heuristics continue. **Prod schema applied via the
  sanctioned 1305-B mechanism** (activate-decision-rights-prod-schema
  .ts: dry-run verified target + DDL → approval-gated apply; before
  table=false → after table=true; 6 safety unit tests). This was the
  ONLY production mutation: schema DDL, zero rows written, zero rights
  set on real users.
- **Plane discipline (binding):** hierarchy stays on EntityMembership;
  approval authority stays on dual-control/policy/TAR; rights grant NO
  tools, NO TAR capabilities, NO role templates, NO admin authority —
  decision/truth/routing input only. Test-locked: TAR/profile/
  memberships byte-identical across a rights write; AI_AGENT targets
  404; a force-created AI_AGENT row never surfaces (a Twin resolves
  THROUGH its human — no authority inversion).
- **Engine wiring:** pure overlay applyStructuredRightsToDecisionInput
  before computeDecisionRights in governExtraction (loaded once per
  ingest, human roster only, fail-open): domain OWNER seats as
  authority (meeting-lead/executive heuristics demote to expertise —
  the executive does not always win); APPROVER seats when no owner;
  RECOMMEND-ONLY is demoted and can never finalize; no rights →
  byte-identical heuristic input (same object reference, tested);
  policy still outranks everything.
- Routes: GET /org/me/decision-rights (self posture, honest unset
  note) · GET /org/decision-rights (member-readable names+domains
  summary) · PATCH /org/members/:id/decision-rights (can_admin_org,
  cross-org 404, 422 vocabulary + one-posture-per-domain, audited
  DECISION_RIGHTS_UPDATED ids+domains only).
- CT: Company Profile "Decision rights" card (safe summary with
  humanized labels — new decision-domains label map, 12 entries,
  compile-time exhaustive; calm per-person editor, exact three-list
  PATCH) · Work Schedule "Your decision rights" read-only posture +
  escalation guidance + the binding copy ("Decision rights help Otzar
  route decisions and avoid overstepping" / "do not grant tool
  access" / "Your AI Twin follows your access and authority
  boundaries").
- Tests: FND decision-rights integration 5/5 + activation-script 6/6;
  unit tier 2989/2989; targeted regression 39/39 (redwood/comms-ingest/
  work-profile/twin/password). CT 2240/2240 across 209; typecheck 0 ·
  lint 0 · build ✓ · dev 200 · install ✓.
- Docs: runbook §6e · gap ledger X · Redwood Atlas README
  real-vs-simulated updated. **Next (own GO required): Block 3B —
  speech-act + source/authority/agreement lineage persisted at ingest;
  then 3C truth-weight retrieval + Twin-boundary lock on live
  surfaces.**
- Ops note: cloud-sync corruption recurred mid-slice (" 2" duplicate
  files in both repos incl. a null CT ref `origin/main 2` and a
  duplicated `.git/index 2`) — swept by explicit filename, fsck clean
  both repos; pre-commit sweeps held (no duplicate ever committed).

## ✅ REDWOOD-ATLAS · Communication-lineage doctrine + simulation harness · SHIPPED (2026-07-06, Fable 5)

**HEADs:** FND `main` = `9c7c852` (PR #575 squash on green 5/5 — harness
authored pre-crash as local `c9be947`, pushed/merged post-recovery) ·
CT `main` = `df122dc` (doctrine README pointer, direct-push, live).

- **BINDING doctrine** (CT `docs/otzar/simulation/redwood-atlas/README.md`):
  communication performs organizational work — truth weight = decision
  rights + communication act + source lineage + currentness,
  context-aware; NEVER newest-document-wins, NEVER hierarchy-always-wins.
- FND fixtures `tests/fixtures/redwood-atlas/`: `corpus.json` — 48
  artifacts across 8 weeks (21 meeting transcripts + statement-level call
  notes, chats, email threads, seeded google-doc simulations); every
  statement carries WHO said WHAT at WHAT TIME in WHAT role as WHICH
  communication act (16-act vocabulary, all 16 exercised);
  `authority_basis` on every internal decision/approval/assignment
  resolving into owns/can_approve rights; out-of-authority commitments
  flagged `exceeds_authority`; supersession lineage explicit.
  `people.json` (8 people + decision rights, PT/MT/ET/CT) · `clients.json`
  (3, seeded conflicts) · `expected-behavior-matrix.json` (44 BINDING
  checks — the final test fails if any check id goes unexecuted).
- Harness `tests/integration/redwood-atlas-simulation.test.ts` (15/15
  green): corpus integrity incl. "no decision without decision rights" +
  currentness-beats-recency; the PRODUCTION `computeDecisionRights` engine
  resolves all 8 binding conflict patterns (approved date actionable /
  stale target never; sales-vs-scope blocks + escalates to the scope
  owner; client request is not policy; "ship Friday" aspirational against
  the engineering owner's evidence; policy outranks the CEO; routing
  follows the latest valid assignment; expertise alone never finalizes);
  the PRODUCTION scheduling engine (local-words conflicts, per-person
  lunch, weekend refusal, conforming alternative, proposal-only connector
  truth).
- **Real vs simulated:** the decision-rights + scheduling engines are REAL
  production code exercised by the harness; Redwood Atlas Studio (org,
  people, clients, corpus) is SIMULATED fixture data; google-doc artifacts
  are seeded simulations (no Google connector exists). No production code
  changes; NO schema; no deploy needed (test/fixture-only); no production
  mutation.
- **Open:** speech-act metadata not yet on runtime ingestion; source /
  authority / agreement lineage not persisted on live rows; hierarchy +
  role-access + Twin access boundaries unbuilt → Block 3 (pre-code plan
  next, no implementation without GO).

## ✅ ORG-SUBSTRATE · Org/person timezones + scheduling policy + company surfaces · LIVE-VERIFIED (2026-07-06, Fable 5)

**HEADs:** FND `main` = `7be24fa` (PR #574 squash on green 5/5, live —
`/org/operating-profile` + `/org/me/work-profile` answer 401 unauthed,
not 404) · CT `main` = `c7c47e8` (direct-push, live — bundle
`index-cbuAuRtw.js` carries "Work Schedule" + "never claims it created
an event").

- **ZERO schema:** timezones live on EntityProfile (existing column) —
  the ORG entity carries the org timezone; each person their own.
  GET/PATCH `/org/operating-profile` (read: any member; write: admin,
  audited) · GET/PATCH `/org/me/work-profile` (SELF-scoped — a person
  sets their own timezone without admin help; audited
  WORK_PROFILE_UPDATED). IANA validation via Intl.
- `scheduling-policy.service.ts`: PURE deterministic engine — default
  working hours 09:00–17:30 Mon–Fri, lunch/protected 12:00–13:00 local;
  `evaluateMeetingProposal` renders every attendee's LOCAL
  timezone-labeled time, names conflicts per person in human words
  (outside working hours / during their lunch block / not a working day),
  proposes a conforming same-day alternative. PROPOSAL-ONLY BY DOCTRINE:
  engine + routes state that creating events requires a connected
  calendar, which does not exist (Google Calendar = OAuth descriptor
  only — verified). Per-person working-hours STORAGE deliberately future
  (schema); the engine takes per-attendee overrides so fixtures and
  future storage plug in unchanged.
- CT: `/setup/company-profile` (admin, linked from /setup — org timezone
  saves through the operating-profile rail; defaults stated honestly
  "not configurable in-product yet"; calendar doctrine copy) ·
  `/app/work-schedule` (employee More nav beside Account & Security —
  YOUR timezone, "yours to set, not your admin's") ·
  `api.org.operatingProfile` + `api.org.me.workProfile` · audit label
  "Work Profile Updated".
- Tests: FND `work-profile.test.ts` 3/3; CT suite 2236/2236 across 208
  (work-profile-pages +2, no-overclaim sweep). No production mutation
  (post-crash recovery probes were read-only GETs; no live writes).

## ✅ PASSWORD-LIFECYCLE · Change / forgot / admin reset · LIVE-VERIFIED (2026-07-06, Fable 5)

**HEADs:** FND `main` = `28ad701` (PR #573 squash on green 5/5, live) ·
CT `main` = `8304543` (direct-push, live — bundle `index-Gn-3jLU6.js`
carries "Forgot password?"). FND suite 3/3 new + activation/email/twin
regression; CT suite 2234/2234 across 207; live smoke 2/2 + read-only
enumeration probe live-verified (unknown email → the safe sentence).

- ONE token rail (PASSWORD_RESET: 1h, one-time, supersedes, /activate
  redeem, all-sessions invalidated). Admins can NEVER see/set passwords.
- POST /auth/change-password (current required; other sessions die,
  current survives; audit PASSWORD_CHANGED). POST /auth/forgot-password
  (public, byte-identical enumeration-safe; distinct reset template via
  the ACT-EMAIL provider; no token burned when unconfigured).
  POST /org/members/:id/password-reset-email (ACTIVE only; pending →
  409 "activation instead"; the purposes never blur).
- CT: Login "Forgot password?" → /forgot-password ·
  /app/account-security ("Account & Security" in employee More nav) ·
  Users "Send password reset" for active rows (copy-link fallback
  stays). Runbook §6d incl. honest lockout rule (5 fails → SUSPENDED;
  reset does NOT unsuspend — reactivate first; self-recovery = future).
- No live password mutation performed (per stop rule).

## ✅ TWIN-BOOTSTRAP · Post-activation starter-Twin guarantee · LIVE-VERIFIED (2026-07-06, Fable 5)

**HEADs:** FND `main` = `ed2d8c5` (PR #572 squash on green 5/5, live) ·
CT `main` = `6b39cfe` (direct-push, live — bundle `index-CGyfqfiV.js`
carries the identity-aware copy). FND twin-bootstrap suite 3/3 +
activation/email regression 11/11; CT suite 2230/2230 across 206;
live journey smoke 2/2.

- **Root cause (live `twin_not_found`):** Twins are minted by Phase-3
  INVITE; bulk-created + email-activated members skip invite → no
  twin. Exactly hypothesis F.
- **Fix on the existing rail:** `ensureStarterTwinForMember` (reuses
  executePhase3Invite: twin + personal wallet + TAR + default-Hive
  join; shell only — no tools/authority/role template) wired NON-
  FATALLY into /auth/activate redemption + admin repair route
  POST /org/members/:id/ensure-twin. Audited
  STARTER_TWIN_PROVISIONED (trigger activation|admin_repair).
- **LIVE REPAIR EXECUTED (authorized, single member):** smoke member
  `lewissadeil@gmail.com` repaired — `created: true`, twin
  `7727d7a1…`; ONE audit row (admin_repair, SUCCESS); idempotent
  repeat `created: false`. Production mutation = exactly this one
  intentional repair.
- CT: My Twin 404 → identity-aware first-run state ("account is
  active… Twin hasn't been prepared… basic help only"); Ask maps
  TWIN_NOT_FOUND to honest prepare-your-twin copy (no "try again").
- **FOUNDER-AUTHORIZED LIVE LOGIN VERIFIED (2026-07-06):** logged in AS
  the smoke member via scripted browser (creds env-only, never
  committed/echoed; env file shredded after) → landed on /app → My
  Twin rendered the REAL twin card → Ask answered org-aware: "Hey
  Smoke! I'm your digital twin here at NIOV Labs. Right now I can help
  you with: …" — zero twin_not_found, zero raw errors, no fake-ready
  claims. Durable spec: otzar-live-starter-member.spec.ts (CT
  `ebb9de7`). The full new-employee journey (invite → email → activate
  → recognized → conversant) is LIVE-PROVEN end to end.

## ✅ ACT-EMAIL-LIVE · First real activation email SENT + verified · (2026-07-06, Fable 5)

**§6b.1 completed end-to-end.** FND `24ca8a8` live · `configured: true`
· sender `Otzar <onboarding@niovlabs.com>` (niovlabs.com verified in
Resend; otzar.ai still unverified — swap FROM back once verified).

- **Exactly one email sent** to the authorized smoke member
  (`lewissadeil@gmail.com`, created under explicit founder GO;
  activation_pending before and after — nobody activated).
- Provider ACCEPTED; response + audit clean: ONE
  ACTIVATION_EMAIL_SENT (SUCCESS, token_id + category only — no
  token/URL/body/password anywhere). 4 historical FAILED rows = the
  honest failure path exercised during provider debugging (key-empty
  saves → sandbox owner-only → unverified domains; each audited once).
- Env-var lesson recorded: Render dashboard saves repeatedly failed to
  land; the working rails are the Render API (non-secret vars, founder-
  authorized) and the founder's local curl for the secret.
- **Founder follow-ups:** click-through activation of the smoke member
  is OPTIONAL (would complete the loop live; the emailed link is valid
  7 days, one-time) · verify otzar.ai in Resend to move FROM to the
  product domain · smoke org + Phase-0/rollback rehearsal ·
  RENDER_API_KEY rotation · 2 stale escalation authorizations.

## ✅ ACT-EMAIL-VERIFY · Provider enablement verification plan · STAGED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `24ca8a8` (live; a same-SHA redeploy occurred
but env NOT yet set — status probe still `configured: false`) · CT
`main` = `de0bbc2` (docs-only, live; bundle unchanged
`index-C6TCURDc.js`).

- **No email sent; no send possible** (`configured: false`); no
  production mutation beyond the docs deploy.
- **Runbook §6b.1 added:** the one-shot controlled live-send procedure
  (pre-conditions → single send → post-send read-only checks →
  failure path). Executable the moment env lands.
- **Read-only recipient scan: ZERO pending-activation members exist
  live** (14 people, all active) — so even at `configured: true` the
  send must be SKIPPED per spec until a safe smoke recipient exists.
  Natural moment: the founder's Phase-0 smoke-org rehearsal (creates a
  smoke member anyway). I will not create a member for this.

## ✅ ACT-EMAIL · Email delivery for activation links · LIVE-VERIFIED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `24ca8a8` (PR #571 squash, live) · CT `main` =
`ff2349f` (direct-push, live — bundle `index-C6TCURDc.js` carries
"Send activation email"). CT suite **2229/2229 across 206**; FND 3/3
new + onboarding-activation regression; live battery 4/4 (read-only).
**NO real email was sent** — the live status endpoint honestly returns
`configured: false` (read-only authenticated probe).

- **Same rail, delivery only:** sending mints a fresh one-time token
  via mintSetupToken (supersedes priors) and emails the /activate
  link. Token ONLY in the link — never logged/audited/returned.
- **Provider abstraction, honest gate:** Resend behind
  ACTIVATION_EMAIL_USE_REAL=1 + RESEND_API_KEY +
  ACTIVATION_EMAIL_FROM (links from CONTROL_TOWER_URL). Missing env →
  refuses BEFORE minting with "Email delivery isn't configured yet —
  copy the activation link instead." "Sent" = provider ACCEPTED;
  delivery/open tracking never claimed.
- Routes (admin_org, org-scoped): status · single send (already-active
  409, cross-org 404) · batch cap 20 with per-row results. Audit:
  ACTIVATION_EMAIL_SENT / ACTIVATION_EMAIL_FAILED (token_id +
  category only; FAILED = ERROR outcome).
- CT: Users row "Send activation email" (non-active only, copy-link
  fallback stays) + CSV result "Send activation emails now" (explicit
  click, exact invited ids). Summary copy now "No email is sent
  automatically…".
- **FOUNDER ACTION to enable live email:** set the three env vars on
  FND `srv-d8t17sm7r5hc73ed5h6g` (runbook §6b) + verified Resend
  sender; until then the product stays honest.

## ✅ DEEP-SMOKE · Customer-experience smoke + scorecard · LIVE-VERIFIED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `87d1bbd` (unchanged, live) · CT `main` =
`a94bef8` (tests/docs only — bundle unchanged `index-D7e5-U-b.js`, live).
**Evidence:** Layer A = CT suite 2227/2227 across 205 (one flake on
first run, clean on rerun); Layer B = FND arc battery 12 suites/48
green; Layer C = live battery **6/6** incl. the NEW employee walk
(vishesh login → /app/my-twin/calibration + writing-style boundaries +
zero file inputs + ambient bar present + zero non-GET writes).
Banned-claims sweep clean (only code-comment negations).

- **Scorecard:** `docs/otzar/OTZAR_DEEP_ONBOARDING_UX_AIX_SMOKE_SCORECARD.md`
  — 16 scenario groups, every rating citing its test/spec proof; all ✅
  with named limitations (no 🔴).
- **Honest friction (named, not repaired):** no email delivery
  (admin-copied activation links — top friction) · seeded-document
  browsing beyond recent/20 = future · non-manager employees see no
  candidate relevance (correct v1 conservatism) · founder-gated
  bootstrap (by design).
- **Verdict held:** first workflow YES · founder-operated controlled
  pilot YES (subject to standing founder actions) · self-serve NO.
- **Recommended next slice: email delivery for activation links.**

## ✅ CONSOLIDATION · Pilot readiness truth pass · LIVE-VERIFIED (2026-07-05, Fable 5) — ARC CLOSED

**HEADs:** FND `main` = `87d1bbd` (unchanged, live) · CT `main` =
`6cad718` (live). CT suite **2227/2227 across 205**; live battery
**5/5** incl. the NEW `otzar-live-pilot-journey.spec.ts` — one
read-only pass over /setup → go-live → data-flow → context-boundaries
→ /retention → seed-corpus → seed-history with coherent governed copy,
no overclaims/raw internals, and ZERO writes across the entire walk.

- **Claim drift fixed:** 4 surfaces + 7 test anchors still said
  "Retention controls are not configurable in-product yet" — all now
  state governed-lifecycle truth (retire with audit preserved; windows/
  deletion honestly not configurable yet).
- **Smoke matrix 23/23:** story 12 upgraded to governed capability;
  9 new arc stories (15–23) each citing real tests.
- **Readiness audit Section A reconciled — the three claims, separate:**
  (1) Ready for first workflow: YES. (2) Controlled founder-operated
  pilot: YES, subject to standing founder actions. (3) Founder-free
  self-serve onboarding: NO (email delivery, org bootstrap, HRIS,
  Slack ingest UI, webhooks, billing all future — and the product's
  own go-live gate says so).
- Setup journey model doc: reconciliation header maps closed findings
  to shipped slices.
- **Standing founder actions (unchanged, not mine to run):** smoke-org
  creation + Phase-0 rehearsal (runbook §6 rollback rehearsal still
  unrun) · RENDER_API_KEY rotation · authorize rejection of 2 stale
  escalations (8fad318b…, ce8fca11…).
- **Gated future:** true deletion/retention windows · broader corpus
  extraction · connector sync · vector/corpus search ·
  conflict-labeling · email delivery · HRIS import · Slack ingest UI.

## ✅ RETENTION · Governed context lifecycle (retire/restore, never delete) · LIVE-VERIFIED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `87d1bbd` (PR #570 squash, live; unauthed
documents/lifecycle probes 401/401) · CT `main` = `3d7b20e`
(direct-push, live — bundle `index-D_sIPZwC.js` carries "Retire from
active use"). CT suite **2227/2227 across 205**; FND 2/2 new + full
context-arc regression 22/22; live smoke 3/3 (read-only).

- **The retention model is real:** POST
  `/work-os/ledger/:id/context-lifecycle` (admin-gated, seeded rows
  only, idempotent, reversible) writes additive
  `details.context_lifecycle` — retire/restore, NEVER delete.
- **Preservation total:** row + capture + audit + lineage + extracted
  reviewed work all survive (work lifecycle ≠ document lifecycle —
  test-locked). **Suppression total:** `isContextRetired` at the AIX-3
  gate removes retired context from candidates + AIX-4/5/6 answers;
  extraction preview refuses (SOURCE_RETIRED).
- Audited once per real change (SEEDED_CONTEXT_RETIRED/RESTORED;
  reason never in audit). New additive audit types + CT labels.
- `/retention`: 3 new lifecycle category rows + the Seeded context
  lifecycle card (GET `/work-os/context/documents` admin list;
  two-step confirm — nothing writes before explicit confirm; restore).
  Context Boundaries: "becoming governed lifecycle controls" + retired
  count. Personal calibration stays employee-revocable only.
- **Deliberately NOT built (stated honestly in copy):** hard delete ·
  purge · legal hold · retention windows · automated expiry ·
  compliance export/deletion.
- Gated future: true deletion/retention-window policy · broader corpus
  extraction · connector sync · vector/corpus search ·
  conflict-labeling.

## ✅ CTX-BOUNDARY · Context Boundaries (admin boundary view) · LIVE-VERIFIED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `a9059c3` (PR #569 squash, live; unauthed route
probe 401) · CT `main` = `37aaa03` (direct-push, live — bundle
`index-BhOMxhgY.js` carries the page + links). CT suite **2224/2224
across 204**; FND 2/2 new; live smoke 3/3 (read-only; /setup renders
the new boundaries pointer clean).

- `/setup/context-boundaries` — "See what company context Otzar has
  been given and how it is governed." A BOUNDARY view, not a librarian
  queue: seven can/cannot groups (seeded history · seeded documents ·
  reviewed extracted work · Twin calibration · writing style · live
  work · external context); zero classify/tag/retire/cleanup asks.
- FND: GET `/work-os/context/boundaries` — manager-gated, read-only,
  tenant-isolated; exact counts for the three ledger-derived groups
  (seeded history via seeded-lineage JSON path, DOCUMENT_CONTEXT count,
  document_extraction_review count) + 3 recent seeded documents as
  AIX-1 labels only. Groups without a safe projection are copy-only on
  purpose (calibration/external counts = documented future).
- Retention stated honestly: "not configurable in-product yet…
  nothing here deletes or archives sources" → links /retention. No
  delete/purge/archive rails built (none exist safely).
- Linked from /setup, /setup/data-flow, /retention.
- Gated future: retention model + archive/retire · broader corpus
  extraction · connector sync · vector/corpus search ·
  conflict-labeling.

## ✅ DOC-EXTRACT · Review-first document extraction · LIVE-VERIFIED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `b2fb92f` (PR #568 squash, live; unauthed route
probe 401 — first probe 404 was a zero-downtime rollout race, resolved) ·
CT `main` = `2cf75d5` (direct-push, live — bundle `index-BaxZA0Hr.js`
carries "Scan for possible work to review"). CT suite **2222/2222
across 203**; FND 3/3 new + CS-5 regression 3/3; live smoke 4/4
(render-only incl. seed-corpus page; NO live extraction — no cleanup
rail, integration-locked instead).

- **CS-5's governed successor.** Lane: PREVIEW-ONLY (Option C) —
  Dandelion approve mints resulting_actions, Review Center is the
  dual-control send lane; both wrong semantics, so candidates are never
  persisted; deterministic re-derivation replaces dedupe tables.
- POST `/otzar/context/extract-preview` — admin_org-gated, explicit
  click only (seeding still extracts nothing — test-locked), READ-ONLY,
  reuses the ONE engine (extractFromCapturedText: structured LLM or
  honest LOCAL_FALLBACK). "Possible action/decision/blocker/owner"
  labels; per-kind cap 3 + overall 8; dedupe; excerpt anchoring to real
  source lines; owner candidates info-only; review promise server-side;
  no UUIDs cross back.
- Approval = the EXISTING work rail: PROPOSED, owned by the approver,
  details {source: document_extraction_review,
  source_document_ledger_id, human_reviewed: true, source_excerpt} —
  real work, no seeded affordances. Rejection = client dismiss, nothing
  persisted.
- CT: seed-corpus done-card gains promise copy + scan button + review
  panel (create/dismiss per candidate, honest empty/failure states).
- Gated future: broader corpus extraction · connector sync ·
  vector/corpus search · conflict-labeling · retention boundary view.

## ✅ AIX-6 · Org-scoped named-subject retrieval · LIVE-VERIFIED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `c188f6f` (PR #567 squash, live) · CT `main` =
`49717ad` (direct-push, live — bundle `index-BPNsCEr1.js` carries the
background-answer wiring). CT suite **2220/2220 across 202**; FND AIX
suite 3/3 new + 19/19 regression; live smoke 3/3 (read-only; unauthed
route probe 401).

- "What do we know about Project Phoenix?" now answers with NO selected
  item: GET `/work-os/context/background-answer` — tight subject
  extraction (deictic subjects → item rail; action phrasings never
  match; vague → honest ask-for-a-name; unresolvable → 422, never a
  guess).
- **Subject fidelity:** ALL significant subject tokens must match —
  "Phoenix" never returns Atlas material.
- Live work leads, permission-scoped like My Work / Team Work
  (employees: party rows only; managers: org-wide). Seeded background
  follows via the new SUBJECT-MODE derivation beside AIX-3's row-mode
  (same pool/suppression/cap — one matcher family), manager-only,
  confirmed-first, AIX-4 contract copy. Confidence ≤ medium.
- Ambient bar recognizer mirrors the extractor exactly; GET-only;
  labeled "Background answer"; no LLM in the path.
- Gated future: extraction/review flow · vector/corpus search ·
  conflict-labeling · retention/corpus boundary view.

## ✅ AIX-5 · Ambient retrieval expansion, narrowly · LIVE-VERIFIED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `55e7938` (PR #566 test-only, live) · CT `main` =
`17c5098` (direct-push, live — bundle `index-B2ba5Mwf.js` carries the
recognizer). CT suite **2218/2218**; FND AIX suite 5/5 (new action-
boundary lock); live smoke 3/3 (read-only).

- Ambient bar answers item-scoped background questions ("What do we
  know about this?" / "Any background on this?" / "Is there historical
  context for this?") by routing them verbatim through the existing
  deictic clarity intercept → clarity-answer route → AIX-4 governed
  retrieval. ZERO new retrieval machinery; no LLM in the path; GET-only.
- Zero-error intent boundary: TERMINAL this/it required — "any
  background on this customer?" / "Project Phoenix" deliberately refuse
  (wrong-subject answers are worse than no answer); bare forms need a
  selected item, else honest "open or select" copy.
- Action boundary test-locked server-side (FND #566): 7 action
  phrasings → no retrieval intent, no seeded mention, no execution
  claim, zero writes.
- Broad ambient/conduct LLM priming remains OFF. Gated future: org-
  scoped named-subject retrieval · extraction/review · vector/corpus
  search · conflict-labeling.

## ✅ AIX-4 · Confidence-aware retrieval + ranking law · LIVE-VERIFIED (2026-07-05, Fable 5) — GAP W CLOSED END-TO-END

**HEADs:** FND `main` = `f53e82a` (PR #565 squash, live) · CT `main` =
`1ef082e` (docs-only on top of `96b9a0d` code, live). FND targeted
integration 4/4 + clarity/AIX regression 14/14; CT gates green (suite
unchanged at 2215/2215 — CT needed NO code); live smoke 3/3 (read-only).

- **First retrieval surface:** the deterministic clarity-answer rail —
  new `WHAT_BACKGROUND` intent ("what do we know / any background / is
  there context"). Broad ambient/conduct priming stays OFF.
- **Ranking law codified:** `CONTEXT_RANKING_LAW` in
  `context-retrieval.service.ts` (live work 1 → suppressed 8; surface
  emits 4–5; every answer LEADS with rank-1 live truth).
- **No second matcher:** retrieval reuses the AIX-3 gate — permissions
  (non-managers: silence, no titles), strong signals, cap 3, AIX-2
  suppression (stale/wrong_scope/contradicted never returns).
- **Contract:** attribution + confidence labels + requires_confirmation
  + `should_not_act: true` on every result; confidence capped at
  medium; no suggested action from this intent ever; a seeded row asked
  about itself explains itself as background.
- **Boundaries:** read-only (audit/capsule/notification/row invariants
  test-locked); no vectors/embeddings/broad search; no action path
  consumes seeded context.
- **Next (each needs its own GO):** broader ambient retrieval ·
  document extraction/review flow · conflict-labeling instead of pure
  suppression · vector/corpus search.

## ✅ AIX-3 · Derived deterministic candidate relevance · LIVE-VERIFIED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `1f24705` (PR #564 squash, live) · CT `main` =
`96b9a0d` (direct-push, live — bundle `index-WIyycxXf.js` carries
"Possible background context"). CT suite **2215/2215**; FND targeted
integration 5/5 + AIX-2/seeded regression 11/11; live smoke 3/3
(read-only).

- **Design decision: DERIVED, not persisted.** Dandelion SEED_APPROVED
  carries operational apply semantics (resulting_action) — persisting
  relevance seeds would make approval fake or truth-promoting. So:
  `context-candidates.service.ts` pure derivation + GET
  `/work-os/ledger/:id/context-candidates`, ZERO writes, no schema,
  computed per view.
- Deterministic signals only: ≥2 shared significant title/summary
  tokens, or internal participant full-name match (external names
  never); covering-period year overlap supporting-only. Noise: one
  candidate per source, ≥1 strong signal, cap 3, most-signals first.
- AIX-2 loop feeds back: stale/wrong_scope/contradicted suppressed;
  confirmed/needs_clarifier surface with labels.
- CT: "Possible background context" block inside opened View/Why
  (non-seeded rows only); each candidate reuses the ONE AIX-2
  affordance (`ContextValidationChoices`, extracted — same copy, same
  route, posted to the seeded SOURCE row). Silence when empty.
- Permissions: pool = ownerless DOCUMENT_CONTEXT ⇒ manager/admin-scoped;
  non-managers get empty, never leaked titles. Retrieval remains OFF.
- **Next:** AIX-4 (confidence-aware retrieval with the live-work-wins
  ranking law) — needs its own explicit GO.

## ✅ AIX-2 · In-context seeded-context validation (first relevance write path) · LIVE-VERIFIED (2026-07-05, Fable 5)

**HEADs:** FND `main` = `a9064d3` (PR #563 squash, live on Render) ·
CT `main` = `0db9572` (direct-push, live — bundle `index-CTI-EPGp.js`
carries the AIX-2 copy). CT suite **2211/2211 across 201 files**;
FND targeted integration 4/4 + seeded regression 7/7; live smoke 3/3
(org-setup + source-lineage, read-only).

- FND: `context-relevance.service.ts` + POST
  `/work-os/ledger/:id/context-validation` — seeded-rows-only,
  party/manager-authorized (ownerless org-wide docs = manager/admin
  only), idempotent, additive `details.context_relevance` JSON
  (state confirmed/stale/wrong_scope/contradicted/needs_clarifier,
  confirmed_by, confirmed_at, ≤280-char note, source
  human_validation, applies_to seeded_context). New additive audit
  event `SEEDED_CONTEXT_VALIDATED` (never carries the note).
  `seededOriginFromDetails` renders labels only
  (validation_state_label + validation_guidance).
- CT: five-choice affordance (Still current / Outdated / Wrong
  context / Conflicts with newer work / Ask someone else) inside the
  opened View/Why on seeded rows ONLY; no write before explicit
  click; honest per-state done copy; honest failure copy; View/Why
  "Validation" row; audit label map entry.
- Boundaries test-locked: no status change, no follow-ups, no
  notifications, no wallet writes, open-work exclusion intact,
  retrieval still OFF. Gap W ledger + AIX model doc mark AIX-2 ✅.
- **Next:** AIX-3 (deterministic candidate relevance via the governed
  suggestion lane) — needs its own explicit GO.

## ✅ PROD-UX-APPROVAL-LOOP · Approver queue UX + Action⇄Escalation reconciliation · LIVE-VERIFIED (2026-07-02, Fable 5)

**The loop closed:** send → "Submitted for approval" (truth copy, never
optimistic "Sent") → approver's Review Center queue (human context: "Second
approval for: Internal note", requester NAME) → approve/reject with reason →
paired Action reconciles → approved sends DELIVER (scheduler/executor) →
sender's Action Center shows "Sent" / "Not approved". **First completed
governed send delivered live** (labeled verification note to Samiksha).

- **Foundation** — PR **#525** merged **`8c10788`** (CI 5/5, deployed,
  behaviorally live-probed): REJECTED mirror block in
  `transitionPendingForCaller` (canonical state-machine guard,
  ACTION_REJECTED audit + `approver_reason` safe scalar, no-op guards);
  reject route accepts plain `reason` (was silently dropped). Unit tier 2918;
  workos-writeback +3, escalation +3.
- **SECURITY FIX** — PR **#526** merged **`9dce631`** (CI 5/5, deployed,
  leak-closed verified live): `GET /org/entities` (list AND detail) returned
  raw entity rows exposing every member's bcrypt `password_hash` to org
  admins. SAFE_ENTITY_SELECT allowlist on both; leak test. Found by this
  slice's live smoke.
- **Control Tower** — `main` **`85237d0`** (commits `084767f` + `31ef3ee` +
  `85237d0`), bundle **`index-tEAqSQ1x.js`**, all copy probes FOUND:
  ProposedActionCard "submitted" truth state; Action Center REJECTED → "Not
  approved"; Review Center deny-reason field + humanized description +
  requester name (live wrapped-shape fix). Suite 2067; +7 unit tests.
- **Live smoke — 3 tests / 12 nuanced scenarios, all PASS**
  (`otzar-live-approval-loop.spec.ts`): approve leg (submitted → mid-flight
  Action Center pending → self-approve 403 + absent from own queue →
  humanized approver context → approve → SUCCEEDED delivery → sender "Sent" →
  queue cleared → verdict finality → ACTION_APPROVED audit); reject leg
  (reason durable on escalation + ACTION_REJECTED audit `approver_reason` →
  Action REJECTED → sender "Not approved", no raw codes → flip-flop refused);
  idempotency (same key → same action, exactly one escalation). Screenshots
  loop-1…7. Org clean (2 pre-existing connector escalations remain, founder
  to disposition).

**Remaining honest:** rejection reason not yet projected on the sender's
/actions list view (lives on the escalation + audit); approver queue badges
count all escalation types; Approved-tab "0" while executor transits quickly.

---

## ✅ P0-ARC-FINAL · Cross-surface verification pass · COMPLETE (2026-07-02, Fable 5)

Founder-directed verification-only pass over the closed A–D arc. CT `main` =
**`eb74128`**. Full record:
`docs/otzar/OTZAR_COMMS_PEOPLE_P0_ARC_FINAL_VERIFICATION.md` (22-check
pass/fail table, six answers, screenshot index).

- **New live suite** `otzar-live-arc-coherence.spec.ts` (C1–C4): ledger
  coherence across My Work/Team Work (same ids, no double count), governed
  send → approver pending queue → verdict, recipient-review org-audit proof,
  employee Action Center raw-code sweep.
- **All core scenarios green live**; smokes hardened from real findings
  (vacuous-navigation bug in the bugb helper — rail labels never matched —
  now genuine + loud; settled-count polling; per-run idempotency keys; 90s
  LLM-ingest timeout). One residual in-sequence nav intermittency documented.
- **FINDING (pinned in C2):** Action⇄Escalation reconciliation gap — the
  approver's verdict does not flip the caller's Action off PROPOSED; the CT
  "Sent" confirmation is optimistic (truth: submitted for approval).
- **Recommended next slice:** approver/admin queue UX + Action⇄Escalation
  reconciliation (completes the loop the dual-control fix opened; unblocks
  the demo's completed send). Runner-up: project/workspace assignment from
  People & Collaboration.
- Cleanup: pending follow-ups 0; all smoke escalations approver-rejected; 2
  pre-existing INVOKE_CONNECTOR escalations left for founder disposition.

---

## ✅ PROD-UX-BUGD · Connectedness truth + dual-control regression fix · LIVE-VERIFIED (2026-07-02, Fable 5)

**The bug:** People & Collaboration said org members "aren't connected to any
project or workspace yet" — technically true for project membership, but read
as *disconnected from the org* for people who already had a manager, team, and
hierarchy. Trust-breaking flattening.

- **Foundation** — PR **#524** squash-merged as **`8e3423b`** (commit
  `b3e6be9`), CI 5/5, deployed (live copy flipped). Kind
  `CONNECT_TEAMMATE`→`NEEDS_PROJECT_OR_WORKSPACE`; pure copy helper ("X is
  already part of your organization on M's team / in DEPT, but isn't assigned
  to a project or workspace yet…"); structured `context` per recommendation
  (person_entity_id · org_member · has_department · has_manager ·
  has_project_or_workspace · missing_connection_type), each fact from its
  canonical store; signal renamed `members_without_project_count`. Unit tier
  2915; dandelion + dual-control integration green.
- **REGRESSION FIX (exposed by BUGD's manager-edge fixture — the real cause of
  the live "no approver" send rejections):** `resolveDualControlTarget` Class B
  took the highest-hierarchy_level membership as "the org" → with manager
  edges that's the caller's MANAGER → `NO_ELIGIBLE_TARGET` for everyone with a
  manager. Fixed to the canonical COMPANY resolver (`getOrgEntityId`) +
  regression test. **Live-proven:** vishesh's send now returns `PROPOSED` +
  escalation to the org admin (was 503); approver reject flow works. Memory
  `project_demo_org_no_approver` updated to RESOLVED.
- **Control Tower** — `main` **`7e44e09`** (+ smoke/docs `f80d106`). Type
  mirror; stable person-id keying for hiding; control relabeled **"Hide for
  now"** (session-local — honest; durable dismiss remains unbuilt). Gates:
  typecheck 0 · lint 0 · build ✓ · tests **2062** (+2). Deployed: bundle
  `index-D3gweUg-.js` → **`index-l51ZNusG.js`**.
- **Live smoke — FIVE scenarios, all PASS** (`otzar-live-bugd-connectedness`):
  S1 API copy+context truth · S2 admin UI renders accurately (screenshot;
  admin login ~5s → admin shell; /app/collaboration via pushState+popstate to
  keep the in-memory session) · S3 hide returns on remount (honestly
  session-local) · S4 employee isolation (no card, no disconnection language)
  · S5 managed employee's send queues for approval + governed approver-reject
  cleanup. Screenshots: bugd-1-admin-people-collab / bugd-2-after-hide /
  bugd-3-employee-people.

**Comms/People P0 arc (BUGS A–E) is fully closed.** Remaining honest:
durable (server-side) recommendation dismiss unbuilt; correction-memory
learn-loop still not wired into ingest (TODO markers); future gap categories
(NEEDS_MANAGER / NEEDS_DEPARTMENT / NEEDS_AI_TWIN / NEEDS_ROLE_TOOLS)
structured-for but deliberately not built.

---

## ✅ PROD-UX-BUGC · Recipient review completion · LIVE-VERIFIED (2026-07-02, Fable 5)

**The bug:** a blocked recipient review (outside-context / ambiguous /
cross-team) left the caller stuck — the card explained the block but offered no
way to complete the review, and nothing persisted.

**Governance rule (founder-ratified):** confirm unlocks `out_of_scope`/`likely`
(caller vouches — distinct `caller_confirmed` proof source, audited); select
resolves `ambiguous` via server-supplied id-based `select_candidates`;
`unauthorized`/`cross_team_needs_approval` are NEVER caller-overridable (honest
copy, API 403, no fake approval completion).

- **Foundation** — PR **#523** squash-merged as **`d280cfc`** (commits
  `9a47e8b` + `9165172`), CI 5/5. `resolveFollowUpRecipient` +
  `POST /work-os/comms/follow-ups/:id/resolve-recipient` + `caller_confirmed`
  EvidenceSource + `select_candidates` on the projection (identity stays
  server-side/id-based — `/org/entities` is admin-gated; names never resolve
  identity). Audit `ADMIN_ACTION`/`FOLLOW_UP_RECIPIENT_RESOLVED`, pointer on
  the row. 17 unit + 1 real-DB integration. Deployed (route 404→401); live
  probes: unauth 401 · invalid/missing decision 422 human copy · missing row
  404. Learn-loop honestly deferred (ingest doesn't load corrections; TODO).
- **Control Tower** — `main` **`fcb2a2a`**. `resolveCommsFollowUpRecipient`;
  `RecipientReviewActions` per the matrix; reload-on-success; "You confirmed
  this recipient" provenance; server (human) failure copy. Gates: typecheck 0 ·
  lint 0 · build ✓ · tests **2060** (+8). Deployed: bundle
  `index-3mI39i9q.js` → **`index-D3gweUg-.js`**; content probes all FOUND.
- **Live smoke** (`otzar-live-bugc-recipient-review.spec.ts`, PASS, org clean):
  real out_of_scope + cross-team fixtures via product API → API 403
  APPROVAL_REQUIRED on the boundary → UI Confirm → row flips to
  confirmed/caller_confirmed (server-verified) → leave/return → decision
  persists, Send unlocked → boundary card untouched, no override affordance →
  cleanup to 0. Screenshots: bugc-1-blocked / bugc-2-confirmed /
  bugc-3-after-nav-still-confirmed.

**Next:** BUG D (People & Collaboration connectedness copy — FND
`dandelionOrgGrowth` copy + durable dismiss).

---

## ✅ PROD-UX-BUGB · Durable Comms follow-up recovery · LIVE-VERIFIED (2026-07-02, Fable 5)

**The bug:** Comms follow-up send-cards rendered from the volatile ingest
response, so they vanished when a customer left Comms and came back — even
though the extracted work was already durable.

**Fix (single store = Work Ledger; ZERO schema migration).** The durable home is
a `FOLLOW_UP` `WorkLedgerEntry` (already a first-class `ledger_type`), NOT a new
`MeetingCapture` column (that earlier proposal was retracted — it would have been
the forbidden second follow-up store per the data-flow contract).

- **Foundation** — PR **#522**, squash-merged to `main` as **`85fdfbe`**
  (branch `prod-ux-bugb-followup-durable`, commit `5b8a77e`). Ingest persists
  each `suggested_action` as a FOLLOW_UP row (`conversation_id` = capture,
  owner/requester = caller, full send-card under `details.follow_up`,
  `next_action` set); `getPendingFollowUps` projection + route
  `GET /work-os/comms/follow-ups`; FOLLOW_UP stays first-class caller-owned work
  (no exclusion from My Work — the 2 execution-proof tests proved it belongs).
  CI: Typecheck / Unit 371 / Integration 111 / Elixir / Python all green.
  Deployed (route 404→401→authed `ok:true`).
- **Control Tower** — `main` **`0e584a6`** (branch `prod-ux-bugb-comms-reload`).
  `api.workOs.commsPendingFollowUps()`; Comms loads durable follow-ups on mount +
  after ingest and renders them in a top-level "Follow-ups waiting for you"
  section (all phases → survives navigation); send→EXECUTED (keeps audit
  confirmation, drops on reload), dismiss→CANCELLED (removed), failed send stays
  DRAFT/recoverable; outside-context review renders from the durable payload.
  Gates: typecheck 0 · lint 0 · build ✓ · tests **2052** (comms-page +6 BUG B).
  Deployed: bundle `index-BDEIvZ4l.js` → **`index-3mI39i9q.js`**.
- **Live smoke** (`otzar-live-bugb-followup-durable.spec.ts`, vishesh on
  app.otzar.ai, PASS, org left clean): ingest → cards appear → leave Comms →
  return → **cards still there** → My Work shows the FOLLOW_UP (authed API) →
  attempt Send → dismiss → row CANCELLED, stays gone after navigation.
  **Send finding:** the governed pipeline REJECTS the send in vishesh's org
  (`DUAL_CONTROL_NO_APPROVER_AVAILABLE` — no eligible approver configured), so
  the card stays DRAFT/recoverable (criterion 5, live). The send→EXECUTED happy
  path is unit-verified; to demo a completed send an approver / low-risk
  auto-approve must be configured. See memory `project_demo_org_no_approver`.

**Docs:** `OTZAR_COMMS_INGESTION_ETL_REPAIR.md` (design corrected + retraction),
`OTZAR_PAGE_PROJECTION_MATRIX.md` (Comms ✅), `OTZAR_AGENTIC_DATA_FLOW_CONTRACT.md`
(rule 1 updated). **Next:** BUG C (recipient-review completion — now unblocked by
B's durable cards), then BUG D (People "not connected" copy).

---

## ✅ PROD-UX-AMBIENT third pass · CLOSED-pending-live-verify (2026-07-01, Fable 5 session)

**Cross-repo HEADs at this closeout:**
- Control Tower `main`: `42c3ec2` (pushed → Render deploy in flight)
- Foundation `main`: `e8017eb` (PR #517); **PR #518 (P0R routing projection)
  all-5-CI-green, awaiting founder squash-merge** — agent self-merge is
  permission-blocked. Merge it to light up the live P0R lane assertion (UX-3).

**What landed this pass (all Fable 5, adopted prior-session work re-verified
line-by-line + tests written where the prior session had none):**
- `7a13fe8` P0G browser server-STT fallback + P0H draggable orb (+46 unit tests
  the prior session skipped: `stt-path` 23, `orb-position` 23)
- `682027d` P0R CT surface: routing lane chip + View/Why routing block (13 tests)
- `db3e01f` P0F Tools & Connections: SlackWriteSetupCard (UI registration of the
  Slice-F SLACK_WRITE binding), connector-error-copy wired, human copy pass
- `23cdc97` P2 copy gate: owner-name guard wired into Comms, dead
  `/admin/connector-rails` button fixed → `/tools-connections`, leak-gate test
- `4d3edeb` P1: AITeammates human mapping; Members renders `/org/hierarchy`
  (Role/Department/Reports-to)
- `bae8580` lint-gate hygiene (presenceRing → `lib/ambient/presence-ring.ts`,
  bucketFor → `lib/work-os/work-buckets.ts`)
- `4404c89` ux-coherence live smoke (8 scenarios, UX-1..8, honest skips)

**Gates at closeout:** typecheck 0 · lint 0/0 · vitest **176 files / 2011
tests** green · build OK · dev 200 · install clean. FND: routing-decision 31
unit tests + apps/api tsc clean + PR CI 5/5.

**Open items:** (1) founder merges FND PR #518 → Foundation deploy → rerun
`npm run test:e2e:live:workos:ux-coherence` (UX-3 stops skipping);
(2) live ux-coherence + deep Work OS suite runs against app.otzar.ai after the
Render deploy lands (creds: DEMO_SHARED_PASSWORD);
(3) FND untracked strays left untouched: `docs/live5-latest-sanitized-result.tmp.md`,
`scripts/repair-live-demo-twins.ts` (LIVE-5 artifacts — founder to keep or drop).

---

## 🔧 Foundation 12C.0 batch — STATUS UPDATE (2026-05-28)

Cross-repo planning round (`[ADMIN-RECONCILIATION-AND-12C0-FOUNDATION-BATCH-PLANNING-QLOCK]`)
verified that **all four 12C.0 Foundation backend items are LIVE** on
Foundation at HEAD `c56bd5764eb23d3b762b84b672c6d3bb26c37fcf` per Rule 0
file:line evidence. The "Section 12C — NEXT" / "12C.0 Foundation
extension batch (queued)" content at ~L468–478 of this file is
**stale** for items (a)(b)(c)(d). Item (e) cross-wallet capsules +
member-consent remains queued (ADR-first; not yet implemented).

**Foundation 12C.0 D1–D4 — LIVE at HEAD `c56bd57`:**

- **D1 — `DELETE /api/v1/org/ai-teammates/:id/skills/:packageId`** at
  `apps/api/src/routes/org.routes.ts:1877` ("12C.0 (Item 1)" comment
  marker); response `{ ok: true, audit_event_id }`; audit emits
  `ADMIN_ACTION details.action="TWIN_SKILL_REMOVED"` at L1973.
  Integration: `tests/integration/audit-event-id-surfacing.test.ts:563-626`.
  → Closes 12B.3 Q5 RemoveSkillButton deferral on Foundation side.
- **D2 — `PATCH /api/v1/org/entities/:id` returns `audit_event_id`**
  at `apps/api/src/routes/org.routes.ts:585-676` (response shape at
  L673; "Closes the last sentinel" comment at L654); audit emits
  `ADMIN_ACTION details.action="ORG_ENTITY_UPDATE"`. → Closes the
  `"pending-foundation-extension"` sentinel on the Foundation side.
- **D3 — `GET /api/v1/org/audit?event_type=&actor_entity_id=&target_entity_id=`**
  server-side filters at `apps/api/src/routes/org.routes.ts:1020-1100+`
  ("12C.0 (Item 3) added 3 optional filters" at L1023); filters
  AND-narrow within org-scope (never widen); `event_type` validated
  against `AUDIT_EVENT_TYPE_VALUES` (51 literals); UUIDs validated
  at the route layer. Integration:
  `tests/integration/admin-routes.test.ts:483-619` (5 cases incl.
  cross-org leak guard at L596 "DRIFT 9").
- **D4 — `GET /api/v1/org/permissions?bridge_id=`** server-side
  filter at `apps/api/src/routes/org.routes.ts:915-985+` ("12C.0
  (Item 4) added optional ?bridge_id= filter" at L918); AND-narrows
  within org-scope; never widens. Integration:
  `tests/integration/admin-routes.test.ts:629+`.

**Remaining 12C.0 work is Control Tower consumer migration** (Lane B
of the planning packet) — separate CT-side feature branches:

- **B1**: `api.org.aiTeammates.removeSkill(twinId, packageId)` client
  method + audit-list JSDoc refresh at `src/lib/api.ts` (currently
  carries stale "ignores `event_type` and `actor_entity_id`" at L469).
- **B2**: `RemoveSkillButton` wired into
  `src/components/ai-teammates/TwinDetailDrawer.tsx` Skills tab.
- **B3**: Migrate audit consumers to pass server-side filters:
  - `src/components/ai-teammates/TwinDetailDrawer.tsx:236` (currently
    "Decision #23: client-side actor_entity_id filter until 12D"
    — Foundation has extended; remove client-side filter)
  - `src/components/users/MemberDetailDrawer.tsx:141` (same)
  - `src/pages/Home.tsx` recent-activity surface (if applicable)
- **B4**: Migrate `src/components/access-control/BridgeDetailDrawer.tsx:20-21`
  to pass `bridge_id` server-side; remove client-side filter.
- **B5**: Sentinel sweep — no remaining `"pending-foundation-extension"`
  strings in `src/**`.
- **B6**: Update CT MSW handlers to honor `?event_type=`,
  `?actor_entity_id=`, `?bridge_id=` filtering.

**Item (e) cross-wallet capsules + member-consent** remains queued
and is **ADR-first**, not implementation-ready. Patent-relevant claim
per L475 of the legacy 12C-NEXT section below. Forward-queued QLOCK:
`[ADR-0056-CROSS-WALLET-MEMBER-CONSENT-WRITE-AND-ACCEPT-AUTH]`.

**Cross-repo HEAD summary (current):**

| Repo | Branch | HEAD | Status |
|---|---|---|---|
| niov-foundation | main | `c56bd5764eb23d3b762b84b672c6d3bb26c37fcf` | Wave 2C + 12C.0 D1-D4 live |
| otzar-control-tower | main | `d0c9bcb6294ce1b9f126bb1400416780d42c7f36` | Wave 2C UI live; 12C.0 consumer migration pending |

**Substrate-honest correction surfaced in this planning round**
(RULE 13):

1. **ADR-0050 BG.2 is LIVE** (not "missing" — prior master audit
   was wrong); `apps/api/src/middleware/dual-control.middleware.ts:454`
   calls `markBreakGlassUsed`; ADR-0050 Status: Accepted 2026-05-22.
2. **12C.0 D1-D4 backend is LIVE** on Foundation (not "queued" — the
   legacy 12C-NEXT block at L468–478 below is stale for those four
   items).
3. **GAP-C1 self-approval block is CLOSED** at service tier
   (`apps/api/src/services/governance/escalation.service.ts:397`);
   **Phase E target-resolution remains OPEN** at L316 (placeholder
   `target_entity_id: callerEntityId`). Risk is **liveness**, not
   self-approval — auto-created PENDING dual-control escalations
   cannot be approved by anyone because GAP-C1 blocks
   caller-as-source and the placeholder collapses other identities
   to caller or null.
4. **GOVSEC.5 phase is CLOSED** per Foundation `docs/CURRENT_BUILD_STATE.md`
   2026-05-28 refresh + commit `3a9cce6`; ADR-0049 GOVSEC umbrella
   remains Proposed (GOVSEC.5 is one of 10 phases). ADR-0050 §BG.3
   carries "GOVSEC.5 remains OPEN" prose that pre-dates `3a9cce6`
   and is now stale; reconciliation queued as separate ADR-0050
   minor-amendment QLOCK.

**Forward-queued QLOCKs (Foundation-side, sequenced):**

- `[ADR-0026-AMENDMENT-1-PHASE-E-TARGET-RESOLUTION-WRITE-AND-ACCEPT-AUTH]`
- Phase E code + tests EXECUTE-VERIFY
- `[CI-NO-LEAK-GUARD-EXECUTE-VERIFY-AUTH]`
- `[ADR-0056-CROSS-WALLET-MEMBER-CONSENT-WRITE-AND-ACCEPT-AUTH]`
- `[ADR-0050-MINOR-AMENDMENT-BG3-RECONCILIATION-WRITE-AND-ACCEPT-AUTH]`

**Control Tower-side queue:** Lane B (B1–B5 above), each on its own
feature branch under the standard CT discipline (typecheck 0 +
lint 0 + tests pass + build pass + dev HTTP 200 → branch → CI →
review-status → squash merge → housekeeping → CONTEXT.md closeout
at top, above this 12C.0 status update).

---

## ✅ Wave 2C — Correction Signals · CLOSED (2026-05-28)

End-to-end across Foundation and Control Tower. An employee can submit a
correction from an active Chat conversation that links to the
`conversation_id`; the Conversation Detail Drawer surfaces a safe,
scoped correction-signals count + last-seen + locked notes for any prior
conversation. Authoritative current `main` for the employee track is
**`d0c9bcb`**.

**1. Foundation — commit + backend contracts**
- `niov-foundation` main: **`c56bd5764eb23d3b762b84b672c6d3bb26c37fcf`** — *Add Otzar correction-to-conversation linkage*
- Foundation Wave 2C shipped: **ADR-0055 — Otzar Correction Signals and
  Drift-Prevention Continuity**, additive nullable
  `MemoryCapsule.conversation_id String? @db.Uuid` with composite index
  `@@index([wallet_id, capsule_type, conversation_id])`,
  `processCorrection` self-scope validation when `conversation_id` is
  provided (backward-compatible when omitted), CORRECTION-capsule
  `conversation_id` persistence, pure `projectConversationCorrections`
  mapper, `getConversationCorrections` service, barrel exports, unit +
  integration tests.
- Contracts consumed by Control Tower:
  - **`POST /api/v1/otzar/correction`** — body now accepts optional
    `conversation_id?: string`. Omitted ⇒ backward-compatible (capsule
    persists with `conversation_id: null`). Valid + caller-owned ⇒
    linkage persisted. Unknown ⇒ `CONVERSATION_NOT_FOUND` (404).
    Cross-caller ⇒ `NOT_CONVERSATION_OWNER` (403).
  - **`GET /api/v1/otzar/conversations/:id/corrections`** — **flat**
    response (fields at top level per ADR-0055 §Decision 5):
    `{ ok: true, conversation_id, corrections_count, has_corrections,
      last_correction_at: string|null, drift_prevention_note,
      continuity_note }`. Notes are LOCKED at the Foundation mapper and
    contain the two required anti-overclaim phrases verbatim.

**2. Control Tower — commit + frontend consumer**
- `otzar-control-tower` main: **`d0c9bcb6294ce1b9f126bb1400416780d42c7f36`** — *Add correction signals UI* (squash of PR #5; parent `0ae4620`)
- Added (8 files):
  - `src/lib/types/foundation.ts` — `CorrectionRequest.conversation_id?`;
    new `ConversationCorrectionsResponse` (flat shape, not nested).
  - `src/lib/api.ts` — `api.otzar.conversations.corrections(id)` →
    `GET /otzar/conversations/${encodeURIComponent(id)}/corrections`.
  - `src/components/employee/ConversationDetailDrawer.tsx` —
    `Correction signals` section with parallel `useQuery`. Renders
    count + last-seen + locked notes when `has_corrections`; "Not
    enough correction history yet." zero state; safe 403/404/generic
    error copy. **Corrections failure does not blank the drawer.**
  - `src/pages/app/Chat.tsx` — inline "Correct this conversation"
    affordance, visible only while `conversationId !== null`. Submits
    `incorrect_description` + `correct_behavior` + active
    `conversation_id`. No `target_capsule_id` exposed. Reset on close.
  - `tests/msw/handlers.ts` — `GET /otzar/conversations/:id/corrections`
    handler with `has_corrections` / zero / 403 / 404 / 500 fixtures;
    extended `otzarCorrectionHandler` with body recorder
    (`getRecordedCorrectionCalls` / `resetRecordedCorrectionCalls`) and
    403/404 self-scope sub-cases.
  - `tests/unit/otzar-api.test.ts` (+3): `correction` omits/includes
    `conversation_id`; `conversations.corrections` path + encoding.
  - `tests/unit/conversation-detail-drawer.test.tsx` (+5):
    has-corrections, zero, 403, 404, 500; renders the two anti-
    overclaim phrases; never renders any of the 12 forbidden fields.
  - `tests/unit/chat.test.tsx` (+2): affordance hidden until a
    conversation is active; submit passes `conversation_id`.
- **`src/pages/app/Corrections.tsx` deliberately UNCHANGED** —
  standalone surface, no conversation context, continues to omit
  `conversation_id`.
- Verification at merge: typecheck 0, lint 0, **test 88 passed / 21
  files**, build pass, install clean, dev HTTP 200. CI `verify` green
  on PR #5.

**3. Safety boundaries preserved**
- No raw correction payloads (`payload_summary`, `payload_content`).
- No `target_capsule_id`, `correction_capsule_id`, `storage_location`,
  `content_hash`, vectors, or embeddings rendered.
- No `employee_score`, `drift_score`, `manager_visibility`, or
  `best_practice_learned` fields rendered.
- No transcript UI, no raw message replay, no full conversation history.
- No surveillance / manager-monitoring / org-wide-aggregation framing.
- The Foundation mapper locks `drift_prevention_note` and
  `continuity_note`; the consumer renders them as-is, and the locked
  prose already contains the verbatim phrases **"This does not expose
  raw messages."** and **"This is not an employee score."**

**4. Safe to claim now**
- Otzar supports **safe correction-to-conversation linkage end-to-end**.
- Employees can submit a correction from an active Chat conversation;
  Control Tower passes `conversation_id` automatically.
- Foundation persists correction signals scoped to the caller-owned
  conversation.
- The Conversation Detail Drawer can show correction-signal count,
  last-correction relative time, the drift-prevention note, and the
  continuity note.
- The feature is governed — no raw messages, transcripts, correction
  payloads, capsule IDs, vectors, scores, manager visibility, or
  org-wide analytics are exposed.
- Corrections help the Twin prioritize future context within scope.

**5. Still NOT safe to claim**
- "best practice learned" / behavior permanently fixed
- autonomous drift prevention / full drift detection
- employee scoring / manager monitoring
- org-wide correction analytics
- raw transcript replay / raw message replay
- listener execution is live
- MCP / connectors are live
- hives / team collaboration is live
- Agent Playground is live
- autonomous execution is live
- enterprise reporting is complete
- billing / entitlements are complete
- full audit viewer is complete

**6. Founder directive** — see the **🚨 FOUNDER DIRECTIVE (2026-05-28)**
section above. Wave 2C is the second real-content surface of the
**Employee Intelligence Core** required production section. The next
authorization is the production go-live master gap audit, not a fresh
wave.

**Housekeeping (done):** Foundation + Control Tower Wave 2C feature
branches deleted locally and remotely; Foundation main synced at
`c56bd57`; Control Tower main synced at `d0c9bcb`; both working trees
clean; `AGENTS.md` and `CONTEXT.md` remain untracked in Control Tower
and were untouched during build operations.

---

## ✅ Wave 2B — Conversation Look-back · CLOSED (2026-05-27)

End-to-end across Foundation and Control Tower. An employee can open a prior
conversation and see a safe, self-scoped look-back. Authoritative current
`main` for the employee track is **`0ae4620`**.

**1. Date:** 2026-05-27

**2. Wave:** Wave 2B — Conversation Look-back (safe scoped continuity surfacing)

**3. Foundation — commit + exact backend contract**
- `niov-foundation` main: **`1ffa01d98e1842cc7a2f8123f8a7b9c2c277a68b`** — *Add Otzar conversation look-back detail*
- Contract: **`GET /api/v1/otzar/conversations/:id`** (Bearer, self-scoped)
  - Success `{ ok: true, conversation }` where `conversation` =
    `conversation_id, twin_id, source_type, status, started_at, closed_at,
    message_count, summary, topics[], summary_available, summary_capsule_id,
    detail_availability, transparency_available:false, continuity_note`
  - `detail_availability` ∈ `SUMMARY_AVAILABLE | NO_SUMMARY_YET | ACTIVE_NOT_CLOSED`
  - Errors: `404 CONVERSATION_NOT_FOUND`, `403 NOT_CONVERSATION_OWNER`
  - Foundation shipped: ADR-0054, additive `summary_capsule_id` on
    `OtzarConversation`, `closeConversation`/`degradedClose` setting it, a pure
    `projectConversationDetail` mapper, `getConversationDetail` service, the
    route, barrel exports, unit + integration tests. No transcript persistence,
    no raw message replay, no fake retrospective transparency, no fake
    `corrections_count`, no raw internals exposed.

**4. Control Tower — commit + exact frontend consumer**
- `otzar-control-tower` main: **`0ae4620c5b10f8bd29af6fcf16f149d0601fce98`** — *Add conversation look-back UI* (squash of PR #4; parent `537bfe9`)
- Added (8 files):
  - `src/lib/types/foundation.ts` — `ConversationDetailAvailability`,
    `ConversationDetail`, `ConversationDetailResponse`
  - `src/lib/api.ts` — `api.otzar.conversations.detail(conversationId)`
    (`GET /otzar/conversations/${encodeURIComponent(id)}`)
  - `src/components/employee/ConversationDetailDrawer.tsx` — right-side Sheet,
    fetches on open, per-availability + 403/404/generic states
  - `src/pages/app/Conversations.tsx` — list rows are now accessible buttons
    that open the drawer (no route change)
  - `tests/msw/handlers.ts` — `:id` fixtures for
    `SUMMARY_AVAILABLE / ACTIVE_NOT_CLOSED / NO_SUMMARY_YET / 403 / 404 / 500`
  - `tests/unit/otzar-api.test.ts` — `conversations.detail` path + encoding
  - `tests/unit/conversations.test.tsx` — list row → drawer open-detail
  - `tests/unit/conversation-detail-drawer.test.tsx` — state-matrix (6 states)
- Verification at merge: typecheck 0, lint 0, **test 79 passed / 21 files**,
  build pass, install clean. CI `verify` green on PR #4.

**5. Safety boundaries preserved**
- No transcript UI, no raw message replay, no full conversation history.
- No raw prompts / chain-of-thought / raw context / vectors / embeddings.
- No permission-envelope internals, bridge IDs, capability flags.
- No retrospective transparency history, no corrections count, no listener memory.
- No raw internal IDs rendered; `summary_capsule_id` exists in the type
  contract + MSW fixtures for fidelity but is **never rendered as visible UI**.
- Transcript language bounded to "This is not a transcript." + the existing
  governance notice. `transparency_available` is always `false` (live
  transparency is response-time only, not persisted per conversation).

**6. Safe to claim now**
- Otzar has safe, scoped conversation look-back **end-to-end**.
- Employees can open a prior conversation and view metadata, close summary,
  topics, detail availability, and a continuity note.
- Foundation exposes `GET /api/v1/otzar/conversations/:id`.
- Control Tower consumes it through a right-side drawer.
- The feature is governed and avoids transcript / raw-message exposure.

**7. Still NOT safe to claim**
- transcripts are stored or replayable
- listener execution is live
- MCP / connectors are live
- AI twins coordinate autonomously
- hives / team collaboration is live
- Agent Playground is live
- correction / drift linkage is live
- retrospective transparency history is stored
- enterprise reporting is complete
- full production monetization readiness

**8. Recommended next wave options**
- **A. Wave 2C — Corrections / drift linkage** (consume/expose correction
  signals safely; requires Foundation-first contract per cross-repo discipline)
- **B. Admin/Governance Control Tower rebaseline** (reconcile the stale 12B
  org-admin track table below against current `main`)
- **C. Session/token continuity + live smoke hardening**
- **D. Listener/transcript policy ADR** before any listener implementation

**Housekeeping (done):** Foundation + Control Tower Wave 2B feature branches
deleted locally and remotely; Foundation main synced at `1ffa01d`; Control
Tower main synced at `0ae4620`; both working trees clean; `AGENTS.md` and
`CONTEXT.md` remain untracked in Control Tower.

---

Skim before starting 12C.0 / Section 12C. Updated 2026-05-04 (post 12B closure).

> **⚠️ STALE BELOW for `main` (2026-05-28 marker).** Everything from this
> point onward is the legacy Section 12B operator journal preserved
> verbatim for continuity + audit. Per the "How to read this file"
> subsection at the very top and the two-track disclaimer: cross-repo
> HEAD tables, "12C — NEXT" queued items (items (a)(b)(c)(d) of which
> are LIVE on Foundation — see the **Foundation 12C.0 batch — STATUS
> UPDATE (2026-05-28)** section near the top), architectural inventory
> from before Wave 1, and any phrase implying authoritative current
> state must be treated as **historical only** unless cross-referenced
> by a top-section closeout. Rule 0 ground truth is current code
> with file:line evidence, not the prose below.

## Cross-repo state

| Repo | Branch | HEAD | Tests |
|---|---|---|---|
| niov-foundation | main | `ee4dafb` (TwinDetail read endpoint) | **443 passed + 1 skipped** |
| otzar-control-tower | main | `0a28f90` (Section 12B.4 — CLOSES 12B) | **12 passed** |
| otzar-control-tower | lovable-archive | `2b4c349` | preserved backup |

Reference (read-only design archive): `/Users/genghishameha/Desktop/NIOV Labs/github/otzar-control-tower-lovable-reference/`

## Committed substrate (NEW — read these first)

- **`docs/SECTION_12_DISCIPLINE.md`** — strategic frame for Section 12 sub-boxes 12B.2 → 12F. 28 architectural decisions, customer vocabulary, audit-aware 4-stage spec, primitive inventory, discipline cadence, cross-repo discipline. Plans reference this rather than restate.
- **`CLAUDE.md`** — operational rules for Section 12 in progress. Non-negotiable cadence (pre-flight grep → plan → approve → sequenced build → 6 verifications → alignment review → user-approved commit). Reach-for-these primitive list.
- **`CONTEXT.md`** — this file. Untracked per its purpose.

## Architectural inventory (REACH FOR THESE FIRST)

12B.1 + 12B.2 + 12B.3 + 12B.4 landed the reusable surface every Section 12C-12F screen consumes. Before writing any new component in a screen plan, check this list. If a screen needs a privileged action, use AuditAwareButton — not a fresh component. If it needs a list, use DataTable. If it needs a wallet display, use WalletProvenanceBadge. If it needs an admin-twin indicator, use ExecutiveOverrideBadge. If it needs a Behavior Policy label, use getAutonomyLevelLabel. If it needs a heatmap matrix over schema-honest 3-tuples, reach for PermissionsMatrix's pattern (DataTable-style + MatrixCell + a pure aggregator). If it needs a single-purpose drilldown drawer (no tabs), reach for BridgeDetailDrawer's pattern (distinct from MemberDetailDrawer/TwinDetailDrawer's 4/5-tab pattern).

**Audit-aware UI** (`src/components/audit/`):
- `AuditAwareButton` — 4-stage state machine (subtext → optional confirm → in-flight → success toast w/ clickable audit link)
- `AuditAwareForm` — same 4-stage pattern wrapped around react-hook-form + zod
- `AuditEventTooltip` — small inline subtext + hover description

**Sovereignty** (`src/components/sovereignty/`):
- `WalletProvenanceBadge` — pass `(walletType, entityType)`; variant derivation handled internally
- `DataSovereigntyInline` — page-top "Source: Your enterprise wallet" callout

**Data presentation** (`src/components/data/`):
- `DataTable<T>` — generic 4-state table with URL state via `useSearchParams`, debounced search, `onRetry` prop
- `MatrixCell` — schema-honest 3-tuple cell. **First real consumer at 12B.4** (PermissionsMatrix) — proven across loading/empty/single-bridge/multi-bridge cell renders.

**Bulk actions + utilities** (12B.2 additions):
- `src/components/users/BulkActionsBar.tsx` — Promise.allSettled fan-out, per-item progress, "Retry failed only" CTA. Justified across 12B.2 + 12B.3 + 12B.4 (bulk autonomy / bulk revoke).
- `src/lib/auth/random-password.ts` — `generateRandomPassword()` returning 32 chars from `crypto.getRandomValues()`. Used by `api.org.members.create` to inject placeholder; never displayed/logged/stored.
- `src/lib/utils/relative-time.ts` — `formatRelativeTime(iso)` wrapping date-fns `formatDistanceToNow`. Powers "Last Updated" columns + audit timestamp displays + bridge expires_at displays.

**Member detail composition** (12B.2):
- `src/components/users/MemberDetailDrawer.tsx` — Sheet (side="right") with 5 tabs: Profile · Hierarchy · Recent Audit · Permissions Granted · AI Teammates Owned. Profile tab includes inline `job_title` edit via `AuditAwareForm`. Pattern reusable for entity-scoped drawers needing tabbed surface.

**AI Teammate composition** (12B.3 additions):
- `src/components/ai-teammates/TwinDetailDrawer.tsx` — Sheet (side="right") with 4 tabs (Overview · Activity · Skills · Settings). Single-fetch architecture: ONE TanStack Query against `api.org.aiTeammates.get` returns `TwinDetailResponse`.
- `src/components/ai-teammates/ExecutiveOverrideBadge.tsx` — orange pill + tooltip surfacing admin-twin status. Driven by `TwinConfig.is_admin_twin === true`.
- `src/components/ai-teammates/AssignSkillButton.tsx` — popover-backed AuditAwareButton.
- `src/components/ai-teammates/CreateTwinDialog.tsx` — Dialog wrapping AuditAwareForm. Body shape posted is exactly the 12B.0 contract.
- `src/components/ai-teammates/BulkAutonomyAction.ts` — adapter returning three `BulkAction<string>` entries.

**Access Control composition** (12B.4 additions — bridge-aware substrate):
- `src/lib/access-control/aggregate-matrix.ts` — pure join + 3-tuple aggregation. `aggregateMatrix(permissions, capsules, grantees)` produces `{ rows, columns, cell, retained, droppedCount }`. Schema-honest invariants enforced in pure code: max-scope, OR-of-can_share_forward, distinct(bridge_id) bridge count. Cross-wallet drop-out documented + counted. `MATRIX_TOP_CAPSULE_TYPES = 8` (Q3 ceiling).
- `src/components/access-control/PermissionsMatrix.tsx` — DataTable-style heatmap wrapper around `aggregateMatrix`. **First real consumer of MatrixCell.** Multi-fetch (permissions + capsules + persons + ai-teammates) joined via `useMemo`. Selection model tracks `bridge_ids` (NOT cells, NOT capsule_ids) — bridges are the unit of revocation.
- `src/components/access-control/BridgeDetailDrawer.tsx` — Sheet (side="right") **single-purpose, NO tabs** — distinct from MemberDetail/TwinDetail's 4/5-tab pattern. Use this pattern when the drawer's content is a focused list of items each independently actionable. Header: `"Permission Bridge: {grantee} ← {org}"` + bridge_id truncated to 8 chars + clipboard copy CTA. Per-bridge revoke via AuditAwareButton (real audit_event_id from RevokeResponse).
- `src/components/access-control/GrantPermissionDialog.tsx` — Dialog wrapping AuditAwareForm with **6 fields**. On submit: `capsule_ids.map(id => ({ capsule_id, scope, can_share_forward, duration_type, ...(expires_at ? { expires_at } : {}) }))` produces `capsule_grants[]` per Foundation contract. `write_reason` omitted from body when blank/whitespace (Drift 7). Heterogeneous-bridge collapse pattern documented in JSDoc; **Advanced Grant Mode deferred to 12E Policies** (where per-capsule heterogeneity becomes first-class).

**Shadcn primitives now installed** (`src/components/ui/`):
- 12A: button, card, input, label, badge, separator, skeleton, sonner, tooltip, scroll-area, sheet
- 12B.1: avatar, checkbox, command, dialog, form, popover, radio-group, select, switch, tabs, textarea
- 12B.4 used: textarea (write_reason field), select (scope + duration), command (grantee Combobox)

**API client** (`src/lib/api.ts`):
- `api.org.entities.{ list, get, update }` · `api.org.members.{ create, bulk }` · `api.org.hierarchy.get` · `api.org.onboarding.{ start, invite, reorder, status }` · `api.org.aiTeammates.{ list, get, create, update, getStats, addSkill }` · `api.org.skillPackages.list` · `api.org.hives.list` · `api.org.permissions.list` · **`api.org.capsules.list` (12B.4 NEW — org-wallet-only by Foundation design)** · `api.org.audit.list` · `api.org.analytics`
- `api.cosmp.{ share, revoke }`
- All inherit `ApiResult<T>`. Each method's JSDoc names the Foundation route.

**Type contract** (`src/lib/types/foundation.ts`):
- 11 enums/unions: `EntityType` (6), `EntityStatus`, `WalletType`, `CapsuleType` (20), `AccessScope`, `PermissionLevel` (client-side superset), `DurationType`, `PermissionStatus`, `AuditEventType` (30), `AuditOutcome`, `TwinAutonomyLevel`
- 14 models + ~14 request/response shapes
- 12B.4 additions: **`OrgCapsuleListItem`** (slim 10-field shape returned by GET /org/capsules — 10 fields including `relevance_score` per Foundation route SELECT)

**Label maps** (`Record<T, string>` exhaustiveness):
- `getCapsuleTypeLabel(type)` — 20 entries
- `getEntityTypeLabel(type)` — 6 entries
- `getAuditEventLabel(type)` — 30 entries
- `getAutonomyLevelLabel(level)` — 3 entries (12B.3)
- **`getPermissionScopeLabel(scope)` — 3 entries (12B.4)** · `PERMISSION_SCOPE_LABELS: Record<AccessScope, string>` exactly 3 entries (METADATA_ONLY · SUMMARY · FULL). NONE rendered via hardcoded "No access" copy in MatrixCell, NOT this map (Drift 3).
- **`getDurationTypeLabel(d)` — 6 entries (12B.4)** · `DURATION_TYPE_LABELS: Record<DurationType, string>` exactly 6 entries (NONE → "No access (block)" — Foundation-honest per permission.ts:45-46) · `DURATION_TYPE_DROPDOWN_OPTIONS: readonly DurationType[]` exactly 5 entries (NONE filtered for grant-flow strict sub-domain — UI scope choice, NOT type subset; decision #18 holds) · `DURATION_TYPES_WITH_EXPIRES_AT: ReadonlySet<DurationType>` = {TEMPORARY, SHORT_TERM, LONG_TERM} (Foundation's DURATION_MS-with-fixed-expiry sub-domain).

**Test infrastructure**:
- `tests/msw/handlers.ts` — extended in 12B.4 with `revokeHandler` + `capsulesHandler` + expanded `permissionsHandler` (mixed bridges/scopes/durations + cross-wallet capsule_id fixture for drop-out test). Recorders extended: `getRecordedShareCalls() / resetRecordedShareCalls()` + `getRecordedRevokeCalls() / resetRecordedRevokeCalls()` returning `{ count, lastBody, allBodies }` and `{ count, lastBridgeId, allBridgeIds }` respectively. `GRANTEE_NO_TAR_FIXTURE_ID` exported for fail-path tests.
- `tests/msw/server.ts` — MSW Node server
- `tests/setup.ts` — jest-dom matchers + RTL cleanup + MSW lifecycle + setPointerCapture polyfill (12B.1) + ResizeObserver polyfill (12B.2 — Radix react-use-size needs it) + scrollIntoView polyfill (12B.3 — cmdk Command primitive needs it). **12B.4: no new polyfills needed** — Sheet + Dialog + Combobox + Select + Textarea all covered by existing polyfills.

**Architecture anchor tests** (current floor — do not break, 12 total):
- 12A: api.test.ts (Bearer attach, 401 logout) · auth-guard.test.tsx (redirect, access denied)
- 12B.1: audit-aware-button.test.tsx (4-stage state machine) · data-table.test.tsx (4 states)
- 12B.2: invite-wizard.test.tsx (3-endpoint sequence + password discipline) · home-recent-activity.test.tsx (client-side ADMIN_ACTION filter)
- 12B.3: twin-detail-drawer.test.tsx (single-fetch architecture + is_admin_twin × autonomy_level independence) · create-twin-dialog.test.tsx (12B.0 body shape exact + real audit_event_id surfacing)
- **12B.4: permissions-matrix.test.tsx (top-N column join + cross-wallet drop-out + MatrixCell 3-tuple aggregation invariants) · grant-permission-dialog.test.tsx (capsule_grants[] body shape + write_reason omit-when-blank discipline + GRANTEE_NO_TAR fail-path 12B.0 contract)**

## audit_event_id contract (from 12B.0 + 12B-FOUNDATION skills audit)

Every audit-aware write endpoint on Foundation surfaces `audit_event_id` (snake_case) on its **success** response. Foundation routes that emit but don't yet return it:
- `PATCH /org/entities/:id` — used by Users bulk Suspend/Reactivate + drawer's job_title edit. 12B.2 surfaces sentinel `"pending-foundation-extension"` in the toast pending Foundation extension. **Last remaining sentinel in the codebase** — queued as 12C.0 batch item (b).

**7 endpoints currently surfacing audit_event_id (no change in 12B.4 — POST /cosmp/share + DELETE /cosmp/share/:bridgeId were already counted at 12B.0):**
1. `POST /api/v1/org/members` → ADMIN_ACTION (action=ORG_MEMBER_ADDED) — 12B.0
2. `POST /api/v1/org/onboarding/invite` → ADMIN_ACTION (action=ONBOARDING_INVITE_ACCEPTED) — 12B.0
3. `POST /api/v1/org/ai-teammates` → ADMIN_ACTION (action=TWIN_CREATED) — 12B.0
4. `PATCH /api/v1/org/ai-teammates/:id` → ADMIN_ACTION (action=AI_TEAMMATE_UPDATE) — 12B.0
5. `POST /api/v1/cosmp/share` → PERMISSION_CREATED summary — 12B.0 (consumed by 12B.4 GrantPermissionDialog)
6. `DELETE /api/v1/cosmp/share/:bridgeId` → PERMISSION_REVOKED summary — 12B.0 (consumed by 12B.4 BridgeDetailDrawer + bulk revoke)
7. `POST /api/v1/org/ai-teammates/:id/skills` → ADMIN_ACTION (action=TWIN_SKILLS_ASSIGNED) — Foundation HEAD `ca6e982`

**Failure paths intentionally omit `audit_event_id`** — denied operations still write audit rows server-side for compliance, but client never sees those ids. Test 12 anchors this contract for the GRANTEE_NO_TAR path.

## 12B.2 closed (commit `16bd02d`)

Home extension + Users screen + 3-step Dandelion invite wizard + Section 12 discipline substrate.

## 12B.3 closed (commit `b4f17e2`)

AI Teammates screen + EXECUTIVE_OVERRIDE indicator (driven by `is_admin_twin`, NOT autonomy_level literal) + Skill Package management (lazy popover-gated query — Test 9 anchors no-N+1-from-drawer at runtime). Bulk autonomy via adapter pattern with zero edits to BulkActionsBar.tsx.

## 12B.4 closed (commit `0a28f90`)

Bridge-aware Access Control matrix + 6-step grant dialog + per-bridge + bulk revoke + section close. First real MatrixCell consumer (12B.1 → 12B.4). Single-purpose Sheet drawer pattern (no tabs) added to substrate. Cross-wallet drop-out documented in pure code (aggregate-matrix.ts) and anchored by Test 11. NONE sub-decision resolved Option B: `Record<DurationType, string>` exhaustive at 6 entries (decision #18 holds), `DURATION_TYPE_DROPDOWN_OPTIONS` filters NONE for the grant-flow strict sub-domain — UI scope choice, NOT type subset. Drifts 1 + 7 anchored by Test 12 (capsule_grants[] body shape + write_reason omit-when-blank). Sentinel grep for "pending-foundation-extension" returns ZERO matches in 12B.4 surface (the one remaining sentinel is 12B.2 PATCH /org/entities/:id job_title edit, queued for 12C.0 batch).

## Q1-Q7 + 12B.x resolutions baked in

- **Q1** (12B.0 audit_event_id): DONE
- **Q2** (Phase 2 display): focused slice w/ "View full propagation order" expand
- **Q3** (matrix columns): one column per `capsule_type`; top-8 by frequency; labels via `capsule-types.ts` — DONE in 12B.4
- **Q4** (HIPAA toggle): always show, default off; refine in 12E
- **Q5** (drawers): Sheet side="right" consistent — single-purpose pattern (no tabs) added in 12B.4
- **Q6** (MSW): DONE
- **12B.2 Q1** (audit filter): client-side; 12C extends Foundation
- **12B.2 Q2** (Last Active column): `Entity.updated_at` labeled "Last Updated"
- **12B.2 Q3** (bulk actions): Suspend/Reactivate only; defer Change Role
- **12B.2 C1** (entity_type filter): PERSON only on Users screen
- **12B.2 C2** (cancellation copy): exact approved copy in InviteWizard
- **12B.3 Q1** (Skills tab remove UI): omit; 12C.0 batch
- **12B.3 Q2** (Bulk autonomy change): adapter pattern; zero edits to BulkActionsBar.tsx
- **12B.3 Q3** (Drawer Overview avatar): initials fallback only via shadcn Avatar
- **12B.3 Q4** (`is_admin_invite` gate): always-enabled checkbox
- **12B.3 Q5** (RemoveSkillButton stub): OMITTED; 12C.0 batch
- **12B.4 Drift 1** (capsule_grants[] heterogeneity): collapse-to-one-tuple in dialog UX, map to `capsule_grants[]` on submit. Advanced Grant Mode → 12E
- **12B.4 Drift 2 / NONE sub-decision** (Option B): `Record<DurationType, string>` exhaustive at 6 (decision #18 holds); `DURATION_TYPE_DROPDOWN_OPTIONS` filters NONE for grant-flow sub-domain (UI scope choice, NOT type subset). NONE labeled "No access (block)" per Foundation permission.ts:45-46
- **12B.4 Drift 3** (PermissionLevel client-side superset): `Record<AccessScope, string>` exactly 3 entries; NONE in MatrixCell rendered via hardcoded "No access" copy
- **12B.4 Drift 4** (no power-user wallet toggle): dropped entirely from 12B.4. Cross-wallet capsules + member-consent flow → 12C.0 Foundation extension + 12E Policies
- **12B.4 Drift 5** (no per-bridge GET): client-side `bridge_id` filter against `api.org.permissions.list({ take: 250 })`. 12C.0 Foundation candidate (`?bridge_id=` filter)
- **12B.4 Drift 6** (no embedded capsule_type on Permission): two-fetch + `useMemo` join. Permissions referencing capsule_ids outside `/org/capsules` slice silently dropped from matrix
- **12B.4 Drift 7** (write_reason free-text): surfaced as optional textarea after duration step. Trimmed before serializing; OMITTED from body when blank (NEVER `""`)

## Foundation endpoint surface confirmed wired (no 12B-Foundation work needed)

`GET /org/entities` (with `?type` filter) · `GET /org/entities/:id` · `PATCH /org/entities/:id` · `GET /org/hierarchy` · `POST /org/onboarding/{start,invite,reorder,status}` · `GET /org/ai-teammates` · `GET /org/ai-teammates/:id` · `POST /org/ai-teammates` · `PATCH /org/ai-teammates/:id` · `GET /org/ai-teammates/:id/stats` · `POST /org/ai-teammates/:id/skills` · `GET /org/skill-packages` · `GET /org/hives` · `GET /org/permissions` · **`GET /org/capsules` (12B.4 — org-wallet-only by design)** · `GET /org/audit` · `POST /org/members` · `POST /org/members/bulk` · `POST /cosmp/share` · `DELETE /cosmp/share/:bridgeId`

## Section 12 sub-box progress

- [x] **12A** — scaffolding + auth + 16-screen layout (4 tests, vocabulary-corrected) — `b08881b`
- [x] **12B.0** — Foundation audit_event_id surfacing (439 + 1 tests) — `6151812`
- [x] **12B.1** — frontend foundation lock-in (6 tests) — `9140220`
- [x] **12B.2** — Home extension + Users screen + Section 12 discipline substrate (8 tests) — `16bd02d`
- [x] **12B.3** — AI Teammates screen + EXECUTIVE_OVERRIDE indicator + Skill Package management (10 tests) — `b4f17e2`
- [x] **12B.4** — Access Control matrix bridge-aware with grant/revoke flows (12 tests) — `0a28f90`
- [x] **🎯 SECTION 12B CLOSED** — bridge-aware org-identity + permissioning surface complete

## Section 12C — NEXT

Section 12C is split into two boxes per the cross-repo discipline pattern:

- [ ] **12C.0** — Foundation extension batch (two-commit Foundation-first pattern continues). Lands BEFORE 12C.1.
- [ ] **12C.1** — Playground + Intelligence dashboard frontend. Consumes 12C.0 endpoints.

### 12C.0 Foundation extension batch (queued)

  a. `DELETE /org/ai-teammates/:id/skills/:package_id` — 12B.3 Q5 remove-skill (Skills tab needs this for symmetry with assign)
  b. `PATCH /org/entities/:id` audit_event_id surfacing — eliminates the last `"pending-foundation-extension"` sentinel in the codebase (12B.2 job_title edit + Suspend/Reactivate)
  c. `GET /org/audit` `?event_type=` + `?actor_entity_id=` filters — lifts the 12B.2 decision #23 client-side filter pattern server-side
  d. `GET /org/permissions` `?bridge_id=` filter — lifts the 12B.4 BridgeDetailDrawer client-side filter pattern server-side
  e. **Cross-wallet capsules endpoint + consent-flow architecture** — substantial; patent-relevant claim about Member consent for PERSONAL wallet capsule sharing; 12E Policies consumes this; 12B.4 explicitly deferred-forward
  f. Compound score / patterns / dimensions / vocabulary / external-entities endpoints — 12C.1 Playground + Intelligence dashboard frontend dependencies

### 12C.0 pre-primer architectural questions (USER FLAGGED — resolve before 12C.0 build starts)

These are NOT blocking 12B.4 close. They are open for the 12C.0 primer Q&A bundle:

1. **Glonari scope** — confirm Otzar-only scope for 12C.0 / Section 12 vs any cross-product surface
2. **Compliance tier** — commercial enterprise (current default) vs FedRAMP/IL4-IL6 (changes Foundation extension architecture significantly — auth, audit retention, encryption-at-rest, etc.)
3. **12C.0 sequencing** — right after 12B.4 vs deferred until after 12F (the trade-off is whether to keep moving frontend forward with the one remaining sentinel + the queued client-side filters as known debt, or to clear Foundation debt before the next frontend sub-box)

## Pending architectural anchors for 12C-12F

- **`pending_approvals_count` is stub-0** through 12B-12D. Real source in Section 14 (EscalationRequest table).
- **Sharing rules editor + Advanced Grant Mode (heterogeneous CapsuleGrant per bridge) → Policies (12E)**.
- **Code-split optimization** (chunk-size warning, 683 kB main chunk after 12B.4) → 12F polish.
- **Cross-wallet permissions surface** (12D Security & Audit) — currently silently dropped from Access Control matrix per the patent's three-wallet portability boundary.
