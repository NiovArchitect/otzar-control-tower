# OTZAR v1 — Two-Computer Smoke Proof

> The end-to-end validation that the controlled v1 is **truly usable**: two real
> teammates, two computers, one organization, operating with scoped AI Twins under
> governed memory + permissioned work + audit. This is the live proof that ties
> together everything LIVE-1 → LIVE-3 built/verified.
>
> **Honesty contract:** this document distinguishes what is **test-proven** (green
> in CI) from what is **live-validated** (only true once deployed + run). Do NOT
> claim production readiness until the live steps below actually pass on two
> machines. Do NOT claim ambient/hands-free voice works until **user speech input**
> works (see §6 — currently a known gap).

## Preconditions

1. Foundation + Otzar deployed and reachable (see `OTZAR_V1_LIVE_1_RUNBOOK.md`).
2. `VITE_FOUNDATION_API_URL` baked into the Otzar build = the deployed Foundation
   origin. `ANTHROPIC_API_KEY`, `CONTROL_TOWER_URL`, `JWT_SECRET`, DB/Redis set on
   Foundation. `NODE_ENV=production` (so the **demo guard** is active and the
   **action scheduler** runs — it is NO-OP under `NODE_ENV=test`).
3. Org + accounts provisioned via `scripts/provision-demo-team-accounts.ts`
   (founder `sadeil@niovlabs.com` + teammate `david@niovlabs.com`, shared
   `DEMO_SHARED_PASSWORD`).
4. `ALLOW_DEMO_MODE` **unset** (validation must run the real LLM path).

## Accounts

| Role | Email | Computer |
|---|---|---|
| Founder / admin | `sadeil@niovlabs.com` | A |
| Teammate (Tech Lead) | `david@niovlabs.com` | B |

Both sign in with the shared `DEMO_SHARED_PASSWORD`.

---

## The governed loop — step by step (pass/fail)

> Each step lists the surface, the underlying governed mechanism, and the
> evidence to confirm. Tick PASS only when the evidence is actually observed.

### 1. Reachable + branded (LIVE-1B)
- **Do:** open the Otzar URL on both computers; both log in.
- **Evidence:** browser tab + login read **Otzar** (not "Control Tower");
  network calls go to the deployed Foundation origin (not localhost).
- [ ] PASS

### 2. Same org, see each other (LIVE-1)
- **Do:** founder opens **Users**; teammate is listed. Both are in NIOV Labs.
- **Mechanism:** `EntityMembership` (org → person), real DB.
- [ ] PASS

### 3. Scoped Twin is visible (LIVE-2B)
- **Do:** each user opens **My Twin**.
- **Evidence:** the **"What your Twin can — and cannot — do"** panel shows the
  *can-access* capabilities AND the *cannot-do* boundaries ("can only access what
  you can access", external off unless granted, no private-data leak, no raw
  audio), plus memory-items-in-scope count, with a link to Authority & grants.
- **Mechanism:** Foundation `GET /otzar/my-twin/context-health`; the Twin is an
  `AI_AGENT` entity fused to the human via `EntityMembership`, acting on the
  human's session, capped ≤ the human's authority (ADR-0046; see the
  Twin/Authority/Memory Scope Audit).
- [ ] PASS

### 4. Speak/type a request → real intake (LIVE-1A guard)
- **Do:** founder types (or speaks, if §6 works) into the ambient bar / chat:
  *"Ask David to review the Q3 client note and prepare the next action."*
- **Evidence:** the response is **real LLM extraction**, not scripted demo. On a
  prod box an explicit demo request returns 422 `DEMO_MODE_NOT_ALLOWED`; canonical
  fixtures do not silently script. If everything returns `LOCAL_FALLBACK`, the LLM
  key is misconfigured.
- [ ] PASS

### 5. Route governed work to the teammate — audited (LIVE-2A)
- **Do:** founder confirms the drafted internal work request to David.
- **Mechanism:** `POST /work-os/internal-messages` → `deliverHumanInternalMessage`
  → recipient `Notification` + Work-Ledger row **+ an append-only
  `INTERNAL_MESSAGE_DELIVERED` audit event** (actor=founder, target=David); the
  response carries `audit_event_id`.
