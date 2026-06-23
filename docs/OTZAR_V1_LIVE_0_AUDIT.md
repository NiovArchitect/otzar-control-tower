# OTZAR-V1-LIVE-0 — V1 Readiness Audit & Critical Path

> Status: audit complete. No v1 implementation code written at the time of this
> report. Produced by a read-only audit of `niov-foundation` (backend) and
> `otzar-control-tower` (frontend). `niov-avp` and `niov-federation-cloud` were
> not inspected for changes and must not be touched by v1 work.

## Headline verdict

**NO — Otzar v1 is not ready for real teammate validation today. But it is much
closer than the RETURN chain implied.** The core engine — identity, internal
teammate messaging, governed work ledger, approval flow, memory, audit — is
**real and persisted**, not mocked. What is missing is concentrated in three
places: **(1) it has never been deployed (localhost-only),** **(2) onboarding is
manual-provision-only,** and **(3) a handful of cheap correctness/brand fixes.**
The one genuinely large gap — autonomous AI-Twin↔Twin collaboration — is **not
required** for a credible v1.

## Repo state at audit time

- `niov-foundation` main `741fefe` — `[OTZAR-RETURN-12-FOUNDATION] Add voice note revoke-apply coordinator` (RETURN-12 merged).
- `otzar-control-tower` main `8527a3e` — `[OTZAR-RETURN-12] Add governed voice note undo apply UI`.
- Runtime mismatch from RETURN-12 is resolved (Foundation now serves `/revoke-apply`).

---

## 1. Capability audit (all 26)

Legend: Real ✅ / Partial 🟡 / Mock-stub 🔴. Priority is for a **controlled
two-laptop validation** (not external launch).

| # | Capability | State | Evidence | Missing for v1 | P |
|---|---|---|---|---|---|
| 1 | Multi-user auth / signup | 🟡 | `auth.routes.ts` login/logout/validate real; **no self-register**; token **memory-only (refresh = logout)** | Session persistence; self-signup (later) | **P0** (session) |
| 2 | Org/workspace creation | 🟡 | `platform.routes.ts:105` real but gated `can_admin_niov` + dual-control; **no UI**; `scripts/founder-bootstrap.ts` only | Self-serve UI (later); bootstrap once now | P1* |
| 3 | Invite teammate | 🟡 | `org/members` real DB rows; **`activation_credential` never stored/emailed** | Email/activation link (later); manual handoff now | P1* |
| 4 | Role/authority | 🟡 | binary `is_admin`/TAR real + enforced; no post-invite change UI; archetypes FE-only | Granular RBAC UI | P1 |
| 5 | Teammate identity model | ✅ | Entity PERSON/COMPANY/AI_AGENT fully persisted | — | P2 |
| 6 | AI Twin per teammate | ✅ | `twin.service.ts` creates Entity+Wallet+TAR+TwinConfig; governed wrapper; **no autonomous skills** | Autonomy (later) | P1 |
| 7 | Brand says "Otzar" | 🟡 | Employee shell + Tauri = "Otzar"; **`index.html:7` title + `Login.tsx:104` = "Control Tower"**; admin sidebar "Control Tower" | Title + login + admin brand | **P0** (cheap) |
| 8 | Communication intake | 🟡 | `observation.service` + perception capture real; **LLM-provider dependent** | Live LLM key | **P0** (infra) |
| 9 | Teammate→teammate messaging | ✅ | `internal-message.service` → Notification row → bell; **end-to-end real**, 30s poll | Real-time push (later) | P1 |
| 10 | **Twin→Twin autonomous** | 🟡 | substrate real; **`caller_can_use_target_twin:false` hardcoded** (`authority-context.service.ts:351`); `conductSession` never auto-creates collaboration rows | Autonomy runtime — **defer** | P1† |
| 11 | Human approval flow | ✅ | proposed-action → escalation → approve/reject → audit; 4-stage wired | — | P1 |
| 12 | Work/task/project state | ✅ | `work-os-ledger.routes` full CRUD; MyWork live | — | P1 |
| 13 | Memory/Capsule R/W | ✅ | observe writes multi-wallet capsules + scoped read | — | P1 |
| 14 | Audit visible to user | ✅ | `audit.routes` + `Security.tsx` self-scope live | Org/export UI (later) | P2 |
| 15 | Notifications/action center | ✅ | Notification rows + bell + ActionCenter (poll) | Push (later) | P2 |
| 16 | Provider cards/status | ✅ | env-driven honest status, no fake-green | — | P1 |
| 17 | Slack/Google/MS365/Zoom | 🟡 | **real OAuth + encrypted tokens** (read), fixture-default; **SMTP = stub, Teams = stub, Cal-write blocked** | Set creds (later) | P1/P2 |
| 18 | Voice capture path | 🟡 | **browser Web Speech real** → `/otzar/chat`; **desktop `/voice/transcribe` route missing** | Browser works; desktop later | P1 |
| 19 | ElevenLabs STT/TTS | 🟡 | v1 voice provider: **STT via ElevenLabs Scribe** (LIVE-4A route) + TTS; needs `ELEVENLABS_API_KEY`. Deepgram deferred | `ELEVENLABS_API_KEY` | P1 |
| 20 | Desktop/Tauri tray | 🟡 | shell real (window "Otzar", mic entitlement); **no tray/global-shortcut**; WKWebView no STT | Tray (later) | P1/P2 |
| 21 | Prod/staging deploy | 🟡 | Dockerfiles + CI exist; **never deployed (`CLOUD_TARGET` unset)**; **`VITE_` var name mismatch** | Deploy + fix var | **P0** |
| 22 | Secrets/env | 🟡 | `.env.example` thorough; real `.env` gitignored (cloud-sync risk) | Hosted secret store | P1 |
| 23 | Multi-computer | 🟡 | **API base env-driven (web OK)**; Tauri CSP hardcodes localhost; session not cross-machine | Deploy (web); Tauri later | **P0** (= 21) |
| 24 | Demo vs real data | 🟡 | demo creds DEV-gated ✅; **`DEMO_SCRIPTED`/`DEMO_FIXTURE` accepted by prod routes** (`Comms.tsx`) | Guard/route to real path | **P0** (honesty) |
| 25 | End-to-end test coverage | 🟡 | ~482 unit/integration; **zero browser/cross-HTTP e2e** (Playwright `test.skip`) | Smoke harness (later) | P1 |
| 26 | Broken/dead UI | 🟡 | ~50 real pages; **7 placeholder routes** (analytics, workflows, conversations, intelligence, settings, documentation, playground) + disabled surfaces | Hide during validation | P1/P2 |

