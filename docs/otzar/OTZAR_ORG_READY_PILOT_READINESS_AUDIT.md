# Otzar Org-Ready Pilot Readiness Audit

**Status:** 2026-07-04 (Fable 5). Audit-first, no code changed.
**State at audit:** CT `main` `e41121b` · FND `main` `ef79149` (both live on
Render) · live app `https://app.otzar.ai` · live API `https://api.otzar.ai`.
**Question this answers:** *"What must be true before a real organization can
start using Otzar without the founder babysitting it?"*
**Method:** five parallel evidence sweeps across both repos (onboarding/admin,
ingestion/connectors, twin execution, ambient/voice/notifications, ops/tests)
+ the operational gap ledger, CONTEXT.md, CURRENT_BUILD_STATE.md, and the
T-1→T-4/T-2.5 closeout evidence from this session. Every classification below
is code-grounded (LIVE-USABLE / API-ONLY / INTEGRATION-ONLY / MISSING), not
doc-claimed.

---

## A. Production readiness verdict

**NOT READY for an unattended controlled pilot — but close, and the gap is
narrow and specific.** The honest position:

> Otzar is **demo-ready and founder-operated-pilot-ready today** (a real org
> can use it *with* the founder acting as ops/onboarding). It is **not
> controlled-pilot ready** because of one broken loop and two ops hazards:
> **invited members cannot obtain a working credential** (the onboarding loop
> is severed at the last step), **live smokes mutate the production org**
> (pilot data and smoke residue share a tenant), and **deploys are not gated
> by CI** (a red build can ship). None of these is a big build — they are
> P0-sized slices, not features.

Scale: **Not ready** ▸ *Controlled pilot ready* ▸ Design-partner ready ▸
Production ready. Current: **Not ready**, with controlled-pilot readiness
achievable in one short slice-run (P0 list below — estimated 3–4 slices).
Design-partner readiness additionally needs ambient capture (webhooks),
email/push notifications, and the Slack loop. Production readiness
additionally needs billing, migration/rollback rehearsal, and enterprise
security posture work.

---

## B. P0 blockers before a controlled pilot

**P0-1. Credential delivery — the onboarding loop is severed.**
The invite wizard is real (3 steps, `POST /org/members` →
`/org/onboarding/start` → `/org/onboarding/invite`) and provisions Entity +
Wallet + TAR + twin. But the invitee can never log in: the frontend injects a
random throwaway password it never shows anyone
(`InviteWizardStep1Capture.tsx:11-14`), the backend's real
`activation_credential` is generated and **deliberately not persisted**
(`dandelion.service.ts:643-646`) and **the CT never displays it**
(`InviteWizardStep3Confirm.tsx:99-105` discards it), there is **no email
infrastructure** (SMTP exists only as a catalog descriptor), and
`POST /auth/admin-reset` is a self-declared stub that returns the token in
the response body. **No invited member of a pilot org can ever sign in
without a founder running scripts.** Smallest honest fix: surface the
one-time activation credential to the admin in Step 3 + force
password-change-on-first-login + a working reset path. Email delivery can be
P1.

**P0-2. Production tenant hygiene — smokes and pilots share one org.**
The 46-spec live battery mutates production data (≈41 mutating specs; per-spec
cleanup rails + per-run idempotency keys, no isolated tenant). Documented
residual intermittency exists, and the gap ledger's own R-gap notes live
residue ("old demos, fake names"). A pilot org must never see smoke residue,
and smokes must never touch pilot data. Fix: a dedicated smoke org (hard rule:
smokes authenticate only into it), plus one residue sweep of the current live
org before any pilot user arrives.