- **Evidence:** the action succeeds; an audit id is associated; David's bell shows
  it (≤30s poll). AI-agent direct sends are gated to the governed Action path.
- [ ] PASS

### 6. Recipient receives + responds in their own scope
- **Do:** David sees the request in **Inbox/Notifications**, opens the thread,
  replies / drafts the next action.
- **Mechanism:** `replyToNotificationForCaller` submits under **David's** authority
  (not the founder's); the reply is sourced to David's entity.
- [ ] PASS

### 7. Permissioned action requiring approval → escalation (LIVE-3 substrate)
- **Do:** a proposed internal action that exceeds the proposer's authority is
  raised (e.g. a dual-control / higher-risk internal update).
- **Mechanism:** `createActionForCaller` evaluates RBAC/ABAC; `NEEDS_ESCALATION`
  creates an `EscalationRequest` (PENDING) with `ACTION_PROPOSED` audit.
- **Evidence:** it appears in the founder's **Action Center / Approvals**
  (pending), with a **"View why"** affordance showing the authority decision.
- **Test-proven:** approve/reject + **self-approval forbidden** + audit-chained
  (`escalation-routes.test.ts`).
- [ ] PASS

### 8. Higher-authority human approves (LIVE-3)
- **Do:** the founder approves (cannot self-approve their own escalation).
- **Mechanism:** `POST /escalations/:id/approve` → status APPROVED +
  `ESCALATION_APPROVED` audit, emitted atomically in the same transaction.
- [ ] PASS

### 9. Approved action executes one safe internal update (LIVE-3, live-only)
- **Do:** wait for the action runtime to admit + execute the approved action.
- **Mechanism:** `action/scheduler.ts` admits → `action/executor.ts` runs the
  handler (e.g. `SEND_INTERNAL_NOTIFICATION` / work-ledger update). **This runs
  only when `NODE_ENV=production` (scheduler is NO-OP in test)** — hence it is
  validated **here, live**, not in the test tier.
- **Evidence:** the work-ledger item / internal update is created/updated;
  `ACTION_APPROVED` (and execution) audit exists. **No external send.**
- [ ] PASS

### 10. Both humans see the result + Foundation proves why
- **Do:** both open **My Work** (the item/state) and **Security & Audit**
  (their self-scoped events).
- **Evidence:** the audit chain shows who proposed, who approved, the authority
  decision, and what executed — visible to both parties.
- [ ] PASS

---

## §6 — Voice input status (LIVE-4 wired; live-verify before claiming hands-free)

Otzar is pronounced **"OatZar."** Text input works; Otzar speaks back (TTS) works.
The user-speech-input gap is **addressed in LIVE-4** — see
`OTZAR_V1_LIVE_4_VOICE_INPUT.md`:
- **Root cause fixed:** `POST /otzar/voice/transcribe` previously had **no
  Foundation handler** (a dead call); it is now real (LIVE-4A).
- **v1 provider:** **ElevenLabs (Scribe)** for server STT (and TTS for speak-back).
  Browser Web Speech remains the zero-secret fallback **but requires an HTTPS
  secure context** (plain HTTP breaks it — a common "voice doesn't work" cause).
- **No raw audio stored** (transcript text only); provider keys are backend-only.
- **Still pending:** a **live** check on an HTTPS deployment with
  `ELEVENLABS_API_KEY` set. **Do not claim ambient/hands-free until that live check
  passes** (a user actually speaks → transcript → governed loop).

For this smoke, browser voice works in **HTTPS Chrome**; otherwise set the
ElevenLabs key for the server path, or drive intake by **typing**.

---

## What is test-proven vs live-validated

- **Test-proven (CI green):** identity/org model; Twin scope source
  (context-health) + the scope panel; demo-mode guard; human-routing audit
  (`INTERNAL_MESSAGE_DELIVERED`); the escalation approval gate (approve/reject,
  self-approval forbidden, audit-chained); work-ledger + notification + reply.
- **Live-validated (this checklist):** the cross-machine login; the real LLM
  intake path; the post-approval **action execution** (scheduler runs only in a
  deployed/non-test env); the full A→B→approve→execute→audit narrative end to end.

## Known limitations (be honest with first users)
- Refresh = re-login (deliberate no-web-storage security posture; httpOnly refresh
  cookie is later work). Avoid hard refreshes mid-session.
- No self-serve signup / invite-email (admin provisions; credential handed over).
- Use the **browser** (Chrome); the Tauri desktop CSP still hardcodes localhost.
- **User speech input not working** (see §6) — type for now.
- Real-time delivery is ~30s polling, not push.
- Autonomous Twin-to-Twin is **not** v1 (`RUNTIME_MISSING`) — routing is human-
  driven/human-confirmed.

## What NOT to claim
- Do not claim production until §1–§10 pass live on two machines.
- Do not claim ambient/hands-free voice until §6 is resolved.
- Do not claim autonomous AI execution — every step is human-driven or
  human-approved, and Foundation proves it.

---

## Live Validation Result (LIVE-5)

| Field | Value |
|---|---|
| Date/time | Not executed (see status below) |
| Foundation commit | `f301762` (main) — includes LIVE-1A, LIVE-2A, LIVE-4A |
| Otzar commit | `ff56596` (main) — includes LIVE-0…LIVE-4 |
| Foundation URL | — (not deployed) |
| Otzar URL | — (not deployed) |
| Users | — |
| **Status** | ⛔ **MANUAL CREDENTIALS REQUIRED — live run NOT executed by the autonomous agent** |

**Why not executed (honest):** the autonomous agent has **no deployment target and
no live secrets** — `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, a hosted
Foundation/Otzar origin, a database, and cloud credentials are all absent in this
environment. Per the v1 directive, live validation is **not faked**. Everything
that can be proven locally is green (see "test-proven" above and the per-phase CI);
the live two-computer run is the one remaining step and it requires a human with
deploy access.

### Exact checklist to run the live validation (hand to whoever has credentials)

1. **Provision** Postgres + Redis.
2. **Deploy Foundation** (`niov-foundation/Dockerfile`) with env:
   `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `REDIS_URL`,
   `ANTHROPIC_API_KEY` (real LLM), `CONTROL_TOWER_URL` (the Otzar origin, for CORS),
   `NODE_ENV=production` (activates the demo guard + the action scheduler),
   and for voice: `VOICE_STT_PROVIDER=elevenlabs` + `ELEVENLABS_API_KEY`
   (+ `ELEVENLABS_STT_MODEL=scribe_v1`). Run `prisma db push`. Leave
   `ALLOW_DEMO_MODE` unset.
3. **Build + deploy Otzar** over **HTTPS** (required for browser Web Speech) with
   build arg `VITE_FOUNDATION_API_URL=https://<foundation-origin>/api/v1`.
4. **Provision users**: `ALLOW_FOUNDER_BOOTSTRAP=true DEMO_SHARED_PASSWORD=… NIOV_APPROVE_DEMO_TEAM_ACCOUNTS="APPROVE FULL DEMO TEAM ACCOUNTS — exact allowlist only" npx tsx scripts/provision-demo-team-accounts.ts` → founder `sadeil@niovlabs.com` + teammate `david@niovlabs.com`.
5. **Run steps §1–§10 above** on two computers and tick each box. Record blockers
   here; any true validation blocker becomes a focused LIVE-6 fix (no new features).

### LIVE-4 voice result (what is known without a live run)

- **Browser Web Speech (Chrome, HTTPS):** real — the hook is correct and produces
  a transcript into the governed loop. **Requires a secure (HTTPS) context**; plain
  HTTP breaks it (a common cause of "voice doesn't work" in the browser).
- **Server STT (`POST /otzar/voice/transcribe`, ElevenLabs Scribe):** now real and
  wired (was a dead route). Returns transcript text; needs `ELEVENLABS_API_KEY` on
  the backend, else an honest 503 `VOICE_STT_PROVIDER_NOT_CONFIGURED` (typing still
  works). No raw audio stored.
- **TTS (speak-back):** works (browser/device; ElevenLabs TTS when keyed).
- **Can the user speak to Otzar?** **Code path is real both ways; not yet verified
  on a live HTTPS deployment with the ElevenLabs key set.** Do not claim hands-free
  until that live check passes.