`*` ops-workaroundable for a controlled 2-person test · `†` product-thesis gap, not a v1 requirement

---

## 2. True P0 blockers for controlled two-laptop validation

Only these gate a **controlled, browser-based, two-laptop validation**:

1. **Deploy to a reachable host + fix the `VITE_` mismatch** (caps 21/23). The
   otzar `Dockerfile` bakes `VITE_API_BASE_URL` (lines 19–20) but every source
   file reads `VITE_FOUNDATION_API_URL` (`api.ts:2853`, `Login.tsx:150`,
   `vite-env.d.ts:4`, `voice-playback-controller.ts:30`) — so a Docker-built
   frontend **always** falls back to `localhost:3000`. Deploy Foundation + Otzar,
   set `CONTROL_TOWER_URL`/`FOUNDATION_COMMAND_URL` (CORS) + `CLOUD_TARGET`.
   **Without this, "two computers" is impossible.**
2. **Live LLM key** (cap 8) — `ANTHROPIC_API_KEY` on the deployed backend, or
   "the Twin understands" fails (`EXTRACTION_FAILED`).
3. **Session persistence** (cap 1) — persist the bearer token so a refresh does
   not drop the user mid-flow. Small, but materially breaks a live demo.
4. **Brand** (cap 7) — `index.html` `<title>` + `Login.tsx` card → "Otzar".
   Trivial, but every user sees "Control Tower" today.
5. **Honest intake path** (cap 24) — ensure the validation uses the **real LLM**
   route, not the `DEMO_SCRIPTED` path baked into `Comms.tsx`.

**Ops (one-time, not code blockers):** bootstrap Sadeil's org via
`founder-bootstrap.ts`; create the second member; hand the credential out-of-band.

**Explicitly NOT P0:** autonomous Twin↔Twin (10), connectors (16/17), ElevenLabs
(19), desktop/Tauri voice (18/20), browser e2e tests (25), placeholder routes
(26 — just hide them), granular RBAC (4), real-time push (15).

---

## 3. Controlled v1 validation scenario

Two teammates, two laptops, **browser**, one hosted org, using **human-confirmed
routing** (the real substrate), not autonomous Twin↔Twin:

1. Sadeil (admin) logs in at the deployed URL; header reads **Otzar**.
2. Second teammate (member, pre-provisioned) logs in from a second laptop, same org.
3. The product identity says **Otzar**, not Otzar Control Tower.
4. Sadeil speaks/types: *"Ask [teammate] to review this client note and prepare the next action."*
5. Otzar captures (browser Web Speech / text) → **real** observe/chat → Sadeil's
   Twin drafts a governed internal message / proposed action (Sadeil confirms —
   existing 4-stage audit-aware pattern).
6. `internal-message.service` delivers → the teammate's notification bell shows it (≤30s).
7. The teammate (or their Twin as a draft assistant) responds / drafts the next action.
8. If it needs permission → escalation → **Sadeil approves** → audit row emitted.
9. Work ledger + memory + audit update; **both users see the final state** (MyWork, Security/audit).

Every step maps to **already-real code** — the validation is mostly *deploy +
provision + exercise*, not *build*.

---

## 4. ElevenLabs finding (P1, not P0)

> **SUPERSEDED by the LIVE-4 decision (resolved):** **ElevenLabs is the selected v1
> voice provider for STT *and* TTS** — STT via ElevenLabs Scribe, TTS via ElevenLabs
> voice output. **Deepgram is optional/deferred** (not the v1 default). LIVE-4A
> implemented the real `POST /otzar/voice/transcribe` route ElevenLabs-first; see
> `OTZAR_V1_LIVE_4_VOICE_INPUT.md`. The point-in-time findings below (no STT route
> at audit time; ElevenLabs only wired for TTS) were true at the LIVE-0 snapshot and
> are kept for history — the recommendation in them is replaced by this banner.