**P0-3. Deploy gate — Render ships commits regardless of CI.**
CT CI exists (typecheck/lint/test/build on push + PR) but Render's deploy is
independent of check status; FND `render.yaml` has `autoDeploy: true` while
actual practice is manual API deploys with commitId (this session's rail).
There has already been one P0 auth outage from a silently no-op migration job
(gap ledger G incident note) and one deploy saga where the static site stayed
on an old commit (RENDER_DEPLOY_NOTES). Fix is procedural + small: pick ONE
rail (recommend: keep the manual verified-deploy rail that T-1→T-2.5 used —
merge on green → API deploy with commitId → poll `live <sha>` → smoke),
disable/ignore autoDeploy so it can't race, write it into the deploy notes as
binding, and rotate the expired `RENDER_API_KEY`.

**P0-4. Org bootstrap is founder-gated — acceptable for pilot, must be
scripted and rehearsed.** Org creation is `POST /platform/orgs` behind
`can_admin_niov` + dual control; there is no self-serve signup (correct for a
controlled pilot — the founder creates the org once). P0 requirement is only:
a rehearsed, documented Phase-0 runbook (create org → first admin → verify
login → connect Zoom if used) so day-one setup is an hour, not an
archaeology session.

---

## C. P1 blockers before broader production

1. **No inbound event route exists anywhere** — every connector is
   outbound/pull; nothing arrives ambiently (multi-source audit's structural
   gap). Slack Events webhook is the first target.
2. **Slack loop incomplete:** OAuth connect is live UI; the real
   message-ingest route (`POST /slack/messages/ingest`) has **no CT caller**;
   sends are triple-env-gated off with no write surface. One small slice wires
   ingest into the UI; sends need a product decision.
3. **Email/push/native notifications MISSING** — in-app bell only. Approvals
   and mentions don't reach anyone who isn't polling the dashboard
   (anti-ambient; also blocks invite delivery and password reset by email).
4. **Desktop app is a thin shell** — no tray, no global shortcut, no OS
   notifications; desktop voice depends on recorder→server only. Don't ship
   the DMG to a pilot as "the desktop app" (ledger gap L).
5. **MemoryCapsule `content_hash` is a placeholder**
   (`sha256:placeholder-…`, otzar.service.ts ~1500) — a tamper-evidence gap
   in the memory audit chain.
6. **Role-template authority is cosmetic at runtime** — `skill_packages`
   unwired, `autonomy_default` consumed only at provisioning, enforcement is
   ActionPolicy + dual control (ledger gap G slice 2+).
7. **Manager persona incoherence (CT-side):** FND derives real manager
   authority (hierarchy edges gate Team Work/CE-4B), but CT
   `capabilities.isManager()` is a hardcoded `false` stub while employee nav
   references manager views.
8. **Migration rail codification:** no prisma migrations dir; prod DDL is
   founder-authorized one-off scripts. The hardened canary→apply→verify job
   rail proven in T-3/T-3B should be the codified standard; rollback runbook
   exists but §6 history is empty — rehearse one rollback.
9. **Gmail/Docs ingestion pipelines don't exist** (read providers are
   fixture-first, no email→work path); Notion is a catalog placeholder.
10. **MCP external servers unproven** (local-mock only); real Slack posting
    env-gated off.
11. **Billing/payment provider** — substrate live, provider absent
    (founder-excluded to date).
12. **Voice provider key discipline:** ElevenLabs paths are live but key-gated
    per deployment; older Whisper/Deepgram meeting-capture STT stack is a
    stub (`BLOCKED_BY_KEY`) and copy still says "Whisper" in one hook comment.

---

## D. Strong enough to demo (live-proven, honest)

- **Transcript → governed work loop** (the reference journey): paste/upload →
  extraction → owned commitments/follow-ups/decisions → My Work/Team Work →
  approve/reject with sender-visible rejection reason → audit. Live-smoked
  repeatedly; the strongest thing Otzar does.
- **Approval/Review Center loop** incl. dual control, badge/queue/KPI
  coherence (single query), Action⇄Escalation reconciliation.
- **Clarity chain (CE-1→CE-4):** deictic/contextual ambient routing,
  read-only clarity answers, clarification round-trip, escalation, team
  clarity health.
- **External relationship intelligence (T-1→T-4 + T-2.5):** external context
  on work rows, governed promotion, account grouping, evidence-based dedupe,
  possible-match chooser, manager external exceptions, named external
  identity states. All live-smoked read-only; honest silence where live data
  is empty.
- **Organization Seeding** (grouped queues, review-before-apply, Zoom
  ingest card) and **Zoom ingest** — the one real self-serve external
  connector (after one-time OAuth app registration).
- **Ambient bar** (text + voice in Chromium, selected-work context chips,
  draggable orb, no-noise visibility policy) and **ElevenLabs STT/TTS**
  where the key is configured.
- **Data ownership honesty:** wallet boundary labeling, "company-owned"
  statements, count-invariance-proven no-client-data-in-wallets.
