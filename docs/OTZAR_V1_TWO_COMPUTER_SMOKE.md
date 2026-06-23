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

## §6 — Voice input status (KNOWN GAP — do not claim hands-free yet)

Otzar is pronounced **"OatZar."** Current reported state: **text input works**,
**Otzar speaks back (TTS) works**, but **user speech INPUT does not work
reliably.** Until a user can speak and have the spoken intent route into the
governed loop above, **do not claim ambient/hands-free voice is complete.**

To diagnose when the voice phase (LIVE-4) begins — inspect, do not fake with copy:
- `src/hooks/useSpeechRecognition.ts`, `useSpeechSynthesis.ts`,
  `src/pages/app/Voice.tsx`, `src/components/otzar/AmbientOtzarBar.tsx`.
- `POST /otzar/voice/transcribe` — **the LIVE-0 audit found no Foundation handler**
  (the desktop-STT path is a likely dead call). Fix the route when voice begins.
- Browser Web Speech (works in Chrome; **not** in Tauri WKWebView), mic permission.
- STT providers already in the repo: **Deepgram / AssemblyAI / OpenAI realtime**
  (prefer the repo-native path — likely Deepgram — for production STT).
- **ElevenLabs** is wired for **TTS** (set `ELEVENLABS_API_KEY`); it is **not** the
  STT choice. Never expose provider keys in the frontend (server-side proxy);
  store transcript text, not raw audio.

For this smoke, drive intake by **typing** until user speech input is fixed.

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