- **Referenced today: yes** — `ELEVENLABS_TTS` connector + `tts-preview.service.ts`
  (real REST call to ElevenLabs), gated on `ELEVENLABS_API_KEY`, with graceful
  browser-TTS fallback. (At the LIVE-0 snapshot there was no ElevenLabs STT route;
  LIVE-4A added one.)
- **Browser voice covers the browser path.** Browser Web Speech is real and is the
  zero-secret fallback (HTTPS Chrome); the ElevenLabs server STT covers the rest.
- **Deepgram is optional/deferred**, not the primary STT path. v1 STT is ElevenLabs.

---

## 5. Honest gap summary

- **Truly live:** Entity/identity model; AI Twin provisioning; internal teammate
  messaging (poll); approval/escalation; work ledger CRUD; memory capsule R/W;
  self-scope audit; OAuth connector substrate (read); browser voice → chat;
  ElevenLabs TTS (minus key); env-driven API base + CORS; Dockerfiles + CI.
- **Demo/mock only:** SMTP send (catalog stub); Teams channel read (stub);
  `DEMO_SCRIPTED`/`DEMO_FIXTURE` paths reachable in prod; 7 placeholder routes;
  Playwright e2e (`test.skip`); demo seed scripts.
- **Blocked/aspirational:** autonomous Twin↔Twin; self-serve org creation; invite
  activation email; calendar write; desktop STT route; Tauri tray; real-time push.
- **Minimum to validate with real users:** the 5 P0s above + one-time org/user
  provisioning.

---

## 6. Execution plan (LIVE-1 → LIVE-6)

Deployment is folded into LIVE-1 (you cannot validate "two computers" without a
shared host), which shifts the original LIVE-6 deployment idea earlier.

- **LIVE-0** — this audit. ✅
- **LIVE-1 — Reachable, branded, multi-user (THE unlock).** Fix `VITE_` var
  mismatch; deploy Foundation + Otzar to a host; set CORS/`CLOUD_TARGET`/
  `ANTHROPIC_API_KEY`; persist session token; rebrand title + login to "Otzar";
  hide the 7 placeholder routes; bootstrap org + 2nd user. *Goal: two real users
  log in from two computers, same org, see each other, product says Otzar.*
- **LIVE-2 — Validate teammate comms + Twin-assisted routing** (mostly real →
  exercise + close UX seams of speak → route → deliver; ensure real LLM path).
- **LIVE-3 — Validate permissioned action loop** (proposed-action → approve →
  execute → audit; real → fill gaps).
- **LIVE-4 — ElevenLabs voice (STT + TTS)** — Scribe STT + speak-back; Deepgram deferred.
- **LIVE-5 — Two-computer validation harness** (scripted/manual smoke).
- **LIVE-6 — External self-serve onboarding** (signup + invite activation link +
  self-serve org). P0 for outside users; P1 for controlled validation.

**Chunks to a controlled two-laptop validation: ~3 (LIVE-1 → 3).** To external
self-serve launch: ~6.

---

## 7. Standing decisions

- **RETURN-13 and all voice-note undo/provenance polish are PAUSED.** They are P2,
  off the v1 critical path. Do not restart the RETURN chain.
- **Internal Otzar communication comes BEFORE external connectors.** The internal
  comms loop is real and is the v1 path; Slack/Google/Zoom/MS365 connectors are
  P1 enrichment, activated later by setting their env vars.
- **External connector ingestion is NOT required for v1.**

---

## 8. Final answers

1. **Ready now?** No. Engine real; not deployed, not self-serve-onboardable, a few
   correctness/brand fixes outstanding.
2. **Exact P0s:** (a) never deployed + `VITE_` var mismatch → no shared backend;
   (b) `ANTHROPIC_API_KEY` must be live; (c) session lost on refresh; (d) brand
   says "Control Tower" in title/login; (e) `DEMO_SCRIPTED` path can mask real
   intake. Ops: one-time org/user provisioning.
3. **Pause as redundant:** RETURN-13 + all voice-note undo/provenance work;
   connector polish; Twin↔Twin autonomy; desktop/Tauri voice.
4. **Build next:** LIVE-1 (deploy + reachable multi-user + brand + session).
5. **Chunks to v1 validation:** ~3 (controlled) / ~6 (external launch).
6. **ElevenLabs:** the selected v1 voice provider for **STT (Scribe) and TTS**; set `ELEVENLABS_API_KEY`. Deepgram optional/deferred.
7. **Repos:** both. otzar-control-tower (Dockerfile var, session store, brand,
   hide placeholders, deploy config) + niov-foundation (CORS/secrets/LLM key,
   deploy `CLOUD_TARGET`; activation-link table later for LIVE-6). LIVE-1 is
   mostly config/ops, little net-new code.