- **Audit surfaces:** per-row source lineage, audit events on every governed
  action, View/Why panels.

## E. Must be described honestly as partial

- **AI Twins:** a governed **draft-and-approve assistant**, not an autonomous
  teammate. Twins propose; a human creates and approves every Action; a cron
  worker executes approved actions; earned-autonomy auto-send is advisory
  code that never fires. Real LLM chat answers; it never acts.
- **Slack:** "connects" = OAuth handshake only. No UI ingest, no ambient
  capture, sends off.
- **Notifications:** in-app only. "Otzar reaches you" is false outside the
  app.
- **Desktop:** a webview wrapper with correct CSP; not an ambient desktop
  presence.
- **Voice-first onboarding:** the Welcome memory flow is a text form; real
  voice lives in the ambient bar/Voice pages.
- **Work Health vs Reports:** both exist shallowly (ledger gap N).
- **Twin readiness:** honest badge (never fake-ready) but "repair" is a
  link-out; skill removal UI missing.
- **Learn-loop:** recipient corrections only; other correction types future.
- **Scenario Studio/Playground:** real pipeline, unclear customer
  positioning (ledger gap O).

## F. Specific next build order

1. **P0-ONBOARD** — activation credential surfaced to admin (one-time view)
   + forced first-login password change + working admin reset. FND-first,
   small; unlocks every other pilot activity.
2. **P0-OPS** — dedicated smoke org + live-org residue sweep + binding
   deploy rail doc (merge-on-green → API deploy → poll live → smoke; kill
   autoDeploy ambiguity) + rotate RENDER_API_KEY. Mostly ops + one doc +
   fixture changes in live specs (auth into smoke org only).
3. **P0-PHASE0 runbook** — scripted org bootstrap rehearsal (create pilot
   org dry-run → delete/park), documented.
4. **P1-NOTIF-EMAIL** — minimal SMTP/email channel for invites, resets, and
   approval notifications (same governance/audit as in-app; no content
   leakage). This also completes P0-ONBOARD's email half.
5. **P1-SLACK-INGEST-UI** — wire the existing real ingest route into CT
   (Organization Seeding / Comms), then the Events webhook as the first
   ambient inbound.
6. **P1-INTEGRITY** — real MemoryCapsule content_hash.
7. Then return to the ledger ranking (K wallet redesign, G slice 2, N
   depth, L desktop) by customer journey, per the standing selection method.

## G. "Do not overclaim" list

Never say, in demos, copy, or sales conversations:

- "Autonomous AI teammates / twins execute work for you" — they draft and
  propose; humans create and approve every action.
- "Auto-send" anything — no auto-send is enabled anywhere, by design.
- "Connects to Slack" — only the OAuth handshake and an un-surfaced admin
  API exist today. Zoom is the connector you may claim (once org-configured).
- "Otzar notifies you" beyond the in-app bell — no email/push/native.
- "Desktop app" / "hands-free" — thin shell; never claim until the live
  HTTPS+key+mic check passes on a real machine (standing rule).
- "Self-serve onboarding" — founder bootstraps orgs; credential delivery is
  P0-open.
- "Verified identity / same person" for externals — only the named states
  (governed/observed/possible/unknown); never merge language.
- "CRM" anything — deliberately not a CRM; no pipeline/deal/account-stage
  vocabulary exists product-wide (test-enforced).
- "SOC2 / enterprise-security ready" — secret handling is disciplined and
  the password_hash leak was found and fixed, but no formal posture exists.
- "All N tests green means production-grade" — CI job labels understate real
  counts; live smokes are manual post-deploy, not CI-gated.

## H. Live smoke checklist for a real org (pilot-day battery)

Run read-only against the pilot org unless marked; anything mutating runs in
the smoke org only.

1. **Deploy truth:** both Render services `live` on the intended SHAs; live
   bundle hash matches CT main; `/api/v1/health` 200.
2. **Auth:** admin login lands on Control Tower; employee login lands on
   `/app`; `requested_operations` clamping verified (employee token gets 403
   on `/org/dandelion/seeds`); password reset round-trip works (post
   P0-ONBOARD).
3. **Onboarding:** invite a test member → credential delivered → first login
   forces password change → twin exists and is honest (`not_configured`
   readiness until templates applied).
4. **Comms loop (smoke org):** paste transcript → owned work appears in My
   Work → follow-up drafted → approver rejects with reason → sender sees
   reason → org left clean.
5. **Clarity:** deictic ask on a selected item returns a read-only answer;
   clarification round-trip; Team Work clarity box coherent with the wire.
6. **External intelligence:** seeds queue honest; chooser wire-shape sweep
   (no emails/ids/enums); Team Work external section absent unless governed
   commitments exist; reads mint no seeds (seed-count byte-identical
   before/after).
7. **Wallet boundary:** Digital Work Wallet states the boundary; Data &
   Knowledge states company ownership; no export affordances.
8. **Zoom (if connected):** recordings list; "isn't connected" copy honest
   when not.
9. **Voice:** Chromium Web Speech dictation works; server STT returns
   transcript (key configured) or honest `VOICE_STT_PROVIDER_NOT_CONFIGURED`;
   TTS preview plays or honest `TTS_NOT_CONFIGURED`.
10. **Notifications:** bell shows real rows; direct-message pointer opens the
    thread; no phantom badges.
11. **Leak sweep (every page visited):** no raw ids/emails/domains/backend
    enums/`password_hash`/route names in any rendered copy or wire response
    (the T-2.5/T-4 sweep patterns).
12. **Residue proof:** smoke-org fixtures archived; pilot org row counts
    unchanged by the battery; screenshots captured to `screenshots/`.

---

## Detailed findings by area (1–12)

### 1. Onboarding — 🔴 the P0 area
Invite wizard LIVE (3 steps, real provisioning incl. per-user twin);
project/workspace assignment LIVE in both shells (WorkProjects add-member
requires a raw UUID — functional, unfriendly); AI Teammates create/configure
LIVE (AI-Employee ADR-0046 flavor API-ONLY); twin readiness honest, repair
MISSING (link-out only), skill removal UI MISSING; permission model coherent
(4-op TAR clamp; over-requesting harmless; `admin_niov` never gates product);
Dandelion Welcome flow LIVE but is a text form, not voice. **Blockers:
credential delivery (P0-1) and founder-gated org bootstrap (P0-4).**

### 2. Communication ingestion — 🟡 manual-first
Manual transcript paste/upload LIVE (reference implementation; Comms "Start
capture" button is a scripted demo timer — flag in demos). Zoom LIVE
(OAuth + list + VTT ingest + honest disconnected states; pull, no webhook;
MeetingCaptures page still shows a stale Zoom placeholder). Slack: OAuth
LIVE, ingest API-ONLY (no CT caller), Events webhook MISSING, send
INTEGRATION-ONLY. Otzar-native internal messages LIVE. Clarifications LIVE.
Approvals LIVE. Gmail INTEGRATION-ONLY (no pipeline). MCP local-mock only.
**No inbound event route exists anywhere — nothing arrives ambiently.**

### 3. Work creation and routing — 🟢 strongest area
Single WorkLedger spine (`ingestSourceEvent`), commitments/follow-ups/
decisions, owner confirmation ("needs owner" honest states), external context
(T-1/T-2.5 write-time), approvals with dual control, clarification chain, My
Work/Team Work coherent with server truth (pagination, rollup, waiting-on).
Learn-loop reads prior recipient decisions org-scoped. Known small gaps:
durable server-side recommendation dismiss (ledger D, product decision),
rejection reason absent from the sender's `/actions` list view (shown on
Blocked tab).

### 4. AI Twin usefulness — 🟡 honest but modest
My AI Twin panel LIVE and truthful (self-scoped, evidence-gated "Learned"
row). Chat is real LLM (Anthropic-first, circuit-breaker, 8-layer context)
that answers and proposes but never acts. Execution substrate (ADR-0057) is
production-grade (state machine, SKIP LOCKED worker, attempts, retries), but
**origination is never autonomous** — every Action is human-created via HTTP.
Internal-only sends; no email/calendar action types; Slack/MCP writes gated/
mock. Correction memory is read back into answers (not memory theater).
`content_hash` placeholder is the integrity gap. **What the twin truthfully
does today: understands your work, drafts follow-ups, answers questions with
governed context, remembers corrections, and routes proposals into a real
approval+execution pipeline.**

### 5. External/third-party business use — 🟢 closed run, honest edges
T-1 context, T-2/T-2A promotion, T-3 accounts + identifier evidence, T-3B
dedupe, T-3C chooser, T-4 manager exceptions, T-2.5 named identity states —
all live, all read-honest, no CRM. Remaining: pairwise limited-disclosure
identity (future), Account Pulse deliberately unbuilt, external sends
deliberately absent.

### 6. Data ownership & portability — 🟡 doctrine strong, redesign open
Three-wallet model + write-time routing invariant enforced and count-
invariance tested across every external slice; company data never portable;
boundary labeled in UI. Open: gap K (wallet redesign for legibility),
offboarding flow unproven end-to-end (no rehearsed "employee leaves" story),
gap S doctrine complete but slices open.

### 7. Audit/security/governance — 🟡 good rails, unrehearsed edges
Audit events on all governed actions; source lineage per row; dual control;
sealed OAuth envelopes (AES-256-GCM); render.yaml secrets `sync:false`; no
committed secrets; backend-only provider keys; FND main protected (4 checks,
secret scanning, push protection). Found-and-fixed: `password_hash` leak on
`GET /org/entities` (caught by a live smoke — the process worked). Incident
learnings codified: ADR-0025 (prod db push incident), hardened migration job
rail (T-3), deploy-order lesson (G). Unrehearsed: rollback (runbook §6 empty),
JWT/ENCRYPTION_KEY rotation, RENDER_API_KEY currently stale.

### 8. Ambient experience — 🟡 web-ambient, not device-ambient
Ambient bar LIVE (5.1k lines: voice+text, context chips, clarity routing,
draggable persisted orb, presence states, quiet/focus modes with
never-silenced interrupts). ElevenLabs STT/TTS live key-gated; Web Speech
fallback; honest `text_only` floor. Still web-SaaS: 30s bell polling,
notification clicks navigate to pages, orb hands off to pages, no tray/global
shortcut/OS notifications, desktop INTEGRATION-ONLY.

### 9. Notifications — 🟡 in-app complete, channels missing
Bell + routing (never-null routes, direct-message pointer to `/app/inbox/:id`,
Review Center mapping) + ambient no-noise policy table LIVE. Review/
marketplace classes are inert (no emitter). Email/push/native MISSING (gap M)
— the single biggest "anti-ambient" smell for a pilot.

### 10. Manager/admin views — 🟡 trustworthy core, shallow edges
Trustworthy: Team Work (rollup from real edges, waiting-on, CE-4B clarity +
T-4 external exceptions), Organization Seeding, People & Collaboration
(full queue + real assign rail), Review Center, AI Teammates (honest
readiness/owners), Data & Knowledge ownership statements. Shallow: Work
Health vs Reports depth (gap N), Scenario Studio positioning (gap O),
CT-side manager persona stub (P1-7).

### 11. Deployment/ops readiness — 🔴 the other P0 area
Render both services; practice = manual API deploy with commitId + poll
`live <sha>` + live bundle hash check (proven rail this session);
`autoDeploy: true` in FND yaml contradicts practice — reconcile (P0-3). CI:
FND 5-check gate on protected main; CT verify job exists but does NOT gate
the deploy. No migrations dir; ADR-0025 discipline + hardened one-off job
rail; rollback runbook exists, never executed. Cleanup rails are one-off
founder-authorized scripts; no smoke tenant (P0-2). GitHub Actions deploy
workflows are Azure/AWS echo-stubs — not the rail; don't confuse them.

### 12. Test coverage — 🟢 deep, with honest caveats
CT: 190 unit files (~2160+ tests, hand-recorded counts), 46 live specs with
masked-evidence reporter; FND: 5-tier CI (unit ~2900+, integration 111+ —
CI job labels are stale strings), nightly real-LLM tier. Flaky notes honestly
documented (vacuous-nav bug caught, per-run idempotency keys, one bugb
intermittency under suite pileup, FND admin-routes ~33% flake queued).
Gaps: live smokes are manual and mutate prod (P0-2), no CI e2e, no
machine-readable test-count source of truth, screenshots gitignored by
design.

---

## Standing hard rule for what comes next

The next question is not "what cool feature next?" It is **"what stops a real
organization from trusting Otzar tomorrow?"** — and the evidence-backed answer
is: they can't log in (P0-1), their data shares a tenant with our smoke
residue (P0-2), and a red build can ship (P0-3). Fix those three, rehearse
Phase-0 (P0-4), and a controlled pilot is honest.
